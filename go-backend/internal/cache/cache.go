package cache

import (
	"sync"
	"time"

	"ark-lmd-go-backend/internal/calc"
)

type entry struct {
	value     []calc.Path
	expiresAt time.Time
}

type TTLCache struct {
	mu         sync.RWMutex
	ttl        time.Duration
	maxEntries int
	items      map[string]entry
}

func NewTTLCache(ttl time.Duration, maxEntries int) *TTLCache {
	if ttl <= 0 {
		ttl = time.Hour
	}
	if maxEntries <= 0 {
		maxEntries = 1024
	}
	return &TTLCache{
		ttl:        ttl,
		maxEntries: maxEntries,
		items:      make(map[string]entry),
	}
}

func (c *TTLCache) Get(key string) ([]calc.Path, bool) {
	c.mu.RLock()
	item, ok := c.items[key]
	c.mu.RUnlock()
	if !ok {
		return nil, false
	}
	if time.Now().After(item.expiresAt) {
		c.mu.Lock()
		delete(c.items, key)
		c.mu.Unlock()
		return nil, false
	}
	return clonePaths(item.value), true
}

func (c *TTLCache) Set(key string, value []calc.Path) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.items) >= c.maxEntries {
		for existing := range c.items {
			delete(c.items, existing)
			break
		}
	}
	c.items[key] = entry{
		value:     clonePaths(value),
		expiresAt: time.Now().Add(c.ttl),
	}
}

func clonePaths(paths []calc.Path) []calc.Path {
	cloned := make([]calc.Path, len(paths))
	for i, path := range paths {
		cloned[i] = make(calc.Path, len(path))
		copy(cloned[i], path)
	}
	return cloned
}
