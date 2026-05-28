package calc

import (
	"context"
	"testing"

	"ark-lmd-go-backend/internal/data"
)

func BenchmarkFindPaths(b *testing.B) {
	items := loadTestItems(b)

	cases := []struct {
		name   string
		target int
		limits Limits
	}{
		{
			name:   "target_spectrum/positive_500_default",
			target: 500,
			limits: defaultLimits(),
		},
		{
			name:   "target_spectrum/positive_2500_default",
			target: 2500,
			limits: defaultLimits(),
		},
		{
			name:   "target_spectrum/positive_5000_default",
			target: 5000,
			limits: defaultLimits(),
		},
		{
			name:   "target_spectrum/positive_8000_default",
			target: 8000,
			limits: defaultLimits(),
		},
		{
			name:   "target_spectrum/negative_500_default",
			target: -500,
			limits: defaultLimits(),
		},
		{
			name:   "target_spectrum/negative_2500_default",
			target: -2500,
			limits: defaultLimits(),
		},
		{
			name:   "target_spectrum/negative_5000_default",
			target: -5000,
			limits: defaultLimits(),
		},
		{
			name:   "target_spectrum/negative_8000_default",
			target: -8000,
			limits: defaultLimits(),
		},
		{
			name:   "limit_pressure/positive_2500_trade5_zero",
			target: 2500,
			limits: limitsWithTrade5Zero(),
		},
		{
			name:   "limit_pressure/positive_2500_no_trade",
			target: 2500,
			limits: limitsWithoutTrade(),
		},
		{
			name:   "limit_pressure/positive_5000_low_trade",
			target: 5000,
			limits: limitsWithLowTrade(),
		},
		{
			name:   "limit_pressure/positive_8000_no_trade",
			target: 8000,
			limits: limitsWithoutTrade(),
		},
		{
			name:   "limit_pressure/positive_5000_low_upgrade",
			target: 5000,
			limits: limitsWithLowUpgrade(),
		},
		{
			name:   "limit_pressure/negative_2500_low_upgrade",
			target: -2500,
			limits: limitsWithLowUpgrade(),
		},
		{
			name:   "limit_pressure/positive_5000_low_sanity",
			target: 5000,
			limits: limitsWithLowSanity(),
		},
		{
			name:   "limit_pressure/positive_8000_tight_all",
			target: 8000,
			limits: limitsWithTightAll(),
		},
	}

	for _, tc := range cases {
		b.Run("fast/"+tc.name, func(b *testing.B) {
			benchmarkFindPathsWithOptions(b, tc.target, items, tc.limits, FastOptions())
		})
		b.Run("strong/"+tc.name, func(b *testing.B) {
			benchmarkFindPathsWithOptions(b, tc.target, items, tc.limits, StrongOptions())
		})
	}
}

func benchmarkFindPathsWithOptions(b *testing.B, target int, items []data.Item, limits Limits, options SearchOptions) {
	b.Helper()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		paths, err := FindPathsWithOptions(context.Background(), target, items, limits, options)
		if err != nil {
			b.Fatalf("FindPathsWithOptions returned error: %v", err)
		}
		if len(paths) == 0 {
			b.Fatalf("expected at least one path")
		}
	}
}

func limitsWithTrade5Zero() Limits {
	limits := defaultLimits()
	limits.Trade5Limit = 0
	return limits
}

func limitsWithoutTrade() Limits {
	limits := defaultLimits()
	limits.Trade2Limit = 0
	limits.Trade3Limit = 0
	limits.Trade4Limit = 0
	limits.Trade5Limit = 0
	return limits
}

func limitsWithLowTrade() Limits {
	limits := defaultLimits()
	limits.Trade2Limit = 1
	limits.Trade3Limit = 1
	limits.Trade4Limit = 1
	limits.Trade5Limit = 1
	return limits
}

func limitsWithLowUpgrade() Limits {
	limits := defaultLimits()
	limits.Upgrade0Limit = 1
	limits.Upgrade1Limit = 1
	limits.Upgrade2Limit = 1
	return limits
}

func limitsWithLowSanity() Limits {
	limits := defaultLimits()
	limits.SanityLimit = 25
	return limits
}

func limitsWithTightAll() Limits {
	limits := limitsWithLowTrade()
	limits.Upgrade0Limit = 2
	limits.Upgrade1Limit = 2
	limits.Upgrade2Limit = 2
	limits.SanityLimit = 50
	return limits
}
