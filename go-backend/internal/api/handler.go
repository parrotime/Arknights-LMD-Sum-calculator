package api

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"ark-lmd-go-backend/internal/cache"
	"ark-lmd-go-backend/internal/calc"
	"ark-lmd-go-backend/internal/data"
)

type HandlerOptions struct {
	Items          []data.Item
	DataVersion    string
	Cache          *cache.TTLCache
	Logger         *slog.Logger
	CalcTimeout    time.Duration
	MaxConcurrency int
}

type Handler struct {
	items       []data.Item
	dataVersion string
	cache       *cache.TTLCache
	logger      *slog.Logger
	calcTimeout time.Duration
	sem         chan struct{}
}

func NewHandler(options HandlerOptions) *Handler {
	maxConcurrency := options.MaxConcurrency
	if maxConcurrency < 1 {
		maxConcurrency = 1
	}
	return &Handler{
		items:       options.Items,
		dataVersion: options.DataVersion,
		cache:       options.Cache,
		logger:      options.Logger,
		calcTimeout: options.CalcTimeout,
		sem:         make(chan struct{}, maxConcurrency),
	}
}

func (h *Handler) Health(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write([]byte("Hello from the Go backend!"))
}

func (h *Handler) FindPaths(w http.ResponseWriter, r *http.Request) {
	started := time.Now()
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var req findPathsRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 100*1024))
	decoder.UseNumber()
	if err := decoder.Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON body"})
		return
	}

	target, err := req.parseTarget()
	if err != nil || target < -5000 || target > 5000 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid input: target must be a number between -5000 and 5000"})
		return
	}
	if req.Settings == nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid input: settings must be an object"})
		return
	}

	limits, err := parseLimits(req.UserLimits)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid input: userLimits error"})
		return
	}

	items := filterItems(h.items, *req.Settings)
	cacheKey := buildCacheKey(target, *req.Settings, limits, req.CalcMode, h.dataVersion)
	if cached, ok := h.cache.Get(cacheKey); ok {
		writeJSON(w, http.StatusOK, findPathsResponse{
			Success:  true,
			Paths:    cached,
			Duration: 0,
			Cache:    "hit",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), h.calcTimeout)
	defer cancel()

	select {
	case h.sem <- struct{}{}:
	case <-ctx.Done():
		h.handleCalcError(w, ctx.Err())
		return
	}

	resultCh := make(chan []calc.Path, 1)
	errCh := make(chan error, 1)
	go func() {
		defer func() { <-h.sem }()

		paths, err := calc.FindPathsWithContext(ctx, target, items, limits)
		if err != nil {
			errCh <- err
			return
		}
		select {
		case resultCh <- paths:
		case <-ctx.Done():
			errCh <- ctx.Err()
		}
	}()

	var paths []calc.Path
	select {
	case paths = <-resultCh:
	case err := <-errCh:
		h.handleCalcError(w, err)
		return
	case <-ctx.Done():
		h.handleCalcError(w, ctx.Err())
		return
	}

	duration := time.Since(started).Milliseconds()
	if len(paths) > 0 {
		h.cache.Set(cacheKey, paths)
	}
	h.logger.Info("calculation finished", "target", target, "paths", len(paths), "duration_ms", duration)

	writeJSON(w, http.StatusOK, findPathsResponse{
		Success:  true,
		Paths:    paths,
		Duration: duration,
		Cache:    "miss",
	})
}

func (h *Handler) handleCalcError(w http.ResponseWriter, err error) {
	if errors.Is(err, context.DeadlineExceeded) {
		writeJSON(w, http.StatusGatewayTimeout, map[string]string{"error": "计算超时，请尝试简化设置后重试。"})
		return
	}
	writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "服务器繁忙，当前排队请求过多，请稍后再试。"})
}

func buildCacheKey(target int, reqSettings settings, limits calc.Limits, calcMode string, dataVersion string) string {
	if calcMode == "" {
		calcMode = "fast"
	}
	payload := struct {
		Target      int         `json:"target"`
		Settings    settings    `json:"settings"`
		Limits      calc.Limits `json:"limits"`
		Mode        string      `json:"calcMode"`
		DataVersion string      `json:"dataVersion"`
	}{target, reqSettings, limits, calcMode, dataVersion}
	bytes, _ := json.Marshal(payload)
	return "paths:" + string(bytes)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func parseJSONNumberInt(value json.Number) (int, error) {
	if value == "" {
		return 0, errors.New("missing number")
	}
	raw := value.String()
	parsed, err := strconv.Atoi(raw)
	if err != nil {
		return 0, err
	}
	return parsed, nil
}
