package adminstats

import (
	"compress/gzip"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestUsageBackfillsAndPersistsWithoutDoubleCounting(t *testing.T) {
	dir := t.TempDir()
	now := nowBeijing()
	yesterday := now.AddDate(0, 0, -1)
	active := filepath.Join(dir, defaultLogFileName)
	archive := active + ".2.gz"
	event := func(at time.Time, diff, target int, hasTarget bool) string {
		return fmt.Sprintf("{\"time\":%q,\"status\":\"success\",\"lmd_diff\":%d,\"target_lmd\":%d,\"has_target_lmd\":%t}\n",
			at.Format(time.RFC3339), diff, target, hasTarget)
	}
	file, err := os.Create(archive)
	if err != nil {
		t.Fatal(err)
	}
	zip := gzip.NewWriter(file)
	if _, err := zip.Write([]byte(event(yesterday, 5_000, 20, true))); err != nil {
		t.Fatal(err)
	}
	if err := zip.Close(); err != nil {
		t.Fatal(err)
	}
	if err := file.Close(); err != nil {
		t.Fatal(err)
	}
	activeEvents := event(now, -100, 0, true) + event(now, 99, 0, false) + event(now, 0, 0, true) +
		event(now, -5_000, 0, false) + event(now, 5_001, 0, false) + event(now, -5_001, 0, false)
	if err := os.WriteFile(active, []byte(activeEvents), 0644); err != nil {
		t.Fatal(err)
	}

	service, err := New(Options{LogDir: dir, RecentLimit: 1})
	if err != nil {
		t.Fatal(err)
	}
	usage := buildUsage(service.stats, now)
	day := usage.Periods["day"]
	if day.Buckets[0].Gain != (UsageSide{Count: 1, Amount: 99}) ||
		day.Buckets[1].Spend != (UsageSide{Count: 1, Amount: 100}) ||
		day.Buckets[4].Max != 5_000 || day.Buckets[4].Spend != (UsageSide{Count: 1, Amount: 5_000}) ||
		day.Totals.Gain.Count != 1 || day.Totals.Spend.Count != 2 ||
		len(day.TopTargets) != 1 || day.TopTargets[0] != (RankedTarget{Amount: 0, Count: 2}) {
		t.Fatalf("unexpected daily usage: %+v", day)
	}
	archivedDay := (int(yesterday.Weekday()) + 6) % 7
	if got := usage.Heatmap[archivedDay].Hours[yesterday.Hour()]; got != 1 {
		t.Fatalf("archived heatmap count = %d, want 1", got)
	}
	if len(service.Snapshot().UsageDays) != 0 {
		t.Fatal("internal usage days leaked from base snapshot")
	}

	if err := os.WriteFile(active, []byte(activeEvents+event(now, 101, 5, true)), 0644); err != nil {
		t.Fatal(err)
	}
	reopened, err := New(Options{LogDir: dir})
	if err != nil {
		t.Fatal(err)
	}
	day = buildUsage(reopened.stats, now).Periods["day"]
	if day.Totals.Gain != (UsageSide{Count: 2, Amount: 200}) || len(day.TopTargets) != 2 || day.TopTargets[0].Count != 2 {
		t.Fatalf("unexpected daily usage after restart: %+v", day)
	}

	dayKey := now.Format("2006-01-02")
	oldDay := reopened.stats.UsageDays[dayKey]
	oldDay.Buckets[4].Gain = UsageSide{Count: 1, Amount: 100_000}
	reopened.stats.UsageDays[dayKey] = oldDay
	reopened.stats.UsageVersion = 0
	if err := reopened.Flush(); err != nil {
		t.Fatal(err)
	}
	migrated, err := New(Options{LogDir: dir})
	if err != nil {
		t.Fatal(err)
	}
	migratedDay := buildUsage(migrated.stats, now).Periods["day"]
	if migratedDay.Totals != day.Totals || migrated.stats.Totals != reopened.stats.Totals {
		t.Fatalf("unexpected totals after changing bucket limits: %+v", migratedDay)
	}
}

func TestServiceAggregatesIncrementalLog(t *testing.T) {
	dir := t.TempDir()
	logPath := filepath.Join(dir, defaultLogFileName)
	lines := []string{
		`{"time":"2026-05-24T10:00:00+08:00","event":"calc_finished","lmd_diff":21,"calc_mode":"fast","cache":"miss","duration_ms":42,"paths_count":3,"status":"success","ip_hash":"abc"}`,
		`{"time":"2026-05-24T11:00:00+08:00","event":"calc_finished","lmd_diff":5,"calc_mode":"strong","cache":"hit","duration_ms":8,"paths_count":1,"status":"success","ip_hash":"def"}`,
		`{"time":"2026-05-24T12:00:00+08:00","event":"calc_rejected","lmd_diff":0,"calc_mode":"fast","cache":"miss","duration_ms":2,"paths_count":0,"status":"bad_request","error_type":"invalid_json","ip_hash":"ghi"}`,
	}
	if err := os.WriteFile(logPath, []byte(lines[0]+"\n"+lines[1]+"\n"+lines[2]+"\n"), 0644); err != nil {
		t.Fatal(err)
	}

	service, err := New(Options{LogDir: dir})
	if err != nil {
		t.Fatal(err)
	}

	snapshot := service.Snapshot()
	if snapshot.Totals.Calculations != 3 {
		t.Fatalf("calculations = %d, want 3", snapshot.Totals.Calculations)
	}
	if snapshot.Totals.Success != 2 || snapshot.Totals.BadRequest != 1 {
		t.Fatalf("unexpected totals: %+v", snapshot.Totals)
	}
	if snapshot.Totals.CacheHit != 1 || snapshot.Totals.CacheMiss != 2 {
		t.Fatalf("unexpected cache totals: %+v", snapshot.Totals)
	}
	hourMetric := snapshot.ByHourDetail["2026-05-24T10"]
	if hourMetric.Count != 1 || hourMetric.Fast != 1 || hourMetric.CacheMiss != 1 || hourMetric.DurationTotalMs != 42 || hourMetric.DurationCount != 1 {
		t.Fatalf("unexpected hour metric: %+v", hourMetric)
	}
	strongHourMetric := snapshot.ByHourDetail["2026-05-24T11"]
	if strongHourMetric.Count != 1 || strongHourMetric.Boost != 1 {
		t.Fatalf("expected strong mode to count as boost metric: %+v", strongHourMetric)
	}
	dayMetric := snapshot.ByDayDetail["2026-05-24"]
	if dayMetric.Count != 3 || dayMetric.Success != 2 || dayMetric.BadRequest != 1 || dayMetric.Fast != 2 || dayMetric.Boost != 1 || dayMetric.DurationTotalMs != 52 || dayMetric.DurationCount != 3 {
		t.Fatalf("unexpected day metric: %+v", dayMetric)
	}
	monthMetric := snapshot.ByMonthDetail["2026-05"]
	if monthMetric.Count != 3 || monthMetric.CacheHit != 1 || monthMetric.CacheMiss != 2 {
		t.Fatalf("unexpected month metric: %+v", monthMetric)
	}
	if snapshot.ModeCounts["fast"] != 2 || snapshot.ModeCounts["strong"] != 1 {
		t.Fatalf("unexpected mode counts: %+v", snapshot.ModeCounts)
	}
	if len(snapshot.RecentEvents) != 3 || snapshot.RecentEvents[0].Status != "bad_request" {
		t.Fatalf("unexpected recent events: %+v", snapshot.RecentEvents)
	}

	if changed := service.Update(); changed {
		t.Fatal("second update should not re-aggregate unchanged log")
	}
}

func TestServiceRebuildsOldSnapshotVersion(t *testing.T) {
	dir := t.TempDir()
	logPath := filepath.Join(dir, defaultLogFileName)
	lines := []string{
		`{"time":"2026-05-24T10:00:00+08:00","event":"calc_finished","lmd_diff":1,"calc_mode":"fast","cache":"miss","duration_ms":10,"paths_count":1,"status":"success"}`,
		`{"time":"2026-05-24T11:00:00+08:00","event":"calc_finished","lmd_diff":2,"calc_mode":"strong","cache":"miss","duration_ms":20,"paths_count":2,"status":"success"}`,
	}
	if err := os.WriteFile(logPath, []byte(lines[0]+"\n"+lines[1]+"\n"), 0644); err != nil {
		t.Fatal(err)
	}

	oldSnapshot := newSnapshot(defaultLogFileName)
	oldSnapshot.Version = 1
	oldSnapshot.Source = SourceSnapshot{File: defaultLogFileName, Offset: int64(len(lines[0]) + len(lines[1]) + 2), Size: int64(len(lines[0]) + len(lines[1]) + 2)}
	oldSnapshot.Totals.Calculations = 2
	oldSnapshot.ByDay["2026-05-24"] = 2
	oldSnapshot.ByDayDetail["2026-05-24"] = MetricSnapshot{Count: 2, Fast: 2}
	oldSnapshot.ModeCounts["fast"] = 1
	oldSnapshot.ModeCounts["strong"] = 1
	bytes, err := json.Marshal(oldSnapshot)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, defaultStatsFileName), bytes, 0644); err != nil {
		t.Fatal(err)
	}

	service, err := New(Options{LogDir: dir})
	if err != nil {
		t.Fatal(err)
	}

	snapshot := service.Snapshot()
	if snapshot.Version != currentStatsVersion {
		t.Fatalf("version = %d, want %d", snapshot.Version, currentStatsVersion)
	}
	dayMetric := snapshot.ByDayDetail["2026-05-24"]
	if dayMetric.Fast != 1 || dayMetric.Boost != 1 {
		t.Fatalf("expected rebuilt strong event to count as boost metric, got %+v", dayMetric)
	}
	if snapshot.ModeCounts["fast"] != 1 || snapshot.ModeCounts["strong"] != 1 {
		t.Fatalf("unexpected mode counts after rebuild: %+v", snapshot.ModeCounts)
	}
}

func TestServicePersistsAndHandlesRotatedLog(t *testing.T) {
	dir := t.TempDir()
	logPath := filepath.Join(dir, defaultLogFileName)
	firstLine := `{"time":"2026-05-24T10:00:00+08:00","event":"calc_finished","lmd_diff":1,"calc_mode":"fast","cache":"miss","duration_ms":10,"paths_count":1,"status":"success","padding":"this field only makes the pre-rotate file longer"}`
	if err := os.WriteFile(logPath, []byte(firstLine+"\n"+firstLine+"\n"), 0644); err != nil {
		t.Fatal(err)
	}

	service, err := New(Options{LogDir: dir})
	if err != nil {
		t.Fatal(err)
	}
	if err := service.Flush(); err != nil {
		t.Fatal(err)
	}

	statsBytes, err := os.ReadFile(filepath.Join(dir, defaultStatsFileName))
	if err != nil {
		t.Fatal(err)
	}
	var persisted Snapshot
	if err := json.Unmarshal(statsBytes, &persisted); err != nil {
		t.Fatal(err)
	}
	if persisted.Source.Offset == 0 {
		t.Fatal("expected persisted offset")
	}

	if err := os.WriteFile(logPath, []byte(`{"time":"2026-05-24T11:00:00+08:00","event":"calc_failed","lmd_diff":2,"calc_mode":"boost","cache":"miss","duration_ms":100,"paths_count":0,"status":"timeout","error_type":"timeout"}`+"\n"), 0644); err != nil {
		t.Fatal(err)
	}
	if changed := service.Update(); !changed {
		t.Fatal("rotated shorter log should be read from beginning")
	}

	snapshot := service.Snapshot()
	if snapshot.Totals.Calculations != 3 || snapshot.Totals.Success != 2 || snapshot.Totals.Timeout != 1 {
		t.Fatalf("unexpected totals after rotation: %+v", snapshot.Totals)
	}
}

func TestServiceRecoversUnreadRotationsAfterRestart(t *testing.T) {
	dir := t.TempDir()
	logPath := filepath.Join(dir, defaultLogFileName)
	now := nowBeijing()
	event := func(diff int) string {
		return fmt.Sprintf(`{"time":%q,"status":"success","lmd_diff":%d,"target_lmd":100,"has_target_lmd":true}`+"\n",
			now.Format(time.RFC3339), diff)
	}
	write := func(path, data string) {
		t.Helper()
		if err := os.WriteFile(path, []byte(data), 0644); err != nil {
			t.Fatal(err)
		}
	}
	write(logPath, event(10))
	options := Options{LogDir: dir}
	if _, err := New(options); err != nil {
		t.Fatal(err)
	}

	file, err := os.Create(logPath + ".2.gz")
	if err != nil {
		t.Fatal(err)
	}
	compressed := gzip.NewWriter(file)
	if _, err := compressed.Write([]byte(event(10) + event(20))); err != nil {
		t.Fatal(err)
	}
	if err := compressed.Close(); err != nil {
		t.Fatal(err)
	}
	if err := file.Close(); err != nil {
		t.Fatal(err)
	}
	write(logPath+".1", event(30))
	incomplete := event(50)
	partial := len(incomplete) / 2
	write(logPath, event(40)+incomplete[:partial])

	service, err := New(options)
	if err != nil {
		t.Fatal(err)
	}
	requireTotals := func(service *Service, want UsageSide) {
		t.Helper()
		if got := service.Snapshot().Totals.Calculations; got != want.Count {
			t.Fatalf("calculations = %d, want %d", got, want.Count)
		}
		daily := buildUsage(service.stats, now).Periods["day"]
		if daily.Totals.Gain != want || len(daily.TopTargets) != 1 || daily.TopTargets[0].Count != want.Count {
			t.Fatalf("daily usage = %+v, want %+v", daily, want)
		}
	}
	requireTotals(service, UsageSide{Count: 4, Amount: 100})
	if got := service.Snapshot().Source.Offset; got != int64(len(event(40))) {
		t.Fatalf("offset = %d, want end of last complete line", got)
	}
	write(logPath, event(40)+incomplete)
	service.Update()
	requireTotals(service, UsageSide{Count: 5, Amount: 150})
	if err := service.Flush(); err != nil {
		t.Fatal(err)
	}
	reopened, err := New(options)
	if err != nil {
		t.Fatal(err)
	}
	requireTotals(reopened, UsageSide{Count: 5, Amount: 150})
}

func TestTopTargetsKeepsTenAndBreaksTiesByAmount(t *testing.T) {
	now := nowBeijing()
	today := now.Format("2006-01-02")
	yesterday := now.AddDate(0, 0, -1).Format("2006-01-02")
	targets := make(map[int]int)
	for amount := 1; amount <= 20; amount++ {
		targets[amount] = 1
	}
	days := map[string]usageDay{
		today:     {Targets: targets},
		yesterday: {Targets: map[int]int{20: 1}},
	}
	rank := summarizeUsage(days, now.AddDate(0, 0, -1), now).TopTargets
	if len(rank) != 10 || rank[0] != (RankedTarget{Amount: 20, Count: 2}) {
		t.Fatalf("unexpected ranking: %+v", rank)
	}
	for index := 1; index < len(rank); index++ {
		if rank[index] != (RankedTarget{Amount: index, Count: 1}) {
			t.Fatalf("unexpected rank %d: %+v", index+1, rank[index])
		}
	}
}
