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
		SanityLimit:   210,
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

func TestMergeAndSortPathCombinesAndOrdersSteps(t *testing.T) {
	result := mergeAndSortPath(
		Path{{ID: 118, Count: 1}, {ID: 222, Count: 1}},
		Path{{ID: 117, Count: 2}, {ID: 118, Count: 3}, {ID: 119, Count: 0}},
	)

	expected := Path{{ID: 117, Count: 2}, {ID: 118, Count: 4}, {ID: 222, Count: 1}}
	if !pathsEqual(result, expected) {
		t.Fatalf("unexpected merged path: got %#v, want %#v", result, expected)
	}
}

func TestMergeAndSortPathHandlesSingleStepFastPath(t *testing.T) {
	cases := []struct {
		name     string
		oldPath  Path
		newSteps Path
		expected Path
	}{
		{
			name:     "insert at beginning",
			oldPath:  Path{{ID: 118, Count: 1}, {ID: 222, Count: 1}},
			newSteps: Path{{ID: 117, Count: 2}},
			expected: Path{{ID: 117, Count: 2}, {ID: 118, Count: 1}, {ID: 222, Count: 1}},
		},
		{
			name:     "insert in middle",
			oldPath:  Path{{ID: 117, Count: 1}, {ID: 222, Count: 1}},
			newSteps: Path{{ID: 118, Count: 2}},
			expected: Path{{ID: 117, Count: 1}, {ID: 118, Count: 2}, {ID: 222, Count: 1}},
		},
		{
			name:     "insert at end",
			oldPath:  Path{{ID: 117, Count: 1}, {ID: 118, Count: 1}},
			newSteps: Path{{ID: 222, Count: 2}},
			expected: Path{{ID: 117, Count: 1}, {ID: 118, Count: 1}, {ID: 222, Count: 2}},
		},
		{
			name:     "merge same id",
			oldPath:  Path{{ID: 117, Count: 1}, {ID: 118, Count: 1}},
			newSteps: Path{{ID: 118, Count: 3}},
			expected: Path{{ID: 117, Count: 1}, {ID: 118, Count: 4}},
		},
		{
			name:     "filter non-positive step",
			oldPath:  Path{{ID: 117, Count: 1}, {ID: 118, Count: 1}},
			newSteps: Path{{ID: 119, Count: 0}},
			expected: Path{{ID: 117, Count: 1}, {ID: 118, Count: 1}},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			originalOldPath := clonePath(tc.oldPath)
			result := mergeAndSortPath(tc.oldPath, tc.newSteps)
			if !pathsEqual(result, tc.expected) {
				t.Fatalf("unexpected merged path: got %#v, want %#v", result, tc.expected)
			}
			if !pathsEqual(tc.oldPath, originalOldPath) {
				t.Fatal("old path should not be mutated")
			}
		})
	}
}

func TestCanMergePathChecksCountsBeforeAllocation(t *testing.T) {
	metas := make([]itemMeta, 223)
	metas[117] = itemMeta{MaxCount: 10, IsTrade: true, Exists: true}
	metas[118] = itemMeta{MaxCount: 10, IsTrade: true, Exists: true}
	metas[222] = itemMeta{MaxCount: 10, IsTrade: true, Exists: true}

	if !canMergePath(Path{{ID: 117, Count: 7}}, Path{{ID: 117, Count: 3}}, metas, nil) {
		t.Fatal("expected merge at max count to be allowed")
	}
	if canMergePath(Path{{ID: 117, Count: 8}}, Path{{ID: 117, Count: 3}}, metas, nil) {
		t.Fatal("expected merge over max count to be rejected")
	}
	if canMergePath(Path{}, Path{{ID: 118, Count: 6}, {ID: 118, Count: 5}}, metas, nil) {
		t.Fatal("expected duplicate fragment count over max to be rejected")
	}
	if !canMergePath(Path{{ID: 222, Count: 10}}, Path{{ID: 222, Count: 0}}, metas, nil) {
		t.Fatal("expected non-positive fragment step to be ignored")
	}
	if canMergePath(Path{{ID: 300, Count: 8}}, Path{{ID: 300, Count: 3}}, metas, nil) {
		t.Fatal("expected unknown item to use default max count")
	}
	if canMergePath(Path{{ID: 222, Count: 1}}, Path{{ID: 222, Count: 1}}, metas, map[int]int{222: 1}) {
		t.Fatal("expected trade user limit to reject merge before allocation")
	}
}

func TestSnapshotEntriesKeepsPathListStableAfterInsert(t *testing.T) {
	ctx := &contextState{
		DP: map[int]*state{
			1000: {
				Paths: []Path{
					{{ID: 117, Count: 1}},
					{{ID: 118, Count: 1}},
				},
			},
		},
		Order: []int{1000},
	}

	entries := snapshotEntries(ctx)
	if len(entries) != 1 || len(entries[0].paths) != 2 {
		t.Fatalf("unexpected snapshot: %#v", entries)
	}

	ctx.DP[1000].Paths = insertPathByLength(ctx.DP[1000].Paths, Path{{ID: 222, Count: 1}})

	if len(entries[0].paths) != 2 {
		t.Fatalf("snapshot path list should not grow after source insert, got %#v", entries[0].paths)
	}
	if !pathsEqual(entries[0].paths[0], Path{{ID: 117, Count: 1}}) ||
		!pathsEqual(entries[0].paths[1], Path{{ID: 118, Count: 1}}) {
		t.Fatalf("snapshot path list changed after source insert: %#v", entries[0].paths)
	}
}

func TestSortAndCompactPathOrdersCombinesAndFilters(t *testing.T) {
	result := sortAndCompactPath(Path{
		{ID: 222, Count: 1},
		{ID: 117, Count: 0},
		{ID: 118, Count: 2},
		{ID: 222, Count: 3},
		{ID: 100, Count: -1},
		{ID: 118, Count: 1},
	})

	expected := Path{{ID: 118, Count: 3}, {ID: 222, Count: 4}}
	if !pathsEqual(result, expected) {
		t.Fatalf("unexpected compacted path: got %#v, want %#v", result, expected)
	}
}

func TestNormalizePathRewritesMaterialAndCombinesSteps(t *testing.T) {
	items := loadTestItems(t)
	itemMap := make(map[int]data.Item, len(items))
	for _, item := range items {
		itemMap[item.ID] = item
	}
	caches := &caches{
		Material: make(map[int]ComboResult),
	}

	result := normalizePath(
		Path{{ID: 100, Count: 1}, {ID: 222, Count: 1}, {ID: 102, Count: 1}, {ID: 222, Count: 2}},
		itemMap,
		caches,
	)

	expected := Path{{ID: 103, Count: 1}, {ID: 222, Count: 3}}
	if !pathsEqual(result, expected) {
		t.Fatalf("unexpected normalized path: got %#v, want %#v", result, expected)
	}
}

func TestIsTradePathWithinLimitsChecksEachTradeDenom(t *testing.T) {
	items := loadTestItems(t)
	itemMap := make(map[int]data.Item, len(items))
	for _, item := range items {
		itemMap[item.ID] = item
	}
	limits := buildTradeLimits(Limits{
		Trade2Limit: 1,
		Trade3Limit: 2,
		Trade4Limit: 3,
		Trade5Limit: 4,
	})

	if !isTradePathWithinLimits(Path{{ID: 117, Count: 1}, {ID: 118, Count: 2}, {ID: 119, Count: 3}, {ID: 222, Count: 4}}, itemMap, limits) {
		t.Fatal("expected trade path within limits")
	}
	if isTradePathWithinLimits(Path{{ID: 117, Count: 2}}, itemMap, limits) {
		t.Fatal("expected trade2 path over limit")
	}
	if isTradePathWithinLimits(Path{{ID: 118, Count: 3}}, itemMap, limits) {
		t.Fatal("expected trade3 path over limit")
	}
	if isTradePathWithinLimits(Path{{ID: 119, Count: 4}}, itemMap, limits) {
		t.Fatal("expected trade4 path over limit")
	}
	if isTradePathWithinLimits(Path{{ID: 222, Count: 5}}, itemMap, limits) {
		t.Fatal("expected trade5 path over limit")
	}
}

func TestPathKeyKeepsStableFormat(t *testing.T) {
	if key := pathKey(Path{}); key != "" {
		t.Fatalf("unexpected empty path key: got %q", key)
	}
	key := pathKey(Path{{ID: 117, Count: 2}, {ID: 222, Count: 1}})
	if key != "117x2_222x1" {
		t.Fatalf("unexpected path key: got %q", key)
	}
}

func TestInsertPathByLengthKeepsAscendingStableOrder(t *testing.T) {
	paths := []Path{
		{{ID: 1, Count: 1}},
		{{ID: 2, Count: 1}, {ID: 3, Count: 1}},
		{{ID: 4, Count: 1}, {ID: 5, Count: 1}, {ID: 6, Count: 1}},
	}

	inserted := insertPathByLength(paths, Path{{ID: 7, Count: 1}, {ID: 8, Count: 1}})
	expected := []Path{
		{{ID: 1, Count: 1}},
		{{ID: 2, Count: 1}, {ID: 3, Count: 1}},
		{{ID: 7, Count: 1}, {ID: 8, Count: 1}},
		{{ID: 4, Count: 1}, {ID: 5, Count: 1}, {ID: 6, Count: 1}},
	}

	if !pathSlicesEqual(inserted, expected) {
		t.Fatalf("unexpected insert order: got %#v, want %#v", inserted, expected)
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

func pathSlicesEqual(a []Path, b []Path) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if !pathsEqual(a[i], b[i]) {
			return false
		}
	}
	return true
}

func pathsEqual(a Path, b Path) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
