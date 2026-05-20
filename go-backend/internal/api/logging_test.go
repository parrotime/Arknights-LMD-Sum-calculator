package api

import "testing"

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
