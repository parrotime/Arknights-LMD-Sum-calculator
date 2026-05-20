package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"ark-lmd-go-backend/internal/logging"
)

type statusRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func (r *statusRecorder) Write(body []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	written, err := r.ResponseWriter.Write(body)
	r.bytes += written
	return written, err
}

func AccessLog(next http.Handler, logger *slog.Logger, trustProxy bool) http.Handler {
	if logger == nil {
		return next
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = logging.NewRequestID()
		}
		r = r.WithContext(logging.WithRequestID(r.Context(), requestID))

		recorder := &statusRecorder{ResponseWriter: w}
		recorder.Header().Set("X-Request-ID", requestID)
		next.ServeHTTP(recorder, r)

		status := recorder.status
		if status == 0 {
			status = http.StatusOK
		}
		logger.Info("http request",
			"event", "http_request",
			"request_id", requestID,
			"ip", logging.ClientIP(r, trustProxy),
			"method", r.Method,
			"path", r.URL.Path,
			"status", status,
			"bytes", recorder.bytes,
			"duration_ms", time.Since(started).Milliseconds(),
			"user_agent", r.UserAgent(),
		)
	})
}
