package api

import (
	"encoding/json"
	"testing"
)

func TestParseLimitsAllowsMaxSanityLimit(t *testing.T) {
	limits, err := parseLimits(map[string]json.RawMessage{
		"sanityLimit": json.RawMessage(`210`),
	})
	if err != nil {
		t.Fatalf("expected sanity limit 210 to be accepted: %v", err)
	}
	if limits.SanityLimit != 210 {
		t.Fatalf("expected sanity limit 210, got %d", limits.SanityLimit)
	}
}

func TestParseLimitsRejectsOverMaxSanityLimit(t *testing.T) {
	_, err := parseLimits(map[string]json.RawMessage{
		"sanityLimit": json.RawMessage(`211`),
	})
	if err == nil {
		t.Fatal("expected sanity limit 211 to be rejected")
	}
}
