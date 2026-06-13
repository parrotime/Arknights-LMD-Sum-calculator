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
	return FindPathsWithOptions(ctx, target, items, limits, FastOptions())
}

func FindPathsWithOptions(ctx context.Context, target int, items []data.Item, limits Limits, options SearchOptions) ([]Path, error) {
	options = normalizeSearchOptions(options)
	if items == nil {
		return []Path{}, nil
	}

	itemMap := make(map[int]data.Item, len(items))
	for _, item := range items {
		itemMap[item.ID] = item
	}
	itemMeta := buildItemMeta(items)

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

	pruneThreshold := min(max(abs(target), options.PruneMin), options.PruneMax)

	calcState := &contextState{
		DP: map[int]*state{
			0: &state{Paths: []Path{{}}},
		},
		Order:          []int{0},
		MaxPaths:       options.MaxPathsPerSum,
		MaxTargetPaths: options.MaxPathsForTarget,
		Target:         target,
		ItemMap:        itemMap,
		ItemMeta:       itemMeta,
		Upgrade0Limit:  limits.Upgrade0Limit,
		Upgrade1Limit:  limits.Upgrade1Limit,
		Upgrade2Limit:  limits.Upgrade2Limit,
		SanityLimit:    limits.SanityLimit,
		TradeLimits:    buildTradeLimits(limits),
		Caches: caches{
			Material: make(map[int]ComboResult),
			Stage:    newStageComboCache(stageItems, itemMeta, target, pruneThreshold),
		},
	}

	enoughPaths := false

	for _, item := range validItems {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		itemValue := item.ItemValue
		maxCount := getMaxCountFromMeta(item.ID, itemMeta)
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
		for _, combo := range getLimitedCombos(target, TradeDenoms, calcState.TradeLimits, options.MaxPathsForTarget) {
			savePath(calcState, target, combo)
		}
	}

	if targetState := calcState.DP[target]; targetState != nil && len(targetState.Paths) >= options.MaxPathsForTarget {
		enoughPaths = true
	}

	for step := 2; step <= options.MaxSteps && !enoughPaths; step++ {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		remainingBudget := options.MaxSteps - step + 1
		dynamicThreshold := int(math.Ceil(float64(pruneThreshold*remainingBudget) / float64(options.MaxSteps)))

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
				if exactCount <= 0 || exactCount > getMaxCountFromMeta(item.ID, itemMeta) {
					continue
				}
				exactMatchTried = true
				fragment, ok := getOptimalFragment(item, exactCount, &calcState.Caches)
				if !ok {
					continue
				}
				for _, oldPath := range paths {
					if !canMergePath(oldPath, fragment, itemMeta, calcState.TradeLimits) {
						continue
					}
					potential := mergeAndSortPath(oldPath, fragment)
					if savePath(calcState, target, potential) {
						enoughPaths = true
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

			for _, item := range validItems {
				if err := ctx.Err(); err != nil {
					return nil, err
				}
				itemValue := item.ItemValue
				maxCount := getMaxCountFromMeta(item.ID, itemMeta)
				count := 0
				for count < maxCount &&
					abs(currentSum+itemValue*(count+1)-target) <= abs(target)+abs(itemValue) {
					count++
					newSum := currentSum + itemValue*count
					if exactMatchTried && newSum == target {
						continue
					}
					fragment, ok := getOptimalFragment(item, count, &calcState.Caches)
					if !ok {
						continue
					}
					for _, oldPath := range paths {
						if !canMergePath(oldPath, fragment, itemMeta, calcState.TradeLimits) {
							continue
						}
						potential := mergeAndSortPath(oldPath, fragment)
						if savePath(calcState, newSum, potential) {
							enoughPaths = true
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
			if enoughPaths {
				break
			}
		}
	}

	return finalizeResult(calcState.DP, target, options, itemMap), nil
}

func getMaxCountForID(id int, itemMap map[int]data.Item) int {
	item, ok := itemMap[id]
	if !ok {
		return 10
	}
	return maxCountForType(item.Type)
}

func buildItemMeta(items []data.Item) []itemMeta {
	maxID := 0
	for _, item := range items {
		if item.ID > maxID {
			maxID = item.ID
		}
	}

	metas := make([]itemMeta, maxID+1)
	for _, item := range items {
		metas[item.ID] = itemMeta{
			Value:    item.ItemValue,
			MaxCount: maxCountForType(item.Type),
			IsTrade:  item.Type == "trade",
			Exists:   true,
		}
	}
	return metas
}

func buildItemMetaFromMap(itemMap map[int]data.Item) []itemMeta {
	maxID := 0
	for _, item := range itemMap {
		if item.ID > maxID {
			maxID = item.ID
		}
	}

	metas := make([]itemMeta, maxID+1)
	for _, item := range itemMap {
		metas[item.ID] = itemMeta{
			Value:    item.ItemValue,
			MaxCount: maxCountForType(item.Type),
			IsTrade:  item.Type == "trade",
			Exists:   true,
		}
	}
	return metas
}

func maxCountForType(itemType string) int {
	switch itemType {
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

func getMaxCountFromMeta(id int, metas []itemMeta) int {
	if id < 0 || id >= len(metas) || !metas[id].Exists {
		return 10
	}
	return metas[id].MaxCount
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
	items      []data.Item
	metas      []itemMeta
	dp         []int
	from       []fromStep
	builtTo    int
	prebuildTo int
	results    map[int]ComboResult
}

func newStageComboCache(stageItems []data.Item, metas []itemMeta, target int, pruneThreshold int) *stageComboCache {
	return &stageComboCache{
		items:      stageItems,
		metas:      metas,
		dp:         []int{0},
		from:       []fromStep{{}},
		prebuildTo: stagePrebuildTarget(target, pruneThreshold, stageItems, metas),
		results:    make(map[int]ComboResult),
	}
}

func (cache *stageComboCache) get(subTarget int) ComboResult {
	if subTarget <= 0 {
		return ComboResult{Steps: 0, Combo: Path{}}
	}
	if result, ok := cache.results[subTarget]; ok {
		return cloneComboResult(result)
	}
	cache.ensureBuilt(max(subTarget, cache.prebuildTo))

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

func maxStageComboTarget(stageItems []data.Item, metas []itemMeta) int {
	maxTarget := 0
	for _, item := range stageItems {
		target := item.ItemValue * getMaxCountFromMeta(item.ID, metas)
		if target > maxTarget {
			maxTarget = target
		}
	}
	return maxTarget
}

func stagePrebuildTarget(target int, pruneThreshold int, stageItems []data.Item, metas []itemMeta) int {
	maxTarget := maxStageComboTarget(stageItems, metas)
	if target >= 0 {
		return maxTarget
	}
	return min(maxTarget, pruneThreshold)
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
		maxCount := getMaxCountFromMeta(item.ID, cache.metas)
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
	for _, step := range path {
		item, ok := itemMap[step.ID]
		if ok && item.Type == "material" {
			hasMaterial = true
			totalMaterialValue += item.ItemValue * step.Count
		}
	}

	if !hasMaterial {
		if len(path) == 0 {
			return path
		}
		return sortAndCompactPath(path)
	}

	normalized := make(Path, 0, len(path))
	for _, step := range path {
		item, ok := itemMap[step.ID]
		if ok && item.Type == "material" {
			continue
		}
		normalized = append(normalized, step)
	}

	optimalMaterial := getOptimalGreedyCombo(abs(totalMaterialValue), MaterialDenoms, caches.Material)
	normalized = append(normalized, optimalMaterial.Combo...)

	if len(normalized) == 0 {
		return normalized
	}

	return sortAndCompactPath(normalized)
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
	actualSum, valid := validateNormalizedPath(normalized, ctx.ItemMeta, ctx.TradeLimits)
	if !valid {
		return false
	}
	if actualSum != sum {
		return false
	}

	effectiveMaxPaths := ctx.MaxPaths
	if sum == ctx.Target {
		effectiveMaxPaths = ctx.MaxTargetPaths
	}

	st, ok := ctx.DP[sum]
	if !ok {
		st = &state{Paths: []Path{}}
		ctx.DP[sum] = st
		ctx.Order = append(ctx.Order, sum)
	}
	if pathExists(st.Paths, normalized) {
		return false
	}

	added := false
	if len(st.Paths) < effectiveMaxPaths {
		st.Paths = insertPathByLength(st.Paths, normalized)
		added = true
	} else {
		lowestQuality := st.Paths[len(st.Paths)-1]
		if comparePathQuality(normalized, lowestQuality) < 0 {
			st.Paths = st.Paths[:len(st.Paths)-1]
			st.Paths = insertPathByLength(st.Paths, normalized)
			added = true
		}
	}

	if added && sum == ctx.Target {
		return len(ctx.DP[ctx.Target].Paths) >= ctx.MaxTargetPaths
	}
	return false
}

func isPathValid(path Path, metas []itemMeta) bool {
	counts := make(map[int]int)
	for _, step := range path {
		counts[step.ID] += step.Count
		if counts[step.ID] > getMaxCountFromMeta(step.ID, metas) {
			return false
		}
	}
	return true
}

func canMergePath(oldPath Path, fragment Path, metas []itemMeta, tradeLimits map[int]int) bool {
	for i, step := range fragment {
		if step.Count <= 0 {
			continue
		}
		seen := false
		for j := 0; j < i; j++ {
			if fragment[j].ID == step.ID && fragment[j].Count > 0 {
				seen = true
				break
			}
		}
		if seen {
			continue
		}

		count := step.Count
		for j := i + 1; j < len(fragment); j++ {
			if fragment[j].ID == step.ID && fragment[j].Count > 0 {
				count += fragment[j].Count
			}
		}
		for _, existing := range oldPath {
			if existing.ID == step.ID && existing.Count > 0 {
				count += existing.Count
			}
		}
		if count > effectiveStepLimit(step.ID, metas, tradeLimits) {
			return false
		}
	}
	return true
}

func effectiveStepLimit(id int, metas []itemMeta, tradeLimits map[int]int) int {
	limit := getMaxCountFromMeta(id, metas)
	if id < 0 || id >= len(metas) || !metas[id].Exists || !metas[id].IsTrade {
		return limit
	}
	if tradeLimits == nil {
		return limit
	}
	tradeLimit, ok := tradeLimits[id]
	if !ok {
		return limit
	}
	return tradeLimit
}

func mergeAndSortPath(oldPath Path, newSteps Path) Path {
	if len(oldPath) == 0 {
		if len(newSteps) == 0 {
			return newSteps
		}
		return sortAndCompactPath(newSteps)
	}
	if len(newSteps) == 1 {
		return mergeSingleStep(oldPath, newSteps[0])
	}

	merged := make(Path, 0, len(oldPath)+len(newSteps))
	merged = append(merged, oldPath...)
	merged = append(merged, newSteps...)
	if len(merged) == 0 {
		return merged
	}

	return sortAndCompactPath(merged)
}

func mergeSingleStep(oldPath Path, step Step) Path {
	if step.Count <= 0 {
		return clonePath(oldPath)
	}

	insertAt := len(oldPath)
	for i, existing := range oldPath {
		if existing.ID == step.ID {
			merged := clonePath(oldPath)
			merged[i].Count += step.Count
			return merged
		}
		if existing.ID > step.ID {
			insertAt = i
			break
		}
	}

	merged := make(Path, len(oldPath)+1)
	copy(merged, oldPath[:insertAt])
	merged[insertAt] = step
	copy(merged[insertAt+1:], oldPath[insertAt:])
	return merged
}

func sortAndCompactPath(path Path) Path {
	for i := 1; i < len(path); i++ {
		step := path[i]
		j := i - 1
		for j >= 0 && path[j].ID > step.ID {
			path[j+1] = path[j]
			j--
		}
		path[j+1] = step
	}

	write := 0
	for _, step := range path {
		if step.Count <= 0 {
			continue
		}
		if write > 0 && path[write-1].ID == step.ID {
			path[write-1].Count += step.Count
			continue
		}
		path[write] = step
		write++
	}
	return path[:write]
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

func finalizeResult(dp map[int]*state, target int, options SearchOptions, itemMap map[int]data.Item) []Path {
	targetState := dp[target]
	if targetState == nil {
		return []Path{}
	}
	options = normalizeSearchOptions(options)
	maxPaths := options.TargetPathCount

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

	sortPathsByDisplayOrder(final)
	candidateLimit := maxPaths * options.FinalCandidateMultiplier
	if len(final) > candidateLimit {
		final = final[:candidateLimit]
	}

	if options.QualityFirst {
		if len(final) > maxPaths {
			final = final[:maxPaths]
		}
		return reorderPathsForResponse(final, itemMap)
	}

	maxPerSig := options.DiversityPerSignature
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
	sortPathsByDisplayOrder(diverse)

	return reorderPathsForResponse(diverse, itemMap)
}

func reorderPathsForResponse(paths []Path, itemMap map[int]data.Item) []Path {
	reordered := make([]Path, 0, len(paths))
	for _, path := range paths {
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
	_, valid := validateNormalizedPath(path, buildItemMetaFromMap(itemMap), tradeLimits)
	return valid
}

func validateNormalizedPath(path Path, metas []itemMeta, tradeLimits map[int]int) (int, bool) {
	trade2Count, trade3Count, trade4Count, trade5Count := 0, 0, 0, 0
	actualSum := 0
	for _, step := range path {
		if step.ID < 0 || step.ID >= len(metas) || !metas[step.ID].Exists {
			continue
		}
		meta := metas[step.ID]
		actualSum += meta.Value * step.Count
		if !meta.IsTrade {
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
				limit = meta.MaxCount
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
		copy(paths, st.Paths)
		entries = append(entries, dpEntry{sum: sum, paths: paths})
	}
	return entries
}

func sortPathsByLength(paths []Path) {
	sort.SliceStable(paths, func(i, j int) bool {
		return len(paths[i]) < len(paths[j])
	})
}

func sortPathsByDisplayOrder(paths []Path) {
	sort.SliceStable(paths, func(i, j int) bool {
		return comparePathQuality(paths[i], paths[j]) < 0
	})
}

func insertPathByLength(paths []Path, path Path) []Path {
	insertAt := len(paths)
	for i, existing := range paths {
		if comparePathQuality(path, existing) < 0 {
			insertAt = i
			break
		}
	}

	paths = append(paths, nil)
	copy(paths[insertAt+1:], paths[insertAt:])
	paths[insertAt] = path
	return paths
}

func comparePathQuality(a Path, b Path) int {
	if len(a) != len(b) {
		return len(a) - len(b)
	}
	countA, countB := totalCount(a), totalCount(b)
	if countA != countB {
		return countA - countB
	}
	return strings.Compare(pathKey(a), pathKey(b))
}

func pathExists(paths []Path, path Path) bool {
	for _, existing := range paths {
		if samePath(existing, path) {
			return true
		}
	}
	return false
}

func samePath(a Path, b Path) bool {
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

func pathKey(path Path) string {
	if len(path) == 0 {
		return ""
	}

	buf := make([]byte, 0, len(path)*8)
	for i, step := range path {
		if i > 0 {
			buf = append(buf, '_')
		}
		buf = strconv.AppendInt(buf, int64(step.ID), 10)
		buf = append(buf, 'x')
		buf = strconv.AppendInt(buf, int64(step.Count), 10)
	}
	return string(buf)
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
