package api

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"testing"
	"time"
)

func TestCanceledCalculationLogsRequestWithoutServerError(t *testing.T) {
	var requests, failures bytes.Buffer
	handler := &Handler{
		calcLogger:  slog.New(slog.NewJSONHandler(&requests, nil)),
		errorLogger: slog.New(slog.NewJSONHandler(&failures, nil)),
	}
	handler.logCalcFailure("request", "", "", 2500, true, 100, "fast", "miss", time.Now(), context.Canceled)
	var event struct {
		Event  string `json:"event"`
		Status string `json:"status"`
		Target int    `json:"target_lmd"`
	}
	if err := json.Unmarshal(requests.Bytes(), &event); err != nil {
		t.Fatal(err)
	}
	if event.Event != "calc_canceled" || event.Status != "canceled" || event.Target != 2500 || failures.Len() != 0 {
		t.Fatalf("unexpected cancellation logs: requests=%s, failures=%s", &requests, &failures)
	}
}

func TestCalcCurrentLMD(t *testing.T) {
	current, ok := calcCurrentLMD(2500, true, 100)
	if !ok {
		t.Fatal("expected current LMD to be available")
	}
	if current != 2400 {
		t.Fatalf("expected current LMD 2400, got %d", current)
	}
}

func TestCalcCurrentLMDWithoutTarget(t *testing.T) {
	current, ok := calcCurrentLMD(0, false, 100)
	if ok {
		t.Fatal("expected current LMD to be unavailable")
	}
	if current != 0 {
		t.Fatalf("expected zero current LMD fallback, got %d", current)
	}
}
