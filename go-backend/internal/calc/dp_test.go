package calc

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"ark-lmd-go-backend/internal/data"
)

func loadTestItems(t testing.TB) []data.Item {
	t.Helper()
	file := filepath.Join("..", "..", "..", "data", "gameItems.json")
	bytes, err := os.ReadFile(file)
	if err != nil {
		t.Fatalf("read items: %v", err)
	}
	var items []data.Item
	if err := json.Unmarshal(bytes, &items); err != nil {
		t.Fatalf("parse items: %v", err)
	}
	return items
}

func defaultLimits() Limits {
	return Limits{
		Upgrade0Limit: 10,
		Upgrade1Limit: 10,
		Upgrade2Limit: 10,
		SanityLimit:   200,
		Trade2Limit:   10,
		Trade3Limit:   10,
		Trade4Limit:   10,
		Trade5Limit:   10,
	}
}

func TestFindPathsTarget2500KeepsTradeVariants(t *testing.T) {
	paths := FindPaths(2500, loadTestItems(t), defaultLimits())
	if !hasPath(paths, map[int]int{222: 1}) {
		t.Fatalf("expected 5-gold trade path, got %#v", paths)
	}
	if !hasPath(paths, map[int]int{117: 1, 118: 1}) {
		t.Fatalf("expected 2+3 gold trade path, got %#v", paths)
	}
}

func TestFindPathsTrade5LimitZero(t *testing.T) {
	limits := defaultLimits()
	limits.Trade5Limit = 0
	paths := FindPaths(2500, loadTestItems(t), limits)
	if hasPath(paths, map[int]int{222: 1}) {
		t.Fatalf("did not expect 5-gold trade path, got %#v", paths)
	}
	if !hasPath(paths, map[int]int{117: 1, 118: 1}) {
		t.Fatalf("expected 2+3 gold trade path, got %#v", paths)
	}
}

func TestFinalizeFiltersRemovableZeroSumSubset(t *testing.T) {
	items := loadTestItems(t)
	itemMap := make(map[int]data.Item, len(items))
	for _, item := range items {
		itemMap[item.ID] = item
	}

	dp := map[int]*state{
		2500: &state{
			Paths: []Path{
				{{ID: 112, Count: 2}, {ID: 222, Count: 1}, {ID: 2, Count: 4}},
				{{ID: 222, Count: 1}},
			},
			Keys: map[string]struct{}{},
		},
	}
	result := finalizeResult(dp, 2500, TargetPathCount, itemMap)
	if hasPath(result, map[int]int{112: 2, 222: 1, 2: 4}) {
		t.Fatalf("zero-sum removable path should be filtered, got %#v", result)
	}
	if !hasPath(result, map[int]int{222: 1}) {
		t.Fatalf("expected clean path to remain, got %#v", result)
	}
}

func hasPath(paths []Path, expected map[int]int) bool {
	for _, path := range paths {
		if pathMatches(path, expected) {
			return true
		}
	}
	return false
}

func pathMatches(path Path, expected map[int]int) bool {
	if len(path) != len(expected) {
		return false
	}
	for _, step := range path {
		if expected[step.ID] != step.Count {
			return false
		}
	}
	return true
}
