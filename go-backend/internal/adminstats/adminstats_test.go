package adminstats

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

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
