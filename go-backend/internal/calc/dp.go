package calc

import (
	"context"
	"math"
	"sort"
	"strconv"
	"strings"

	"ark-lmd-go-backend/internal/data"
)

func FindPaths(target int, items []data.Item, limits Limits) []Path {
	paths, err := FindPathsWithContext(context.Background(), target, items, limits)
	if err != nil {
		return []Path{}
	}
	return paths
}

func FindPathsWithContext(ctx context.Context, target int, items []data.Item, limits Limits) ([]Path, error) {
	if items == nil {
		return []Path{}, nil
	}

	itemMap := make(map[int]data.Item, len(items))
	for _, item := range items {
		itemMap[item.ID] = item
	}

	stageItems := make([]data.Item, 0)
	validItems := make([]data.Item, 0, len(items))
	for _, item := range items {
		if item.Type == "3_star" || item.Type == "2_star" {
			stageItems = append(stageItems, item)
		}
		if item.ItemValue != 0 {
			validItems = append(validItems, item)
		}
	}
	sort.SliceStable(stageItems, func(i, j int) bool {
		return stageItems[i].ItemValue > stageItems[j].ItemValue
	})
	sort.SliceStable(validItems, func(i, j int) bool {
		return abs(validItems[i].ItemValue) > abs(validItems[j].ItemValue)
	})

	calcState := &contextState{
		DP: map[int]*state{
			0: &state{Paths: []Path{{}}, Keys: map[string]struct{}{"": {}}},
		},
		Order:         []int{0},
		MaxPaths:      MaxPathsPerSum,
		Target:        target,
		ItemMap:       itemMap,
		Upgrade0Limit: limits.Upgrade0Limit,
		Upgrade1Limit: limits.Upgrade1Limit,
		Upgrade2Limit: limits.Upgrade2Limit,
		SanityLimit:   limits.SanityLimit,
		TradeLimits:   buildTradeLimits(limits),
		Caches: caches{
			Material: make(map[int]ComboResult),
			Stage:    newStageComboCache(stageItems, itemMap),
		},
	}

	pruneThreshold := min(max(abs(target), 1000), 3000)
	enoughPaths := false

	for _, item := range validItems {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		itemValue := item.ItemValue
		maxCount := getMaxCountForID(item.ID, itemMap)
		count := 0
		for count < maxCount &&
			float64(abs(itemValue*(count+1)-target)) <= float64(abs(target))+float64(abs(itemValue))*0.5 {
			count++
			newSum := itemValue * count
			fragment, ok := getOptimalFragment(item, count, &calcState.Caches)
			if !ok {
				continue
			}
			savePath(calcState, newSum, fragment)
		}
	}

	if target > 0 {
		for _, combo := range getLimitedCombos(target, TradeDenoms, calcState.TradeLimits, MaxPathsForTarget) {
			savePath(calcState, target, combo)
		}
	}

	if targetState := calcState.DP[target]; targetState != nil && len(targetState.Paths) >= MaxPathsForTarget {
		enoughPaths = true
	}

	for step := 2; step <= MaxSteps && !enoughPaths; step++ {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		remainingBudget := MaxSteps - step + 1
		dynamicThreshold := int(math.Ceil(float64(pruneThreshold*remainingBudget) / float64(MaxSteps)))

		entries := snapshotEntries(calcState)
		for _, entry := range entries {
			if err := ctx.Err(); err != nil {
				return nil, err
			}
			currentSum := entry.sum
			paths := entry.paths
			if abs(currentSum-target) > dynamicThreshold {
				continue
			}

			remaining := target - currentSum
			exactMatchTried := false
			for _, item := range validItems {
				if err := ctx.Err(); err != nil {
					return nil, err
				}
				iv := item.ItemValue
				if iv == 0 || remaining%iv != 0 {
					continue
				}
				exactCount := remaining / iv
				if exactCount <= 0 || exactCount > getMaxCountForID(item.ID, itemMap) {
					continue
				}
				exactMatchTried = true
				for _, oldPath := range paths {
					fragment, ok := getOptimalFragment(item, exactCount, &calcState.Caches)
					if !ok {
						continue
					}
					potential := mergeAndSortPath(oldPath, fragment)
					if isPathValid(potential, itemMap) {
						if savePath(calcState, target, potential) {
							enoughPaths = true
						}
						if enoughPaths {
							break
						}
					}
				}
				if enoughPaths {
					break
				}
			}
			if enoughPaths {
				break
			}

			for _, item := range validItems {
				if err := ctx.Err(); err != nil {
					return nil, err
				}
				itemValue := item.ItemValue
				maxCount := getMaxCountForID(item.ID, itemMap)
				count := 0
				for count < maxCount &&
					abs(currentSum+itemValue*(count+1)-target) <= abs(target)+abs(itemValue) {
					count++
					newSum := currentSum + itemValue*count
					if exactMatchTried && newSum == target {
						continue
					}
					for _, oldPath := range paths {
						fragment, ok := getOptimalFragment(item, count, &calcState.Caches)
						if !ok {
							continue
						}
						potential := mergeAndSortPath(oldPath, fragment)
						if isPathValid(potential, itemMap) {
							if savePath(calcState, newSum, potential) {
								enoughPaths = true
							}
							if enoughPaths {
								break
							}
						}
					}
					if enoughPaths {
						break
					}
				}
				if enoughPaths {
					break
				}
			}
			if enoughPaths {
				break
			}
		}
	}

	return finalizeResult(calcState.DP, target, TargetPathCount, itemMap), nil
}

func getMaxCountForID(id int, itemMap map[int]data.Item) int {
	item, ok := itemMap[id]
	if !ok {
		return 10
	}
	switch item.Type {
	case "upgrade":
		return 1
	case "upgrade_only_1":
		return 5
	case "upgrade_only_2":
		return 3
	default:
		return 10
	}
}

func getOptimalGreedyCombo(absTarget int, denoms []Denom, cache map[int]ComboResult) ComboResult {
	if absTarget == 0 {
		return ComboResult{Steps: 0, Combo: Path{}}
	}
	if absTarget < 0 {
		return ComboResult{Steps: MaxInt, Combo: Path{}}
	}
	if result, ok := cache[absTarget]; ok {
		return cloneComboResult(result)
	}

	remaining := absTarget
	steps := 0
	combo := Path{}
	for _, denom := range denoms {
		count := remaining / denom.Value
		if count > 0 {
			combo = append(combo, Step{ID: denom.ID, Count: count})
			remaining -= count * denom.Value
			steps += count
		}
	}

	result := ComboResult{Steps: MaxInt, Combo: Path{}}
	if remaining == 0 {
		result = ComboResult{Steps: steps, Combo: combo}
	}
	cache[absTarget] = cloneComboResult(result)
	return cloneComboResult(result)
}

func getLimitedCombos(absTarget int, denoms []Denom, limits map[int]int, maxCombos int) []Path {
	if absTarget == 0 {
		return []Path{{}}
	}
	if absTarget < 0 {
		return []Path{}
	}

	results := make([]Path, 0, maxCombos)
	current := Path{}
	var dfs func(index int, remaining int)
	dfs = func(index int, remaining int) {
		if len(results) >= maxCombos {
			return
		}
		if index >= len(denoms) {
			if remaining == 0 {
				results = append(results, clonePath(current))
			}
			return
		}

		denom := denoms[index]
		limit := limits[denom.ID]
		maxCount := min(limit, remaining/denom.Value)
		for count := maxCount; count >= 0; count-- {
			if count > 0 {
				current = append(current, Step{ID: denom.ID, Count: count})
			}
			dfs(index+1, remaining-denom.Value*count)
			if count > 0 {
				current = current[:len(current)-1]
			}
		}
	}
	dfs(0, absTarget)

	filtered := make([]Path, 0, len(results))
	for _, combo := range results {
		if len(combo) > 0 {
			filtered = append(filtered, combo)
		}
	}
	sort.SliceStable(filtered, func(i, j int) bool {
		countA := totalCount(filtered[i])
		countB := totalCount(filtered[j])
		if countA != countB {
			return countA < countB
		}
		idA, idB := 0, 0
		if len(filtered[i]) > 0 {
			idA = filtered[i][0].ID
		}
		if len(filtered[j]) > 0 {
			idB = filtered[j][0].ID
		}
		return idA < idB
	})
	return filtered
}

func getOptimalStageCombo(subTarget int, cache *stageComboCache) ComboResult {
	if cache == nil {
		return ComboResult{Steps: MaxInt, Combo: Path{}}
	}
	return cache.get(subTarget)
}

type stageComboCache struct {
	items   []data.Item
	itemMap map[int]data.Item
	dp      []int
	from    []fromStep
	builtTo int
	results map[int]ComboResult
}

func newStageComboCache(stageItems []data.Item, itemMap map[int]data.Item) *stageComboCache {
	return &stageComboCache{
		items:   stageItems,
		itemMap: itemMap,
		dp:      []int{0},
		from:    []fromStep{{}},
		results: make(map[int]ComboResult),
	}
}

func (cache *stageComboCache) get(subTarget int) ComboResult {
	if subTarget <= 0 {
		return ComboResult{Steps: 0, Combo: Path{}}
	}
	if result, ok := cache.results[subTarget]; ok {
		return cloneComboResult(result)
	}
	cache.ensureBuilt(subTarget)

	const inf = MaxInt / 4
	if cache.dp[subTarget] >= inf {
		result := ComboResult{Steps: MaxInt, Combo: Path{}}
		cache.results[subTarget] = result
		return result
	}

	combo := Path{}
	for v := subTarget; v > 0; {
		step := cache.from[v]
		if step.ID == 0 || step.Count <= 0 {
			break
		}
		combo = append(combo, Step{ID: step.ID, Count: step.Count})
		v = step.Prev
	}

	result := ComboResult{Steps: cache.dp[subTarget], Combo: combo}
	cache.results[subTarget] = cloneComboResult(result)
	return cloneComboResult(result)
}

func (cache *stageComboCache) ensureBuilt(target int) {
	if target <= cache.builtTo {
		return
	}

	const inf = MaxInt / 4
	dp := make([]int, target+1)
	from := make([]fromStep, target+1)
	for i := 1; i <= target; i++ {
		dp[i] = inf
	}

	for _, item := range cache.items {
		val := item.ItemValue
		maxCount := getMaxCountForID(item.ID, cache.itemMap)
		for v := target; v >= val; v-- {
			for k := 1; k <= maxCount && k*val <= v; k++ {
				if dp[v-k*val]+k < dp[v] {
					dp[v] = dp[v-k*val] + k
					from[v] = fromStep{ID: item.ID, Count: k, Prev: v - k*val}
				}
			}
		}
	}

	cache.dp = dp
	cache.from = from
	cache.builtTo = target
	cache.results = make(map[int]ComboResult)
}

type fromStep struct {
	ID    int
	Count int
	Prev  int
}

func getOptimalFragment(item data.Item, count int, caches *caches) (Path, bool) {
	val := item.ItemValue * count
	switch item.Type {
	case "trade":
		return Path{{ID: item.ID, Count: count}}, true
	case "material":
		result := getOptimalGreedyCombo(abs(val), MaterialDenoms, caches.Material)
		return result.Combo, len(result.Combo) > 0
	case "3_star", "2_star":
		result := getOptimalStageCombo(val, caches.Stage)
		return result.Combo, len(result.Combo) > 0
	default:
		return Path{{ID: item.ID, Count: count}}, true
	}
}

func normalizePath(path Path, itemMap map[int]data.Item, caches *caches) Path {
	totalMaterialValue := 0
	hasMaterial := false
	normalized := make(Path, 0, len(path))
	for _, step := range path {
		item, ok := itemMap[step.ID]
		if ok && item.Type == "material" {
			hasMaterial = true
			totalMaterialValue += item.ItemValue * step.Count
		} else {
			normalized = append(normalized, step)
		}
	}

	if hasMaterial {
		optimalMaterial := getOptimalGreedyCombo(abs(totalMaterialValue), MaterialDenoms, caches.Material)
		normalized = append(normalized, optimalMaterial.Combo...)
	}

	if len(normalized) == 0 {
		return normalized
	}

	sort.Slice(normalized, func(i, j int) bool {
		return normalized[i].ID < normalized[j].ID
	})

	write := 0
	for _, step := range normalized {
		if step.Count <= 0 {
			continue
		}
		if write > 0 && normalized[write-1].ID == step.ID {
			normalized[write-1].Count += step.Count
			continue
		}
		normalized[write] = step
		write++
	}
	return normalized[:write]
}

func savePath(ctx *contextState, sum int, path Path) bool {
	upgrade0Count, upgrade1Count, upgrade2Count, totalSanity := 0, 0, 0, 0
	for _, step := range path {
		item, ok := ctx.ItemMap[step.ID]
		if !ok {
			continue
		}
		switch item.Type {
		case "upgrade_only_0":
			upgrade0Count += step.Count
		case "upgrade_only_1":
			upgrade1Count += step.Count
		case "upgrade_only_2":
			upgrade2Count += step.Count
		}
		if item.Consume > 0 {
			totalSanity += step.Count * item.Consume
		}
	}
	if upgrade0Count > ctx.Upgrade0Limit ||
		upgrade1Count > ctx.Upgrade1Limit ||
		upgrade2Count > ctx.Upgrade2Limit ||
		totalSanity > ctx.SanityLimit {
		return false
	}

	normalized := normalizePath(path, ctx.ItemMap, &ctx.Caches)
	actualSum, valid := validateNormalizedPath(normalized, ctx.ItemMap, ctx.TradeLimits)
	if !valid {
		return false
	}
	if actualSum != sum {
		return false
	}

	normalizedKey := pathKey(normalized)
	st, ok := ctx.DP[sum]
	if !ok {
		st = &state{Paths: []Path{}, Keys: make(map[string]struct{})}
		ctx.DP[sum] = st
		ctx.Order = append(ctx.Order, sum)
	}
	if _, exists := st.Keys[normalizedKey]; exists {
		return false
	}

	effectiveMaxPaths := ctx.MaxPaths
	if sum == ctx.Target {
		effectiveMaxPaths = MaxPathsForTarget
	}

	added := false
	if len(st.Paths) < effectiveMaxPaths {
		st.Paths = insertPathByLength(st.Paths, normalized)
		st.Keys[normalizedKey] = struct{}{}
		added = true
	} else {
		longest := st.Paths[len(st.Paths)-1]
		if len(normalized) < len(longest) ||
			(len(normalized) == len(longest) && totalCount(normalized) < totalCount(longest)) {
			delete(st.Keys, pathKey(longest))
			st.Paths = st.Paths[:len(st.Paths)-1]
			st.Paths = insertPathByLength(st.Paths, normalized)
			st.Keys[normalizedKey] = struct{}{}
			added = true
		}
	}

	if added && sum == ctx.Target {
		return len(ctx.DP[ctx.Target].Paths) >= MaxPathsForTarget
	}
	return false
}

func isPathValid(path Path, itemMap map[int]data.Item) bool {
	counts := make(map[int]int)
	for _, step := range path {
		counts[step.ID] += step.Count
		if counts[step.ID] > getMaxCountForID(step.ID, itemMap) {
			return false
		}
	}
	return true
}

func mergeAndSortPath(oldPath Path, newSteps Path) Path {
	merged := make(Path, 0, len(oldPath)+len(newSteps))
	merged = append(merged, oldPath...)
	merged = append(merged, newSteps...)
	if len(merged) == 0 {
		return merged
	}

	sort.Slice(merged, func(i, j int) bool {
		return merged[i].ID < merged[j].ID
	})

	write := 0
	for _, step := range merged {
		if step.Count <= 0 {
			continue
		}
		if write > 0 && merged[write-1].ID == step.ID {
			merged[write-1].Count += step.Count
			continue
		}
		merged[write] = step
		write++
	}
	return merged[:write]
}

func hasRemovableZeroSumSubset(path Path, itemMap map[int]data.Item) bool {
	values := []int{}
	hasPositive, hasNegative := false, false
	for _, step := range path {
		item, ok := itemMap[step.ID]
		if !ok || item.ItemValue == 0 || step.Count <= 0 {
			continue
		}
		if item.ItemValue > 0 {
			hasPositive = true
		}
		if item.ItemValue < 0 {
			hasNegative = true
		}
		for i := 0; i < step.Count; i++ {
			values = append(values, item.ItemValue)
		}
	}
	if !hasPositive || !hasNegative || len(values) < 2 {
		return false
	}

	countsBySum := map[int]map[int]struct{}{
		0: {0: {}},
	}
	for _, value := range values {
		snapshot := make([]sumCounts, 0, len(countsBySum))
		for sum, counts := range countsBySum {
			copied := make([]int, 0, len(counts))
			for count := range counts {
				copied = append(copied, count)
			}
			snapshot = append(snapshot, sumCounts{Sum: sum, Counts: copied})
		}
		for _, entry := range snapshot {
			for _, count := range entry.Counts {
				nextSum := entry.Sum + value
				nextCount := count + 1
				if nextSum == 0 && nextCount > 0 && nextCount < len(values) {
					return true
				}
				if countsBySum[nextSum] == nil {
					countsBySum[nextSum] = make(map[int]struct{})
				}
				countsBySum[nextSum][nextCount] = struct{}{}
			}
		}
	}
	return false
}

type sumCounts struct {
	Sum    int
	Counts []int
}

func finalizeResult(dp map[int]*state, target int, maxPaths int, itemMap map[int]data.Item) []Path {
	targetState := dp[target]
	if targetState == nil {
		return []Path{}
	}

	unique := make(map[string]struct{})
	final := make([]Path, 0, len(targetState.Paths))
	for _, path := range targetState.Paths {
		keyParts := make([]string, 0, len(path))
		for _, step := range path {
			item, ok := itemMap[step.ID]
			if ok && item.Type != "3_star" && item.Type != "2_star" {
				keyParts = append(keyParts, strconv.Itoa(step.ID)+"x"+strconv.Itoa(step.Count))
			}
		}
		key := strings.Join(keyParts, "_")
		if _, exists := unique[key]; exists {
			continue
		}
		unique[key] = struct{}{}
		if !hasRemovableZeroSumSubset(path, itemMap) {
			final = append(final, clonePath(path))
		}
	}

	sort.SliceStable(final, func(i, j int) bool {
		if len(final[i]) != len(final[j]) {
			return len(final[i]) < len(final[j])
		}
		countA, countB := totalCount(final[i]), totalCount(final[j])
		if countA != countB {
			return countA < countB
		}
		idA, idB := 0, 0
		if len(final[i]) > 0 {
			idA = final[i][0].ID
		}
		if len(final[j]) > 0 {
			idB = final[j][0].ID
		}
		return idA < idB
	})
	if len(final) > maxPaths*3 {
		final = final[:maxPaths*3]
	}

	const maxPerSig = 4
	sigCounts := make(map[int]int)
	diverse := make([]Path, 0, maxPaths)
	overflow := make([]Path, 0)
	for _, path := range final {
		sig := 0
		for _, step := range path {
			item, ok := itemMap[step.ID]
			if !ok {
				continue
			}
			if item.Consume > 0 {
				sig |= 1
			} else if item.Type == "trade" {
				sig |= 2
			} else if item.Type == "material" {
				sig |= 4
			} else if strings.HasPrefix(item.Type, "upgrade") {
				sig |= 8
			}
		}
		if sigCounts[sig] < maxPerSig {
			sigCounts[sig]++
			diverse = append(diverse, path)
		} else {
			overflow = append(overflow, path)
		}
		if len(diverse) >= maxPaths {
			break
		}
	}
	if len(diverse) < maxPaths {
		need := maxPaths - len(diverse)
		if need > len(overflow) {
			need = len(overflow)
		}
		diverse = append(diverse, overflow[:need]...)
	}

	reordered := make([]Path, 0, len(diverse))
	for _, path := range diverse {
		positive := Path{}
		negative := Path{}
		for _, step := range path {
			item, ok := itemMap[step.ID]
			if ok && item.ItemValue > 0 {
				positive = append(positive, step)
			} else {
				negative = append(negative, step)
			}
		}
		reordered = append(reordered, append(positive, negative...))
	}
	return reordered
}

func buildTradeLimits(limits Limits) map[int]int {
	return map[int]int{
		222: limits.Trade5Limit,
		119: limits.Trade4Limit,
		118: limits.Trade3Limit,
		117: limits.Trade2Limit,
	}
}

func isTradePathWithinLimits(path Path, itemMap map[int]data.Item, tradeLimits map[int]int) bool {
	_, valid := validateNormalizedPath(path, itemMap, tradeLimits)
	return valid
}

func validateNormalizedPath(path Path, itemMap map[int]data.Item, tradeLimits map[int]int) (int, bool) {
	trade2Count, trade3Count, trade4Count, trade5Count := 0, 0, 0, 0
	actualSum := 0
	for _, step := range path {
		item, ok := itemMap[step.ID]
		if !ok {
			continue
		}
		actualSum += item.ItemValue * step.Count
		if item.Type != "trade" {
			continue
		}

		switch step.ID {
		case 117:
			trade2Count += step.Count
			if trade2Count > tradeLimits[117] {
				return actualSum, false
			}
		case 118:
			trade3Count += step.Count
			if trade3Count > tradeLimits[118] {
				return actualSum, false
			}
		case 119:
			trade4Count += step.Count
			if trade4Count > tradeLimits[119] {
				return actualSum, false
			}
		case 222:
			trade5Count += step.Count
			if trade5Count > tradeLimits[222] {
				return actualSum, false
			}
		default:
			limit, ok := tradeLimits[step.ID]
			if !ok {
				limit = getMaxCountForID(step.ID, itemMap)
			}
			if step.Count > limit {
				return actualSum, false
			}
		}
	}
	return actualSum, true
}

type dpEntry struct {
	sum   int
	paths []Path
}

func snapshotEntries(ctx *contextState) []dpEntry {
	entries := make([]dpEntry, 0, len(ctx.Order))
	for _, sum := range ctx.Order {
		st := ctx.DP[sum]
		if st == nil {
			continue
		}
		paths := make([]Path, len(st.Paths))
		for i, path := range st.Paths {
			paths[i] = clonePath(path)
		}
		entries = append(entries, dpEntry{sum: sum, paths: paths})
	}
	return entries
}

func sortPathsByLength(paths []Path) {
	sort.SliceStable(paths, func(i, j int) bool {
		return len(paths[i]) < len(paths[j])
	})
}

func insertPathByLength(paths []Path, path Path) []Path {
	insertAt := len(paths)
	for i, existing := range paths {
		if len(path) < len(existing) {
			insertAt = i
			break
		}
	}

	paths = append(paths, nil)
	copy(paths[insertAt+1:], paths[insertAt:])
	paths[insertAt] = path
	return paths
}

func pathKey(path Path) string {
	if len(path) == 0 {
		return ""
	}

	var builder strings.Builder
	builder.Grow(len(path) * 8)
	for i, step := range path {
		if i > 0 {
			builder.WriteByte('_')
		}
		builder.WriteString(strconv.Itoa(step.ID))
		builder.WriteByte('x')
		builder.WriteString(strconv.Itoa(step.Count))
	}
	return builder.String()
}

func totalCount(path Path) int {
	total := 0
	for _, step := range path {
		total += step.Count
	}
	return total
}

func clonePath(path Path) Path {
	cloned := make(Path, len(path))
	copy(cloned, path)
	return cloned
}

func cloneComboResult(result ComboResult) ComboResult {
	return ComboResult{Steps: result.Steps, Combo: clonePath(result.Combo)}
}

func abs(value int) int {
	if value < 0 {
		return -value
	}
	return value
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
