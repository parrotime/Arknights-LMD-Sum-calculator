package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ark-lmd-go-backend/internal/api"
	"ark-lmd-go-backend/internal/cache"
	"ark-lmd-go-backend/internal/config"
	"ark-lmd-go-backend/internal/data"
	"ark-lmd-go-backend/internal/middleware"
)

func main() {
	cfg := config.Load()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	}))

	store, err := data.LoadItems(cfg.DataFile)
	if err != nil {
		logger.Error("load game items failed", "error", err)
		os.Exit(1)
	}

	resultCache := cache.NewTTLCache(cfg.CacheTTL, cfg.CacheMaxEntries)
	handler := api.NewHandler(api.HandlerOptions{
		Items:          store.Items,
		DataVersion:    store.Version,
		Cache:          resultCache,
		Logger:         logger,
		CalcTimeout:    cfg.CalcTimeout,
		MaxConcurrency: cfg.MaxConcurrency,
		MaxQueueSize:   cfg.MaxQueueSize,
		AdminToken:     cfg.AdminToken,
	})

	mux := http.NewServeMux()
	mux.HandleFunc("/", handler.Health)
	mux.HandleFunc("/cache-stats", handler.CacheStats)
	mux.HandleFunc("/server-stats", handler.ServerStats)
	mux.HandleFunc("/find-paths", handler.FindPaths)

	var wrapped http.Handler = mux
	wrapped = middleware.Recovery(wrapped, logger)
	wrapped = middleware.SecurityHeaders(wrapped)
	wrapped = middleware.CORS(wrapped, cfg.CORSOrigin)
	if cfg.Env != "test" {
		wrapped = middleware.RateLimit(wrapped, middleware.RateLimitConfig{
			Window:     time.Minute,
			Max:        cfg.RateLimitPerMinute,
			Enabled:    true,
			TrustProxy: cfg.TrustProxy,
			Logger:     logger,
		})
	}

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           wrapped,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		logger.Info("Go backend started", "port", cfg.Port, "items", len(store.Items), "data_version", store.Version)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	logger.Info("shutting down")
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("shutdown failed", "error", err)
	}
}
