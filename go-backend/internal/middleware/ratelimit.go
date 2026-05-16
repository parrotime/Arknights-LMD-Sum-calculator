package middleware

import (
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type RateLimitConfig struct {
	Window  time.Duration
	Max     int
	Enabled bool
	Logger  *slog.Logger
}

type clientWindow struct {
	count   int
	resetAt time.Time
}

func RateLimit(next http.Handler, cfg RateLimitConfig) http.Handler {
	if !cfg.Enabled || cfg.Max <= 0 {
		return next
	}
	if cfg.Window <= 0 {
		cfg.Window = time.Minute
	}

	var mu sync.Mutex
	clients := make(map[string]clientWindow)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/find-paths" {
			next.ServeHTTP(w, r)
			return
		}

		ip := clientIP(r)
		now := time.Now()
		mu.Lock()
		window := clients[ip]
		if window.resetAt.IsZero() || now.After(window.resetAt) {
			window = clientWindow{count: 0, resetAt: now.Add(cfg.Window)}
		}
		window.count++
		clients[ip] = window
		limited := window.count > cfg.Max
		mu.Unlock()

		if limited {
			if cfg.Logger != nil {
				cfg.Logger.Warn("rate limit exceeded", "ip", ip, "path", r.URL.Path)
			}
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(http.StatusTooManyRequests)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"error": "您所在的IP地址计算请求过于频繁，请休息一下再试~",
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}

func clientIP(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		return strings.TrimSpace(parts[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
