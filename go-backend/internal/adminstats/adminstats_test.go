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
		`{"time":"2026-05-24T11:00:00+08:00","event":"calc_finished","lmd_diff":5,"calc_mode":"boost","cache":"hit","duration_ms":8,"paths_count":1,"status":"success","ip_hash":"def"}`,
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
	if snapshot.ModeCounts["fast"] != 2 || snapshot.ModeCounts["boost"] != 1 {
		t.Fatalf("unexpected mode counts: %+v", snapshot.ModeCounts)
	}
	if len(snapshot.RecentEvents) != 3 || snapshot.RecentEvents[0].Status != "bad_request" {
		t.Fatalf("unexpected recent events: %+v", snapshot.RecentEvents)
	}

	if changed := service.Update(); changed {
		t.Fatal("second update should not re-aggregate unchanged log")
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
