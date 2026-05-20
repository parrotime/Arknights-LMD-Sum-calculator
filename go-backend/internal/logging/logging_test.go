package logging

import "testing"

func TestHashIPStable(t *testing.T) {
	first := HashIP("127.0.0.1", "salt")
	second := HashIP("127.0.0.1", "salt")
	if first == "" {
		t.Fatal("expected non-empty hash")
	}
	if first != second {
		t.Fatalf("expected stable hash, got %q and %q", first, second)
	}
}

func TestHashIPSaltChangesValue(t *testing.T) {
	first := HashIP("127.0.0.1", "salt-a")
	second := HashIP("127.0.0.1", "salt-b")
	if first == second {
		t.Fatalf("expected different hashes with different salts, got %q", first)
	}
}

func TestHashIPEmpty(t *testing.T) {
	if got := HashIP("", "salt"); got != "" {
		t.Fatalf("expected empty hash for empty IP, got %q", got)
	}
}
