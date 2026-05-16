package middleware

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

func Recovery(next http.Handler, logger *slog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				if logger != nil {
					logger.Error("panic recovered", "value", recovered)
				}
				w.Header().Set("Content-Type", "application/json; charset=utf-8")
				w.WriteHeader(http.StatusInternalServerError)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error": "Internal server error occurred during path finding.",
				})
			}
		}()
		next.ServeHTTP(w, r)
	})
}
