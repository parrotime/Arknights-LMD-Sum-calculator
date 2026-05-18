package calc

import (
	"context"
	"testing"
)

func BenchmarkFindPaths(b *testing.B) {
	items := loadTestItems(b)

	cases := []struct {
		name   string
		target int
		limits Limits
	}{
		{
			name:   "target_2500_default",
			target: 2500,
			limits: defaultLimits(),
		},
		{
			name:   "target_2500_trade5_zero",
			target: 2500,
			limits: limitsWithTrade5Zero(),
		},
		{
			name:   "target_5000_default",
			target: 5000,
			limits: defaultLimits(),
		},
		{
			name:   "target_minus_500_default",
			target: -500,
			limits: defaultLimits(),
		},
	}

	for _, tc := range cases {
		b.Run(tc.name, func(b *testing.B) {
			b.ReportAllocs()
			for i := 0; i < b.N; i++ {
				paths, err := FindPathsWithContext(context.Background(), tc.target, items, tc.limits)
				if err != nil {
					b.Fatalf("FindPathsWithContext returned error: %v", err)
				}
				if len(paths) == 0 {
					b.Fatalf("expected at least one path")
				}
			}
		})
	}
}

func limitsWithTrade5Zero() Limits {
	limits := defaultLimits()
	limits.Trade5Limit = 0
	return limits
}
