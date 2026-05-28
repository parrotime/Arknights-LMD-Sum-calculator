package api

import (
	"encoding/json"
	"testing"

	"ark-lmd-go-backend/internal/calc"
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

func TestNormalizeCalcMode(t *testing.T) {
	cases := []struct {
		name string
		mode string
		want string
	}{
		{name: "empty", mode: "", want: string(calc.ModeFast)},
		{name: "fast", mode: "fast", want: string(calc.ModeFast)},
		{name: "strong", mode: "strong", want: string(calc.ModeStrong)},
		{name: "unknown", mode: "boost", want: string(calc.ModeFast)},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := normalizeCalcMode(tc.mode); got != tc.want {
				t.Fatalf("normalizeCalcMode(%q) = %q, want %q", tc.mode, got, tc.want)
			}
		})
	}
}

func TestBuildCacheKeyNormalizesCalcMode(t *testing.T) {
	s := settings{AllowTrade: true}
	l := calc.Limits{SanityLimit: 210}

	fastKey := buildCacheKey(100, s, l, normalizeCalcMode(""), "test-version")
	unknownKey := buildCacheKey(100, s, l, normalizeCalcMode("boost"), "test-version")
	strongKey := buildCacheKey(100, s, l, normalizeCalcMode("strong"), "test-version")

	if fastKey != unknownKey {
		t.Fatal("expected empty and unknown modes to share the normalized fast cache key")
	}
	if fastKey == strongKey {
		t.Fatal("expected strong mode to use a distinct cache key")
	}
}
