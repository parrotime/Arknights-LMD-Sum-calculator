package api

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"ark-lmd-go-backend/internal/adminstats"
	"ark-lmd-go-backend/internal/cache"
	"ark-lmd-go-backend/internal/calc"
	"ark-lmd-go-backend/internal/data"
	"ark-lmd-go-backend/internal/logging"
)

type HandlerOptions struct {
	Items          []data.Item
	DataVersion    string
	Cache          *cache.TTLCache
	Logger         *slog.Logger
	ErrorLogger    *slog.Logger
	CalcLogger     *slog.Logger
	CalcTimeout    time.Duration
	MaxConcurrency int
	MaxQueueSize   int
	AdminToken     string
	AdminStats     *adminstats.Service
	Maintenance    MaintenanceConfig
	TrustProxy     bool
	LogIPHash      bool
	IPHashSalt     string
}

type MaintenanceConfig struct {
	Enabled  bool
	EndAt    string
	Title    string
	Subtitle string
}

type Handler struct {
	items       []data.Item
	dataVersion string
	cache       *cache.TTLCache
	logger      *slog.Logger
	errorLogger *slog.Logger
	calcLogger  *slog.Logger
	calcTimeout time.Duration
	sem         chan struct{}
	queue       chan struct{}
	running     atomic.Int64
	queued      atomic.Int64
	rejected    atomic.Uint64
	maxConc     int
	maxQueue    int
	adminToken  string
	adminStats  *adminstats.Service
	maintenance MaintenanceConfig
	trustProxy  bool
	logIPHash   bool
	ipHashSalt  string
}

func NewHandler(options HandlerOptions) *Handler {
	maxConcurrency := options.MaxConcurrency
	if maxConcurrency < 1 {
		maxConcurrency = 1
	}
	maxQueueSize := options.MaxQueueSize
	if maxQueueSize < 1 {
		maxQueueSize = maxConcurrency * 2
	}
	return &Handler{
		items:       options.Items,
		dataVersion: options.DataVersion,
		cache:       options.Cache,
		logger:      options.Logger,
		errorLogger: firstLogger(options.ErrorLogger, options.Logger),
		calcLogger:  firstLogger(options.CalcLogger, options.Logger),
		calcTimeout: options.CalcTimeout,
		sem:         make(chan struct{}, maxConcurrency),
		queue:       make(chan struct{}, maxQueueSize),
		maxConc:     maxConcurrency,
		maxQueue:    maxQueueSize,
		adminToken:  options.AdminToken,
		adminStats:  options.AdminStats,
		maintenance: options.Maintenance,
		trustProxy:  options.TrustProxy,
		logIPHash:   options.LogIPHash,
		ipHashSalt:  options.IPHashSalt,
	}
}

func (h *Handler) Health(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write([]byte("Hello from the Go backend!"))
}

func (h *Handler) MaintenanceStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"enabled":    h.maintenance.Enabled,
		"endAt":      h.maintenance.EndAt,
		"title":      h.maintenance.Title,
		"subtitle":   h.maintenance.Subtitle,
		"serverTime": time.Now().Format(time.RFC3339),
	})
}

func (h *Handler) CacheStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if !h.authorizeAdmin(w, r) {
		return
	}
	writeJSON(w, http.StatusOK, h.cache.Stats())
}

func (h *Handler) ServerStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if !h.authorizeAdmin(w, r) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"maxConcurrency": h.maxConc,
		"maxQueueSize":   h.maxQueue,
		"running":        h.running.Load(),
		"queued":         h.queued.Load(),
		"queueRejected":  h.rejected.Load(),
	})
}

func (h *Handler) AdminOverview(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if !h.authorizeAdmin(w, r) {
		return
	}
	if h.adminStats == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "admin stats unavailable"})
		return
	}
	cacheStats := h.cache.Stats()
	stats := map[string]any{
		"admin": h.adminStats.Snapshot(),
		"cache": cacheStats,
		"server": map[string]any{
			"maxConcurrency": h.maxConc,
			"maxQueueSize":   h.maxQueue,
			"running":        h.running.Load(),
			"queued":         h.queued.Load(),
			"queueRejected":  h.rejected.Load(),
		},
		"maintenance": h.maintenance,
		"serverTime":  time.Now().Format(time.RFC3339),
	}
	writeJSON(w, http.StatusOK, stats)
}

func (h *Handler) PublicStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if h.adminStats == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"admin": map[string]any{
				"totals": map[string]int{
					"calculations": 0,
				},
				"series": map[string]any{},
			},
			"serverTime": time.Now().Format(time.RFC3339),
		})
		return
	}

	snapshot := h.adminStats.Snapshot()
	writeJSON(w, http.StatusOK, map[string]any{
		"admin": map[string]any{
			"updatedAt": snapshot.UpdatedAt,
			"totals": map[string]any{
				"calculations": snapshot.Totals.Calculations,
			},
			"series": snapshot.Series,
		},
		"serverTime": time.Now().Format(time.RFC3339),
	})
}

func (h *Handler) authorizeAdmin(w http.ResponseWriter, r *http.Request) bool {
	if h.adminToken == "" {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return false
	}
	token := r.Header.Get("X-Admin-Token")
	if token == "" {
		token = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	}
	if token != h.adminToken {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return false
	}
	return true
}

func (h *Handler) FindPaths(w http.ResponseWriter, r *http.Request) {
	started := time.Now()
	requestID := logging.RequestID(r.Context())
	ip := logging.ClientIP(r, h.trustProxy)
	ipHash := h.hashIP(ip)
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var req findPathsRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 100*1024))
	decoder.UseNumber()
	if err := decoder.Decode(&req); err != nil {
		h.logCalcEvent("calc_rejected", requestID, ip, ipHash, 0, false, 0, "", "", time.Since(started).Milliseconds(), 0, "bad_request", "invalid_json")
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON body"})
		return
	}

	target, err := req.parseTarget()
	if err != nil || target < -5000 || target > 5000 {
		h.logCalcEvent("calc_rejected", requestID, ip, ipHash, 0, false, target, req.CalcMode, "", time.Since(started).Milliseconds(), 0, "bad_request", "invalid_target")
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid input: target must be a number between -5000 and 5000"})
		return
	}
	targetLMD, hasTargetLMD := req.parseRawGoal()
	if req.Settings == nil {
		h.logCalcEvent("calc_rejected", requestID, ip, ipHash, targetLMD, hasTargetLMD, target, req.CalcMode, "", time.Since(started).Milliseconds(), 0, "bad_request", "missing_settings")
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid input: settings must be an object"})
		return
	}

	limits, err := parseLimits(req.UserLimits)
	if err != nil {
		h.logCalcEvent("calc_rejected", requestID, ip, ipHash, targetLMD, hasTargetLMD, target, req.CalcMode, "", time.Since(started).Milliseconds(), 0, "bad_request", "invalid_limits")
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid input: userLimits error"})
		return
	}

	items := filterItems(h.items, *req.Settings)
	mode := normalizeCalcMode(req.CalcMode)
	currentLMD, hasCurrentLMD := calcCurrentLMD(targetLMD, hasTargetLMD, target)
	h.logger.Info("calculation request", "event", "calculation_request", "request_id", requestID, "ip", ip, "ip_hash", ipHash, "target_lmd", targetLMD, "has_target_lmd", hasTargetLMD, "current_lmd", currentLMD, "has_current_lmd", hasCurrentLMD, "lmd_diff", target, "target", target, "calc_mode", mode, "item_count", len(items), "limits", limits)
	cacheKey := buildCacheKey(target, *req.Settings, limits, req.CalcMode, h.dataVersion)
	if cached, ok := h.cache.Get(cacheKey); ok {
		duration := time.Since(started).Milliseconds()
		h.logCalcEvent("calc_finished", requestID, ip, ipHash, targetLMD, hasTargetLMD, target, mode, "hit", duration, len(cached), "success", "")
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
	case h.queue <- struct{}{}:
		h.queued.Add(1)
	default:
		h.rejected.Add(1)
		h.errorLogger.Warn("queue full", "event", "queue_full", "request_id", requestID, "ip", ip, "ip_hash", ipHash, "target_lmd", targetLMD, "has_target_lmd", hasTargetLMD, "current_lmd", currentLMD, "has_current_lmd", hasCurrentLMD, "lmd_diff", target, "target", target, "running", h.running.Load(), "queued", h.queued.Load(), "max_queue_size", h.maxQueue)
		h.logCalcEvent("calc_rejected", requestID, ip, ipHash, targetLMD, hasTargetLMD, target, mode, "miss", time.Since(started).Milliseconds(), 0, "queue_full", "queue_full")
		h.handleQueueFull(w)
		return
	}
	releaseQueue := func() {
		<-h.queue
		h.queued.Add(-1)
	}

	select {
	case h.sem <- struct{}{}:
		releaseQueue()
		h.running.Add(1)
	case <-ctx.Done():
		releaseQueue()
		h.logCalcFailure(requestID, ip, ipHash, targetLMD, hasTargetLMD, target, mode, "miss", started, ctx.Err())
		h.handleCalcError(w, ctx.Err())
		return
	}

	resultCh := make(chan []calc.Path, 1)
	errCh := make(chan error, 1)
	go func() {
		defer func() {
			<-h.sem
			h.running.Add(-1)
		}()

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
		h.logCalcFailure(requestID, ip, ipHash, targetLMD, hasTargetLMD, target, mode, "miss", started, err)
		h.handleCalcError(w, err)
		return
	case <-ctx.Done():
		h.logCalcFailure(requestID, ip, ipHash, targetLMD, hasTargetLMD, target, mode, "miss", started, ctx.Err())
		h.handleCalcError(w, ctx.Err())
		return
	}

	duration := time.Since(started).Milliseconds()
	if len(paths) > 0 {
		h.cache.Set(cacheKey, paths)
	}
	h.logger.Info("calculation finished", "event", "calculation_finished", "request_id", requestID, "ip", ip, "ip_hash", ipHash, "target_lmd", targetLMD, "has_target_lmd", hasTargetLMD, "current_lmd", currentLMD, "has_current_lmd", hasCurrentLMD, "lmd_diff", target, "target", target, "calc_mode", mode, "paths", len(paths), "duration_ms", duration, "cache", "miss")
	h.logCalcEvent("calc_finished", requestID, ip, ipHash, targetLMD, hasTargetLMD, target, mode, "miss", duration, len(paths), "success", "")

	writeJSON(w, http.StatusOK, findPathsResponse{
		Success:  true,
		Paths:    paths,
		Duration: duration,
		Cache:    "miss",
	})
}

func (h *Handler) handleQueueFull(w http.ResponseWriter) {
	writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "服务器当前计算队列已满，请稍后再试。"})
}

func (h *Handler) handleCalcError(w http.ResponseWriter, err error) {
	if errors.Is(err, context.DeadlineExceeded) {
		writeJSON(w, http.StatusGatewayTimeout, map[string]string{"error": "计算超时，请尝试简化设置后重试。"})
		return
	}
	writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "服务器繁忙，当前排队请求过多，请稍后再试。"})
}

func (h *Handler) logCalcFailure(requestID, ip string, ipHash string, targetLMD int, hasTargetLMD bool, lmdDiff int, mode string, cacheStatus string, started time.Time, err error) {
	duration := time.Since(started).Milliseconds()
	status := "error"
	errorType := "calculation_error"
	currentLMD, hasCurrentLMD := calcCurrentLMD(targetLMD, hasTargetLMD, lmdDiff)
	if errors.Is(err, context.DeadlineExceeded) {
		status = "timeout"
		errorType = "timeout"
		h.errorLogger.Warn("calculation timeout", "event", "calculation_timeout", "request_id", requestID, "ip", ip, "ip_hash", ipHash, "target_lmd", targetLMD, "has_target_lmd", hasTargetLMD, "current_lmd", currentLMD, "has_current_lmd", hasCurrentLMD, "lmd_diff", lmdDiff, "target", lmdDiff, "calc_mode", mode, "duration_ms", duration, "timeout_ms", h.calcTimeout.Milliseconds())
	} else {
		h.errorLogger.Error("calculation failed", "event", "calculation_failed", "request_id", requestID, "ip", ip, "ip_hash", ipHash, "target_lmd", targetLMD, "has_target_lmd", hasTargetLMD, "current_lmd", currentLMD, "has_current_lmd", hasCurrentLMD, "lmd_diff", lmdDiff, "target", lmdDiff, "calc_mode", mode, "duration_ms", duration, "error", err)
	}
	h.logCalcEvent("calc_failed", requestID, ip, ipHash, targetLMD, hasTargetLMD, lmdDiff, mode, cacheStatus, duration, 0, status, errorType)
}

func (h *Handler) logCalcEvent(event, requestID, ip string, ipHash string, targetLMD int, hasTargetLMD bool, lmdDiff int, mode string, cacheStatus string, duration int64, pathsCount int, status string, errorType string) {
	if h.calcLogger == nil {
		return
	}
	currentLMD, hasCurrentLMD := calcCurrentLMD(targetLMD, hasTargetLMD, lmdDiff)
	h.calcLogger.Info(event,
		"event", event,
		"request_id", requestID,
		"ip", ip,
		"ip_hash", ipHash,
		"target_lmd", targetLMD,
		"has_target_lmd", hasTargetLMD,
		"current_lmd", currentLMD,
		"has_current_lmd", hasCurrentLMD,
		"lmd_diff", lmdDiff,
		"target", lmdDiff,
		"calc_mode", normalizeCalcMode(mode),
		"cache", cacheStatus,
		"duration_ms", duration,
		"paths_count", pathsCount,
		"status", status,
		"error_type", errorType,
	)
}

func (h *Handler) hashIP(ip string) string {
	if !h.logIPHash {
		return ""
	}
	return logging.HashIP(ip, h.ipHashSalt)
}

func calcCurrentLMD(targetLMD int, hasTargetLMD bool, lmdDiff int) (int, bool) {
	if !hasTargetLMD {
		return 0, false
	}
	return targetLMD - lmdDiff, true
}

func normalizeCalcMode(mode string) string {
	if mode == "" {
		return "fast"
	}
	return mode
}

func firstLogger(primary, fallback *slog.Logger) *slog.Logger {
	if primary != nil {
		return primary
	}
	return fallback
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
