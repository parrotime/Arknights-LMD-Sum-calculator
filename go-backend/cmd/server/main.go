package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ark-lmd-go-backend/internal/adminstats"
	"ark-lmd-go-backend/internal/api"
	"ark-lmd-go-backend/internal/cache"
	"ark-lmd-go-backend/internal/config"
	"ark-lmd-go-backend/internal/data"
	"ark-lmd-go-backend/internal/logging"
	"ark-lmd-go-backend/internal/middleware"
)

func main() {
	cfg := config.Load()

	fallbackLogger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	}))
	loggers, err := logging.New(logging.Options{
		Dir:      cfg.LogDir,
		Level:    cfg.LogLevel,
		JSON:     cfg.LogJSON,
		ToStdout: cfg.LogToStdout,
	})
	if err != nil {
		fallbackLogger.Error("initialize loggers failed", "error", err, "log_dir", cfg.LogDir)
		os.Exit(1)
	}
	defer func() {
		if err := loggers.Close(); err != nil {
			fallbackLogger.Error("close log files failed", "error", err)
		}
	}()
	logger := loggers.App

	store, err := data.LoadItems(cfg.DataFile)
	if err != nil {
		loggers.Error.Error("load game items failed", "error", err, "data_file", cfg.DataFile)
		os.Exit(1)
	}

	resultCache := cache.NewTTLCache(cfg.CacheTTL, cfg.CacheMaxEntries)
	adminStats, err := adminstats.New(adminstats.Options{
		LogDir: cfg.LogDir,
		Logger: logger,
	})
	if err != nil {
		loggers.Error.Error("initialize admin stats failed", "error", err, "log_dir", cfg.LogDir)
		os.Exit(1)
	}
	adminStatsStop := make(chan struct{})
	adminStats.Start(adminStatsStop)

	handler := api.NewHandler(api.HandlerOptions{
		Items:          store.Items,
		DataVersion:    store.Version,
		Cache:          resultCache,
		Logger:         logger,
		ErrorLogger:    loggers.Error,
		CalcLogger:     loggers.Calc,
		CalcTimeout:    cfg.CalcTimeout,
		MaxConcurrency: cfg.MaxConcurrency,
		MaxQueueSize:   cfg.MaxQueueSize,
		AdminToken:     cfg.AdminToken,
		AdminStats:     adminStats,
		Maintenance: api.MaintenanceConfig{
			Enabled:  cfg.MaintenanceEnabled,
			EndAt:    cfg.MaintenanceEndAt,
			Title:    cfg.MaintenanceMessage,
			Subtitle: cfg.MaintenanceSubtitle,
		},
		TrustProxy: cfg.TrustProxy,
		LogIPHash:  cfg.LogIPHash,
		IPHashSalt: cfg.LogIPHashSalt,
	})

	mux := http.NewServeMux()
	mux.HandleFunc("/", handler.Health)
	mux.HandleFunc("/cache-stats", handler.CacheStats)
	mux.HandleFunc("/server-stats", handler.ServerStats)
	mux.HandleFunc("/admin/overview", handler.AdminOverview)
	mux.HandleFunc("/maintenance-status", handler.MaintenanceStatus)
	mux.HandleFunc("/find-paths", handler.FindPaths)

	var wrapped http.Handler = mux
	wrapped = middleware.Recovery(wrapped, loggers.Error)
	wrapped = middleware.SecurityHeaders(wrapped)
	wrapped = middleware.CORS(wrapped, cfg.CORSOrigin)
	if cfg.Env != "test" {
		wrapped = middleware.RateLimit(wrapped, middleware.RateLimitConfig{
			Window:     time.Minute,
			Max:        cfg.RateLimitPerMinute,
			Enabled:    true,
			TrustProxy: cfg.TrustProxy,
			Logger:     loggers.Error,
		})
	}
	wrapped = middleware.AccessLog(wrapped, logger, cfg.TrustProxy)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           wrapped,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		logger.Info("Go backend started", "port", cfg.Port, "env", cfg.Env, "items", len(store.Items), "data_version", store.Version, "log_dir", cfg.LogDir, "log_json", cfg.LogJSON)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			loggers.Error.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	adminStats.Stop(adminStatsStop)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	logger.Info("shutting down")
	if err := server.Shutdown(ctx); err != nil {
		loggers.Error.Error("shutdown failed", "error", err)
	}
}
