package adminstats

import (
	"errors"
	"io"
	"os"
	"path/filepath"
	"sort"
	"time"
)

const (
	currentUsageVersion = 1
	maxUsageDiff        = 5_000
)

var diffLimits = [...]uint64{99, 499, 999, 2_499, maxUsageDiff}

type usageDay struct {
	Buckets [len(diffLimits)]UsagePair `json:"buckets"`
	Targets map[int]int                `json:"targets,omitempty"`
	Hours   [24]int                    `json:"hours"`
}

type UsagePair struct {
	Gain  UsageSide `json:"gain"`
	Spend UsageSide `json:"spend"`
}

type UsageSide struct {
	Count  int    `json:"count"`
	Amount uint64 `json:"amount"`
}

type UsageBucket struct {
	Min uint64 `json:"min"`
	Max uint64 `json:"max"`
	UsagePair
}

type RankedTarget struct {
	Amount int `json:"amount"`
	Count  int `json:"count"`
}

type UsagePeriod struct {
	StartDate  string         `json:"startDate"`
	EndDate    string         `json:"endDate"`
	Totals     UsagePair      `json:"totals"`
	Buckets    []UsageBucket  `json:"buckets"`
	TopTargets []RankedTarget `json:"topTargets"`
}

type UsageHeatmapDay struct {
	Date    string `json:"date"`
	Weekday int    `json:"weekday"`
	Hours   []int  `json:"hours"`
}

type UsageSnapshot struct {
	Heatmap []UsageHeatmapDay      `json:"heatmap"`
	Periods map[string]UsagePeriod `json:"periods"`
}

type AdminSnapshot struct {
	Snapshot
	Usage UsageSnapshot `json:"usage"`
}

func (s *Service) AdminSnapshot() AdminSnapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	stats := s.stats
	if stats.UsageVersion != currentUsageVersion {
		stats.UsageDays = nil
	}
	return AdminSnapshot{Snapshot: s.snapshot(), Usage: buildUsage(stats, nowBeijing())}
}

func (s *Service) initializeUsage() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.stats.UsageVersion == currentUsageVersion {
		return false
	}
	archives, err := calcLogArchives(s.options.LogDir, s.options.LogFileName)
	if err != nil {
		s.logWarn("list archived calc logs failed", "error", err)
		return false
	}

	days := make(map[string]usageDay)
	now := nowBeijing()
	cutoff := usageCutoff(now)
	for _, path := range archives {
		if err := readUsageLog(path, -1, days, cutoff); err != nil {
			s.logWarn("backfill archived calc log failed", "file", path, "error", err)
			return false
		}
	}
	if offset := s.stats.Source.Offset; offset > 0 {
		path := filepath.Join(s.options.LogDir, s.options.LogFileName)
		if err := readUsageLog(path, offset, days, cutoff); err != nil && !errors.Is(err, os.ErrNotExist) {
			s.logWarn("backfill active calc log failed", "error", err)
			return false
		}
	}
	for key, existing := range s.stats.UsageDays {
		if key >= cutoff {
			existing.Buckets = days[key].Buckets
			days[key] = existing
		}
	}
	s.stats.UsageDays = days
	s.stats.UsageVersion = currentUsageVersion
	return true
}

func readUsageLog(path string, limit int64, days map[string]usageDay, cutoff string) error {
	reader, closeLog, err := openCalcLog(path)
	if err != nil {
		return err
	}
	defer closeLog()
	if limit >= 0 {
		reader = io.LimitReader(reader, limit)
	}
	return scanCalcLog(reader, &SourceSnapshot{}, func(event calcLogEvent) {
		if event.Status != "" {
			applyUsage(days, cutoff, event)
		}
	})
}

func applyUsage(days map[string]usageDay, cutoff string, event calcLogEvent) {
	if days == nil {
		return
	}
	eventTime, err := time.Parse(time.RFC3339Nano, event.Time)
	if err != nil {
		return
	}
	eventTime = eventTime.In(beijingLocation)
	key := eventTime.Format("2006-01-02")
	if key < cutoff {
		return
	}
	diff := event.LmdDiff
	if diff == 0 {
		diff = event.Target
	}
	day := days[key]
	day.Hours[eventTime.Hour()]++
	if diff != 0 && diff >= -maxUsageDiff && diff <= maxUsageDiff {
		amount := uint64(diff)
		if diff < 0 {
			amount = -amount
		}
		index := sort.Search(len(diffLimits), func(index int) bool { return amount <= diffLimits[index] })
		side := &day.Buckets[index].Gain
		if diff < 0 {
			side = &day.Buckets[index].Spend
		}
		side.Count++
		side.Amount += amount
	}
	if event.HasTargetLMD {
		if day.Targets == nil {
			day.Targets = make(map[int]int)
		}
		day.Targets[event.TargetLMD]++
	}
	days[key] = day
}

func usageCutoff(now time.Time) string {
	return now.AddDate(0, 0, -30).Format("2006-01-02")
}

func pruneUsageDays(days map[string]usageDay, now time.Time) {
	cutoff := usageCutoff(now)
	for key := range days {
		if key < cutoff {
			delete(days, key)
		}
	}
}

func cloneUsageDays(source map[string]usageDay) map[string]usageDay {
	if source == nil {
		return nil
	}
	days := make(map[string]usageDay, len(source))
	for key, day := range source {
		targets := make(map[int]int, len(day.Targets))
		for amount, count := range day.Targets {
			targets[amount] = count
		}
		day.Targets = targets
		days[key] = day
	}
	return days
}

func buildUsage(snapshot Snapshot, now time.Time) UsageSnapshot {
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekday := (int(today.Weekday()) + 6) % 7
	heatmap := make([]UsageHeatmapDay, 7)
	for offset := 0; offset < len(heatmap); offset++ {
		date := today.AddDate(0, 0, -offset)
		index := (int(date.Weekday()) + 6) % 7
		hourCount := 24
		if offset == 0 {
			hourCount = now.Hour() + 1
		}
		hours := make([]int, hourCount)
		dateKey := date.Format("2006-01-02")
		logHours := snapshot.UsageDays[dateKey].Hours
		for hour := range hours {
			hourKey := date.Add(time.Duration(hour) * time.Hour).Format("2006-01-02T15")
			hours[hour] = max(snapshot.ByHour[hourKey], logHours[hour])
		}
		heatmap[index] = UsageHeatmapDay{Date: dateKey, Weekday: index, Hours: hours}
	}
	return UsageSnapshot{
		Heatmap: heatmap,
		Periods: map[string]UsagePeriod{
			"day":   summarizeUsage(snapshot.UsageDays, today, today),
			"week":  summarizeUsage(snapshot.UsageDays, today.AddDate(0, 0, -weekday), today),
			"month": summarizeUsage(snapshot.UsageDays, today.AddDate(0, 0, 1-today.Day()), today),
		},
	}
}

func summarizeUsage(days map[string]usageDay, start, end time.Time) UsagePeriod {
	const rankingLimit = 10
	period := UsagePeriod{
		StartDate:  start.Format("2006-01-02"),
		EndDate:    end.Format("2006-01-02"),
		Buckets:    make([]UsageBucket, len(diffLimits)),
		TopTargets: make([]RankedTarget, 0, rankingLimit),
	}
	minimum := uint64(1)
	for index, limit := range diffLimits {
		period.Buckets[index] = UsageBucket{Min: minimum, Max: limit}
		minimum = limit + 1
	}

	targets := make(map[int]int)
	for date := start; !date.After(end); date = date.AddDate(0, 0, 1) {
		day := days[date.Format("2006-01-02")]
		for index, pair := range day.Buckets {
			period.Buckets[index].add(pair)
			period.Totals.add(pair)
		}
		for amount, count := range day.Targets {
			targets[amount] += count
		}
	}
	for amount, count := range targets {
		top := period.TopTargets
		index := sort.Search(len(top), func(index int) bool {
			entry := top[index]
			return count > entry.Count || (count == entry.Count && amount < entry.Amount)
		})
		if index == rankingLimit {
			continue
		}
		if len(top) < rankingLimit {
			top = append(top, RankedTarget{})
		}
		copy(top[index+1:], top[index:])
		top[index] = RankedTarget{Amount: amount, Count: count}
		period.TopTargets = top
	}
	return period
}

func (pair *UsagePair) add(other UsagePair) {
	pair.Gain.Count += other.Gain.Count
	pair.Gain.Amount += other.Gain.Amount
	pair.Spend.Count += other.Spend.Count
	pair.Spend.Amount += other.Spend.Amount
}
