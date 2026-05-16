package config

import (
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port               string
	Env                string
	CORSOrigin         string
	DataFile           string
	LogLevel           slog.Level
	CalcTimeout        time.Duration
	MaxConcurrency     int
	CacheTTL           time.Duration
	CacheMaxEntries    int
	RateLimitPerMinute int
}

func Load() Config {
	env := firstNonEmpty(os.Getenv("NODE_ENV"), os.Getenv("APP_ENV"), "development")
	maxConcurrency := envInt("MAX_CONCURRENCY", runtime.GOMAXPROCS(0))
	if maxConcurrency < 1 {
		maxConcurrency = 1
	}

	return Config{
		Port:               firstNonEmpty(os.Getenv("PORT"), "3003"),
		Env:                env,
		CORSOrigin:         firstNonEmpty(os.Getenv("CORS_ORIGIN"), "https://ark-lmd.top"),
		DataFile:           firstNonEmpty(os.Getenv("DATA_FILE"), filepath.Join("..", "data", "gameItems.json")),
		LogLevel:           parseLevel(firstNonEmpty(os.Getenv("LOG_LEVEL"), "info")),
		CalcTimeout:        time.Duration(envInt("CALC_TIMEOUT_MS", 15000)) * time.Millisecond,
		MaxConcurrency:     maxConcurrency,
		CacheTTL:           time.Duration(envInt("CACHE_TTL_SECONDS", 3600)) * time.Second,
		CacheMaxEntries:    envInt("CACHE_MAX_ENTRIES", 1024),
		RateLimitPerMinute: envInt("RATE_LIMIT_PER_MINUTE", 15),
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func envInt(key string, fallback int) int {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}

func parseLevel(raw string) slog.Level {
	switch strings.ToLower(raw) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
