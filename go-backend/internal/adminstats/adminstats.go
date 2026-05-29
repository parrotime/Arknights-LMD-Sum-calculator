package adminstats

import (
	"bufio"
	"encoding/json"
	"errors"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

const (
	defaultLogFileName   = "calc-events.log"
	defaultStatsFileName = "admin-stats.json"
	defaultInterval      = 2 * time.Minute
	defaultRecentLimit   = 50
	currentStatsVersion  = 2
)

type Options struct {
	LogDir        string
	LogFileName   string
	StatsFileName string
	Interval      time.Duration
	RecentLimit   int
	Logger        *slog.Logger
}

type Service struct {
	mu       sync.RWMutex
	flushMu  sync.Mutex
	options  Options
	stats    Snapshot
	logger   *slog.Logger
	stopOnce sync.Once
	done     chan struct{}
}

type Snapshot struct {
	Version       int                       `json:"version"`
	UpdatedAt     string                    `json:"updatedAt"`
	Source        SourceSnapshot            `json:"source"`
	Totals        TotalsSnapshot            `json:"totals"`
	ByHour        map[string]int            `json:"byHour"`
	ByHourDetail  map[string]MetricSnapshot `json:"byHourDetail"`
	ByDay         map[string]int            `json:"byDay"`
	ByDayDetail   map[string]MetricSnapshot `json:"byDayDetail"`
	ByMonth       map[string]int            `json:"byMonth"`
	ByMonthDetail map[string]MetricSnapshot `json:"byMonthDetail"`
	ModeCounts    map[string]int            `json:"modeCounts"`
	StatusCounts  map[string]int            `json:"statusCounts"`
	RecentEvents  []RecentEvent             `json:"recentEvents"`
	Series        SeriesSnapshot            `json:"series"`
}

type SourceSnapshot struct {
	File   string `json:"file"`
	Offset int64  `json:"offset"`
	Size   int64  `json:"size"`
}

type TotalsSnapshot struct {
	Calculations    int   `json:"calculations"`
	Success         int   `json:"success"`
	Timeout         int   `json:"timeout"`
	QueueFull       int   `json:"queueFull"`
	BadRequest      int   `json:"badRequest"`
	Error           int   `json:"error"`
	CacheHit        int   `json:"cacheHit"`
	CacheMiss       int   `json:"cacheMiss"`
	DurationTotalMs int64 `json:"durationTotalMs"`
}

type MetricSnapshot struct {
	Count           int   `json:"count"`
	Success         int   `json:"success"`
	Timeout         int   `json:"timeout"`
	QueueFull       int   `json:"queueFull"`
	BadRequest      int   `json:"badRequest"`
	Error           int   `json:"error"`
	CacheHit        int   `json:"cacheHit"`
	CacheMiss       int   `json:"cacheMiss"`
	DurationTotalMs int64 `json:"durationTotalMs"`
	DurationCount   int   `json:"durationCount"`
	Fast            int   `json:"fast"`
	Boost           int   `json:"boost"`
}

type SeriesSnapshot struct {
	Last24Hours  []SeriesPoint `json:"last24Hours"`
	Last7Days    []SeriesPoint `json:"last7Days"`
	Last30Days   []SeriesPoint `json:"last30Days"`
	Last12Months []SeriesPoint `json:"last12Months"`
}

type SeriesPoint struct {
	Key             string `json:"key"`
	Label           string `json:"label"`
	Count           int    `json:"count"`
	Success         int    `json:"success"`
	Timeout         int    `json:"timeout"`
	QueueFull       int    `json:"queueFull"`
	BadRequest      int    `json:"badRequest"`
	Error           int    `json:"error"`
	CacheHit        int    `json:"cacheHit"`
	CacheMiss       int    `json:"cacheMiss"`
	DurationTotalMs int64  `json:"durationTotalMs"`
	DurationCount   int    `json:"durationCount"`
	Fast            int    `json:"fast"`
	Boost           int    `json:"boost"`
}

type RecentEvent struct {
	Time       string `json:"time"`
	Event      string `json:"event"`
	LmdDiff    int    `json:"lmdDiff"`
	CalcMode   string `json:"calcMode"`
	Cache      string `json:"cache"`
	DurationMs int64  `json:"durationMs"`
	PathsCount int    `json:"pathsCount"`
	Status     string `json:"status"`
	ErrorType  string `json:"errorType,omitempty"`
}

type calcLogEvent struct {
	Time       string `json:"time"`
	Event      string `json:"event"`
	LmdDiff    int    `json:"lmd_diff"`
	Target     int    `json:"target"`
	CalcMode   string `json:"calc_mode"`
	Cache      string `json:"cache"`
	DurationMs int64  `json:"duration_ms"`
	PathsCount int    `json:"paths_count"`
	Status     string `json:"status"`
	ErrorType  string `json:"error_type"`
	IPHash     string `json:"ip_hash"`
}

func New(options Options) (*Service, error) {
	if options.LogDir == "" {
		options.LogDir = "logs"
	}
	if options.LogFileName == "" {
		options.LogFileName = defaultLogFileName
	}
	if options.StatsFileName == "" {
		options.StatsFileName = defaultStatsFileName
	}
	if options.Interval <= 0 {
		options.Interval = defaultInterval
	}
	if options.RecentLimit <= 0 {
		options.RecentLimit = defaultRecentLimit
	}
	if err := os.MkdirAll(options.LogDir, 0755); err != nil {
		return nil, err
	}

	service := &Service{
		options: options,
		logger:  options.Logger,
		stats:   newSnapshot(options.LogFileName),
		done:    make(chan struct{}),
	}
	if err := service.load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		service.logWarn("load admin stats snapshot failed", "error", err)
	}
	changed := false
	if service.shouldRebuildSnapshot() {
		changed = service.Rebuild()
	} else {
		changed = service.Update()
	}
	if changed {
		if err := service.Flush(); err != nil {
			service.logWarn("flush admin stats snapshot failed", "error", err)
		}
	}
	return service, nil
}

func (s *Service) Start(stop <-chan struct{}) {
	ticker := time.NewTicker(s.options.Interval)
	go func() {
		defer ticker.Stop()
		defer close(s.done)
		for {
			select {
			case <-stop:
				_ = s.Flush()
				return
			case <-ticker.C:
				if changed := s.Update(); changed {
					if err := s.Flush(); err != nil {
						s.logWarn("flush admin stats snapshot failed", "error", err)
					}
				}
			}
		}
	}()
}

func (s *Service) Stop(stop chan<- struct{}) {
	s.stopOnce.Do(func() {
		close(stop)
		<-s.done
	})
}

func (s *Service) Snapshot() Snapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	snapshot := s.stats
	snapshot.ByHour = cloneMap(s.stats.ByHour)
	snapshot.ByHourDetail = cloneMetricMap(s.stats.ByHourDetail)
	snapshot.ByDay = cloneMap(s.stats.ByDay)
	snapshot.ByDayDetail = cloneMetricMap(s.stats.ByDayDetail)
	snapshot.ByMonth = cloneMap(s.stats.ByMonth)
	snapshot.ByMonthDetail = cloneMetricMap(s.stats.ByMonthDetail)
	snapshot.ModeCounts = cloneMap(s.stats.ModeCounts)
	snapshot.StatusCounts = cloneMap(s.stats.StatusCounts)
	snapshot.RecentEvents = append([]RecentEvent(nil), s.stats.RecentEvents...)
	snapshot.Series = buildSeries(snapshot)
	return snapshot
}

func (s *Service) Update() bool {
	logPath := filepath.Join(s.options.LogDir, s.options.LogFileName)
	info, err := os.Stat(logPath)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			s.logWarn("stat calc log failed", "error", err, "path", logPath)
		}
		return false
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	offset := s.stats.Source.Offset
	if info.Size() < offset {
		offset = 0
	}
	if info.Size() == offset {
		s.stats.Source.Size = info.Size()
		return false
	}

	file, err := os.Open(logPath)
	if err != nil {
		s.logWarn("open calc log failed", "error", err, "path", logPath)
		return false
	}
	defer file.Close()

	if _, err := file.Seek(offset, 0); err != nil {
		s.logWarn("seek calc log failed", "error", err, "path", logPath, "offset", offset)
		return false
	}

	reader := bufio.NewReader(file)
	scanner := bufio.NewScanner(reader)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	readOffset := offset
	changed := false
	for scanner.Scan() {
		line := scanner.Bytes()
		readOffset += int64(len(line)) + 1
		var event calcLogEvent
		if err := json.Unmarshal(line, &event); err != nil {
			continue
		}
		if applyEvent(&s.stats, event, s.options.RecentLimit) {
			changed = true
		}
	}
	if err := scanner.Err(); err != nil {
		s.logWarn("scan calc log failed", "error", err, "path", logPath)
		return changed
	}
	if readOffset > info.Size() {
		readOffset = info.Size()
	}

	s.stats.Source = SourceSnapshot{
		File:   s.options.LogFileName,
		Offset: readOffset,
		Size:   info.Size(),
	}
	s.stats.UpdatedAt = time.Now().Format(time.RFC3339)
	return true
}

func (s *Service) Rebuild() bool {
	logPath := filepath.Join(s.options.LogDir, s.options.LogFileName)
	info, err := os.Stat(logPath)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			s.logWarn("stat calc log failed", "error", err, "path", logPath)
		}
		return false
	}

	file, err := os.Open(logPath)
	if err != nil {
		s.logWarn("open calc log failed", "error", err, "path", logPath)
		return false
	}
	defer file.Close()

	next := newSnapshot(s.options.LogFileName)
	reader := bufio.NewReader(file)
	scanner := bufio.NewScanner(reader)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	readOffset := int64(0)
	changed := false
	for scanner.Scan() {
		line := scanner.Bytes()
		readOffset += int64(len(line)) + 1
		var event calcLogEvent
		if err := json.Unmarshal(line, &event); err != nil {
			continue
		}
		if applyEvent(&next, event, s.options.RecentLimit) {
			changed = true
		}
	}
	if err := scanner.Err(); err != nil {
		s.logWarn("scan calc log failed", "error", err, "path", logPath)
		return false
	}
	if readOffset > info.Size() {
		readOffset = info.Size()
	}
	next.Source = SourceSnapshot{
		File:   s.options.LogFileName,
		Offset: readOffset,
		Size:   info.Size(),
	}
	next.UpdatedAt = time.Now().Format(time.RFC3339)

	s.mu.Lock()
	s.stats = next
	s.mu.Unlock()
	return changed
}

func (s *Service) Flush() error {
	s.flushMu.Lock()
	defer s.flushMu.Unlock()

	s.mu.RLock()
	payload := s.stats
	payload.ByHour = cloneMap(s.stats.ByHour)
	payload.ByHourDetail = cloneMetricMap(s.stats.ByHourDetail)
	payload.ByDay = cloneMap(s.stats.ByDay)
	payload.ByDayDetail = cloneMetricMap(s.stats.ByDayDetail)
	payload.ByMonth = cloneMap(s.stats.ByMonth)
	payload.ByMonthDetail = cloneMetricMap(s.stats.ByMonthDetail)
	payload.ModeCounts = cloneMap(s.stats.ModeCounts)
	payload.StatusCounts = cloneMap(s.stats.StatusCounts)
	payload.RecentEvents = append([]RecentEvent(nil), s.stats.RecentEvents...)
	s.mu.RUnlock()

	bytes, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return err
	}
	path := filepath.Join(s.options.LogDir, s.options.StatsFileName)
	tmpPath := path + ".tmp"
	if err := os.WriteFile(tmpPath, bytes, 0644); err != nil {
		return err
	}
	return os.Rename(tmpPath, path)
}

func (s *Service) load() error {
	path := filepath.Join(s.options.LogDir, s.options.StatsFileName)
	bytes, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	var snapshot Snapshot
	if err := json.Unmarshal(bytes, &snapshot); err != nil {
		return err
	}
	normalizeSnapshot(&snapshot, s.options.LogFileName)
	s.mu.Lock()
	s.stats = snapshot
	s.mu.Unlock()
	return nil
}

func newSnapshot(logFileName string) Snapshot {
	now := time.Now().Format(time.RFC3339)
	snapshot := Snapshot{
		Version:       currentStatsVersion,
		UpdatedAt:     now,
		Source:        SourceSnapshot{File: logFileName},
		ByHour:        map[string]int{},
		ByHourDetail:  map[string]MetricSnapshot{},
		ByDay:         map[string]int{},
		ByDayDetail:   map[string]MetricSnapshot{},
		ByMonth:       map[string]int{},
		ByMonthDetail: map[string]MetricSnapshot{},
		ModeCounts:    map[string]int{},
		StatusCounts:  map[string]int{},
	}
	return snapshot
}

func normalizeSnapshot(snapshot *Snapshot, logFileName string) {
	if snapshot.Version == 0 {
		snapshot.Version = 1
	}
	if snapshot.UpdatedAt == "" {
		snapshot.UpdatedAt = time.Now().Format(time.RFC3339)
	}
	if snapshot.Source.File == "" {
		snapshot.Source.File = logFileName
	}
	if snapshot.ByHour == nil {
		snapshot.ByHour = map[string]int{}
	}
	if snapshot.ByHourDetail == nil {
		snapshot.ByHourDetail = map[string]MetricSnapshot{}
	}
	for key, count := range snapshot.ByHour {
		metric := snapshot.ByHourDetail[key]
		if metric.Count == 0 && count > 0 {
			metric.Count = count
			snapshot.ByHourDetail[key] = metric
		}
	}
	if snapshot.ByDay == nil {
		snapshot.ByDay = map[string]int{}
	}
	if snapshot.ByDayDetail == nil {
		snapshot.ByDayDetail = map[string]MetricSnapshot{}
	}
	for key, count := range snapshot.ByDay {
		metric := snapshot.ByDayDetail[key]
		if metric.Count == 0 && count > 0 {
			metric.Count = count
			snapshot.ByDayDetail[key] = metric
		}
	}
	if snapshot.ByMonth == nil {
		snapshot.ByMonth = map[string]int{}
	}
	if snapshot.ByMonthDetail == nil {
		snapshot.ByMonthDetail = map[string]MetricSnapshot{}
	}
	for key, count := range snapshot.ByMonth {
		metric := snapshot.ByMonthDetail[key]
		if metric.Count == 0 && count > 0 {
			metric.Count = count
			snapshot.ByMonthDetail[key] = metric
		}
	}
	if snapshot.ModeCounts == nil {
		snapshot.ModeCounts = map[string]int{}
	}
	if snapshot.StatusCounts == nil {
		snapshot.StatusCounts = map[string]int{}
	}
}

func (s *Service) shouldRebuildSnapshot() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.stats.Version < currentStatsVersion
}

func applyEvent(snapshot *Snapshot, event calcLogEvent, recentLimit int) bool {
	if event.Status == "" {
		return false
	}

	eventTime := parseEventTime(event.Time)
	hourKey := eventTime.Format("2006-01-02T15")
	dayKey := eventTime.Format("2006-01-02")
	monthKey := eventTime.Format("2006-01")

	snapshot.Totals.Calculations++
	snapshot.ByHour[hourKey]++
	applyMetric(snapshot.ByHourDetail, hourKey, event)
	snapshot.ByDay[dayKey]++
	applyMetric(snapshot.ByDayDetail, dayKey, event)
	snapshot.ByMonth[monthKey]++
	applyMetric(snapshot.ByMonthDetail, monthKey, event)

	mode := event.CalcMode
	if mode == "" {
		mode = "fast"
	}
	snapshot.ModeCounts[mode]++
	snapshot.StatusCounts[event.Status]++
	switch event.Status {
	case "success":
		snapshot.Totals.Success++
	case "timeout":
		snapshot.Totals.Timeout++
	case "queue_full":
		snapshot.Totals.QueueFull++
	case "bad_request":
		snapshot.Totals.BadRequest++
	default:
		snapshot.Totals.Error++
	}
	switch event.Cache {
	case "hit":
		snapshot.Totals.CacheHit++
	case "miss":
		snapshot.Totals.CacheMiss++
	}
	if event.DurationMs > 0 {
		snapshot.Totals.DurationTotalMs += event.DurationMs
	}
	if event.LmdDiff == 0 {
		event.LmdDiff = event.Target
	}

	recent := RecentEvent{
		Time:       eventTime.Format(time.RFC3339),
		Event:      event.Event,
		LmdDiff:    event.LmdDiff,
		CalcMode:   mode,
		Cache:      event.Cache,
		DurationMs: event.DurationMs,
		PathsCount: event.PathsCount,
		Status:     event.Status,
		ErrorType:  event.ErrorType,
	}
	snapshot.RecentEvents = append([]RecentEvent{recent}, snapshot.RecentEvents...)
	if len(snapshot.RecentEvents) > recentLimit {
		snapshot.RecentEvents = snapshot.RecentEvents[:recentLimit]
	}
	return true
}

func applyMetric(values map[string]MetricSnapshot, key string, event calcLogEvent) {
	metric := values[key]
	metric.Count++
	switch event.Status {
	case "success":
		metric.Success++
	case "timeout":
		metric.Timeout++
	case "queue_full":
		metric.QueueFull++
	case "bad_request":
		metric.BadRequest++
	default:
		metric.Error++
	}
	switch event.Cache {
	case "hit":
		metric.CacheHit++
	case "miss":
		metric.CacheMiss++
	}
	if event.DurationMs > 0 {
		metric.DurationTotalMs += event.DurationMs
		metric.DurationCount++
	}
	mode := event.CalcMode
	if mode == "" {
		mode = "fast"
	}
	switch mode {
	case "boost", "strong":
		metric.Boost++
	default:
		metric.Fast++
	}
	values[key] = metric
}

func parseEventTime(raw string) time.Time {
	if raw == "" {
		return time.Now()
	}
	if value, err := time.Parse(time.RFC3339Nano, raw); err == nil {
		return value
	}
	if value, err := time.Parse(time.RFC3339, raw); err == nil {
		return value
	}
	return time.Now()
}

func buildSeries(snapshot Snapshot) SeriesSnapshot {
	now := time.Now()
	return SeriesSnapshot{
		Last24Hours:  buildHourSeries(snapshot.ByHour, snapshot.ByHourDetail, now, 24),
		Last7Days:    buildDaySeries(snapshot.ByDay, snapshot.ByDayDetail, now, 7),
		Last30Days:   buildDaySeries(snapshot.ByDay, snapshot.ByDayDetail, now, 30),
		Last12Months: buildMonthSeries(snapshot.ByMonth, snapshot.ByMonthDetail, now, 12),
	}
}

func buildHourSeries(values map[string]int, detailValues map[string]MetricSnapshot, now time.Time, count int) []SeriesPoint {
	points := make([]SeriesPoint, 0, count)
	start := now.Add(-time.Duration(count-1) * time.Hour)
	for i := 0; i < count; i++ {
		current := start.Add(time.Duration(i) * time.Hour)
		key := current.Format("2006-01-02T15")
		metric := detailValues[key]
		if metric.Count == 0 && values[key] > 0 {
			metric.Count = values[key]
		}
		points = append(points, metricToSeriesPoint(key, current.Format("15:00"), metric))
	}
	return points
}

func buildDaySeries(values map[string]int, detailValues map[string]MetricSnapshot, now time.Time, count int) []SeriesPoint {
	points := make([]SeriesPoint, 0, count)
	start := now.AddDate(0, 0, -(count - 1))
	for i := 0; i < count; i++ {
		current := start.AddDate(0, 0, i)
		key := current.Format("2006-01-02")
		metric := detailValues[key]
		if metric.Count == 0 && values[key] > 0 {
			metric.Count = values[key]
		}
		points = append(points, metricToSeriesPoint(key, current.Format("01-02"), metric))
	}
	return points
}

func buildMonthSeries(values map[string]int, detailValues map[string]MetricSnapshot, now time.Time, count int) []SeriesPoint {
	points := make([]SeriesPoint, 0, count)
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -(count - 1), 0)
	for i := 0; i < count; i++ {
		current := start.AddDate(0, i, 0)
		key := current.Format("2006-01")
		metric := detailValues[key]
		if metric.Count == 0 && values[key] > 0 {
			metric.Count = values[key]
		}
		points = append(points, metricToSeriesPoint(key, current.Format("2006-01"), metric))
	}
	return points
}

func metricToSeriesPoint(key string, label string, metric MetricSnapshot) SeriesPoint {
	return SeriesPoint{
		Key:             key,
		Label:           label,
		Count:           metric.Count,
		Success:         metric.Success,
		Timeout:         metric.Timeout,
		QueueFull:       metric.QueueFull,
		BadRequest:      metric.BadRequest,
		Error:           metric.Error,
		CacheHit:        metric.CacheHit,
		CacheMiss:       metric.CacheMiss,
		DurationTotalMs: metric.DurationTotalMs,
		DurationCount:   metric.DurationCount,
		Fast:            metric.Fast,
		Boost:           metric.Boost,
	}
}

func cloneMap(source map[string]int) map[string]int {
	if source == nil {
		return map[string]int{}
	}
	keys := make([]string, 0, len(source))
	for key := range source {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	cloned := make(map[string]int, len(source))
	for _, key := range keys {
		cloned[key] = source[key]
	}
	return cloned
}

func cloneMetricMap(source map[string]MetricSnapshot) map[string]MetricSnapshot {
	if source == nil {
		return map[string]MetricSnapshot{}
	}
	keys := make([]string, 0, len(source))
	for key := range source {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	cloned := make(map[string]MetricSnapshot, len(source))
	for _, key := range keys {
		cloned[key] = source[key]
	}
	return cloned
}

func (s *Service) logWarn(message string, args ...any) {
	if s.logger != nil {
		s.logger.Warn(message, args...)
	}
}
