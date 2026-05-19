package cache

import (
	"testing"
	"time"

	"ark-lmd-go-backend/internal/calc"
)

func TestTTLCacheStatsHitMissAndClone(t *testing.T) {
	cache := NewTTLCache(time.Minute, 2)
	path := []calc.Path{{{ID: 117, Count: 1}}}

	if _, ok := cache.Get("a"); ok {
		t.Fatal("expected missing key to return false")
	}

	cache.Set("a", path)
	got, ok := cache.Get("a")
	if !ok {
		t.Fatal("expected stored key to hit")
	}
	got[0][0].Count = 99

	gotAgain, ok := cache.Get("a")
	if !ok {
		t.Fatal("expected stored key to keep hitting")
	}
	if gotAgain[0][0].Count != 1 {
		t.Fatalf("expected cached value to be cloned, got count %d", gotAgain[0][0].Count)
	}

	stats := cache.Stats()
	if stats.Hits != 2 || stats.Misses != 1 {
		t.Fatalf("unexpected stats: hits=%d misses=%d", stats.Hits, stats.Misses)
	}
	if stats.Entries != 1 || stats.MaxEntries != 2 {
		t.Fatalf("unexpected entry stats: entries=%d max=%d", stats.Entries, stats.MaxEntries)
	}
}

func TestTTLCacheEvictsLeastRecentlyUsedEntry(t *testing.T) {
	cache := NewTTLCache(time.Minute, 2)

	cache.Set("a", []calc.Path{{{ID: 117, Count: 1}}})
	cache.Set("b", []calc.Path{{{ID: 118, Count: 1}}})
	if _, ok := cache.Get("a"); !ok {
		t.Fatal("expected key a to hit before eviction")
	}

	cache.Set("c", []calc.Path{{{ID: 222, Count: 1}}})

	if _, ok := cache.Get("b"); ok {
		t.Fatal("expected least recently used key b to be evicted")
	}
	if _, ok := cache.Get("a"); !ok {
		t.Fatal("expected recently used key a to remain")
	}
	if _, ok := cache.Get("c"); !ok {
		t.Fatal("expected new key c to remain")
	}

	stats := cache.Stats()
	if stats.Evictions != 1 {
		t.Fatalf("expected one eviction, got %d", stats.Evictions)
	}
}

func TestTTLCacheExpiresEntries(t *testing.T) {
	cache := NewTTLCache(time.Nanosecond, 2)
	cache.Set("a", []calc.Path{{{ID: 117, Count: 1}}})
	time.Sleep(time.Millisecond)

	if _, ok := cache.Get("a"); ok {
		t.Fatal("expected expired key to miss")
	}

	stats := cache.Stats()
	if stats.Expired != 1 || stats.Misses != 1 {
		t.Fatalf("unexpected expiration stats: expired=%d misses=%d", stats.Expired, stats.Misses)
	}
	if stats.Entries != 0 {
		t.Fatalf("expected expired entry to be removed, got %d entries", stats.Entries)
	}
}
