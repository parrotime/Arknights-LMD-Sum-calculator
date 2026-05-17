package cache

import (
	"container/list"
	"sync"
	"time"

	"ark-lmd-go-backend/internal/calc"
)

type entry struct {
	key       string
	value     []calc.Path
	expiresAt time.Time
}

type TTLCache struct {
	mu         sync.RWMutex
	ttl        time.Duration
	maxEntries int
	items      map[string]*list.Element
	lru        *list.List
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
		items:      make(map[string]*list.Element),
		lru:        list.New(),
	}
}

func (c *TTLCache) Get(key string) ([]calc.Path, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	element, ok := c.items[key]
	if !ok {
		return nil, false
	}
	item := element.Value.(*entry)
	if time.Now().After(item.expiresAt) {
		c.removeElement(element)
		return nil, false
	}
	c.lru.MoveToFront(element)
	return clonePaths(item.value), true
}

func (c *TTLCache) Set(key string, value []calc.Path) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if element, ok := c.items[key]; ok {
		item := element.Value.(*entry)
		item.value = clonePaths(value)
		item.expiresAt = time.Now().Add(c.ttl)
		c.lru.MoveToFront(element)
		return
	}

	c.removeExpiredLocked(time.Now())
	if len(c.items) >= c.maxEntries {
		c.removeOldestLocked()
	}
	item := &entry{
		key:       key,
		value:     clonePaths(value),
		expiresAt: time.Now().Add(c.ttl),
	}
	c.items[key] = c.lru.PushFront(item)
}

func (c *TTLCache) removeExpiredLocked(now time.Time) {
	for element := c.lru.Back(); element != nil; {
		previous := element.Prev()
		item := element.Value.(*entry)
		if now.After(item.expiresAt) {
			c.removeElement(element)
		}
		element = previous
	}
}

func (c *TTLCache) removeOldestLocked() {
	if element := c.lru.Back(); element != nil {
		c.removeElement(element)
	}
}

func (c *TTLCache) removeElement(element *list.Element) {
	item := element.Value.(*entry)
	delete(c.items, item.key)
	c.lru.Remove(element)
}

func clonePaths(paths []calc.Path) []calc.Path {
	cloned := make([]calc.Path, len(paths))
	for i, path := range paths {
		cloned[i] = make(calc.Path, len(path))
		copy(cloned[i], path)
	}
	return cloned
}
