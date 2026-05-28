package calc

type SearchMode string

const (
	ModeFast   SearchMode = "fast"
	ModeStrong SearchMode = "strong"
)

type SearchOptions struct {
	Mode              SearchMode
	MaxSteps          int
	MaxPathsPerSum    int
	MaxPathsForTarget int
	TargetPathCount   int
	PruneMin          int
	PruneMax          int
}

func FastOptions() SearchOptions {
	return SearchOptions{
		Mode:              ModeFast,
		MaxSteps:          MaxSteps,
		MaxPathsPerSum:    MaxPathsPerSum,
		MaxPathsForTarget: MaxPathsForTarget,
		TargetPathCount:   TargetPathCount,
		PruneMin:          1000,
		PruneMax:          3000,
	}
}

func StrongOptions() SearchOptions {
	return SearchOptions{
		Mode:              ModeStrong,
		MaxSteps:          7,
		MaxPathsPerSum:    15,
		MaxPathsForTarget: 30,
		TargetPathCount:   TargetPathCount,
		PruneMin:          1500,
		PruneMax:          5000,
	}
}

func OptionsForMode(mode string) SearchOptions {
	if SearchMode(mode) == ModeStrong {
		return StrongOptions()
	}
	return FastOptions()
}

func NormalizeSearchMode(mode string) string {
	if SearchMode(mode) == ModeStrong {
		return string(ModeStrong)
	}
	return string(ModeFast)
}

func normalizeSearchOptions(options SearchOptions) SearchOptions {
	if options.MaxSteps <= 0 {
		options.MaxSteps = MaxSteps
	}
	if options.MaxPathsPerSum <= 0 {
		options.MaxPathsPerSum = MaxPathsPerSum
	}
	if options.MaxPathsForTarget <= 0 {
		options.MaxPathsForTarget = MaxPathsForTarget
	}
	if options.TargetPathCount <= 0 {
		options.TargetPathCount = TargetPathCount
	}
	if options.PruneMin <= 0 {
		options.PruneMin = 1000
	}
	if options.PruneMax < options.PruneMin {
		options.PruneMax = options.PruneMin
	}
	if options.Mode != ModeStrong {
		options.Mode = ModeFast
	}
	return options
}
