package middleware

import (
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"ark-lmd-go-backend/internal/logging"
)

const defaultMaxTrackedClients = 4096

type RateLimitConfig struct {
	Window     time.Duration
	Max        int
	Enabled    bool
	TrustProxy bool
	Logger     *slog.Logger
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
	lastCleanup := time.Now()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !shouldRateLimitPath(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}

		ip := clientIP(r, cfg.TrustProxy)
		now := time.Now()
		mu.Lock()
		if now.Sub(lastCleanup) >= cfg.Window {
			for client, window := range clients {
				if now.After(window.resetAt) {
					delete(clients, client)
				}
			}
			lastCleanup = now
		}
		window, tracked := clients[ip]
		if window.resetAt.IsZero() || now.After(window.resetAt) {
			window = clientWindow{count: 0, resetAt: now.Add(cfg.Window)}
		}
		window.count++
		limited := window.count > cfg.Max
		if !tracked && len(clients) >= defaultMaxTrackedClients {
			limited = true
		} else {
			clients[ip] = window
		}
		mu.Unlock()

		if limited {
			if cfg.Logger != nil {
				cfg.Logger.Warn("rate limit exceeded", "event", "rate_limit_exceeded", "request_id", logging.RequestID(r.Context()), "ip", ip, "path", r.URL.Path, "limit", cfg.Max, "window_seconds", int(cfg.Window.Seconds()))
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

func shouldRateLimitPath(path string) bool {
	if path == "/find-paths" || path == "/cache-stats" || path == "/server-stats" {
		return true
	}
	return strings.HasPrefix(path, "/admin/")
}

func clientIP(r *http.Request, trustProxy bool) string {
	if trustProxy {
		return forwardedClientIP(r)
	}
	return remoteClientIP(r)
}

func forwardedClientIP(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if ip := strings.TrimSpace(parts[0]); ip != "" {
			return ip
		}
	}
	return remoteClientIP(r)
}

func remoteClientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
