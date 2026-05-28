package calc

import (
	"context"
	"testing"
)

func TestStrongOptionsUseLargerSearchBudget(t *testing.T) {
	fast := FastOptions()
	strong := StrongOptions()

	if strong.MaxSteps <= fast.MaxSteps {
		t.Fatalf("expected strong max steps to exceed fast: strong=%d fast=%d", strong.MaxSteps, fast.MaxSteps)
	}
	if strong.MaxPathsPerSum <= fast.MaxPathsPerSum {
		t.Fatalf("expected strong per-sum paths to exceed fast: strong=%d fast=%d", strong.MaxPathsPerSum, fast.MaxPathsPerSum)
	}
	if strong.MaxPathsForTarget <= fast.MaxPathsForTarget {
		t.Fatalf("expected strong target paths to exceed fast: strong=%d fast=%d", strong.MaxPathsForTarget, fast.MaxPathsForTarget)
	}
	if strong.TargetPathCount != fast.TargetPathCount {
		t.Fatalf("expected strong to keep the same response count: strong=%d fast=%d", strong.TargetPathCount, fast.TargetPathCount)
	}
}

func TestOptionsForModeFallsBackToFast(t *testing.T) {
	cases := []string{"", "fast", "unknown"}
	for _, mode := range cases {
		t.Run(mode, func(t *testing.T) {
			if got := OptionsForMode(mode); got.Mode != ModeFast {
				t.Fatalf("expected %q to use fast options, got %#v", mode, got)
			}
		})
	}

	if got := OptionsForMode("strong"); got.Mode != ModeStrong {
		t.Fatalf("expected strong mode, got %#v", got)
	}
}

func TestFindPathsWithStrongOptionsKeepsTradeVariants(t *testing.T) {
	paths, err := FindPathsWithOptions(context.Background(), 2500, loadTestItems(t), defaultLimits(), StrongOptions())
	if err != nil {
		t.Fatalf("FindPathsWithOptions returned error: %v", err)
	}
	if !hasPath(paths, map[int]int{222: 1}) {
		t.Fatalf("expected strong mode to keep 5-gold trade path, got %#v", paths)
	}
	if !hasPath(paths, map[int]int{117: 1, 118: 1}) {
		t.Fatalf("expected strong mode to keep 2+3 gold trade path, got %#v", paths)
	}
}

func TestFindPathsWithStrongOptionsRespectsTradeLimits(t *testing.T) {
	limits := defaultLimits()
	limits.Trade5Limit = 0

	paths, err := FindPathsWithOptions(context.Background(), 2500, loadTestItems(t), limits, StrongOptions())
	if err != nil {
		t.Fatalf("FindPathsWithOptions returned error: %v", err)
	}
	if hasPath(paths, map[int]int{222: 1}) {
		t.Fatalf("did not expect 5-gold trade path when limit is zero, got %#v", paths)
	}
	if !hasPath(paths, map[int]int{117: 1, 118: 1}) {
		t.Fatalf("expected 2+3 gold trade path, got %#v", paths)
	}
}

func TestStrongResultsAreSortedByStepCount(t *testing.T) {
	paths, err := FindPathsWithOptions(context.Background(), -5000, loadTestItems(t), defaultLimits(), StrongOptions())
	if err != nil {
		t.Fatalf("FindPathsWithOptions returned error: %v", err)
	}
	assertPathsSortedByDisplayOrder(t, paths)
}
