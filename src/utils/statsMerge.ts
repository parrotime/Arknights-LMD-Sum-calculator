const DAY_MS = 24 * 60 * 60 * 1000;

export interface StatPoint {
  key: string;
  label: string;
  count: number;
  success: number;
  timeout: number;
  queueFull: number;
  badRequest: number;
  error: number;
  cacheHit: number;
  cacheMiss: number;
  durationTotalMs: number;
  durationCount: number;
  fast: number;
  boost: number;
  [key: string]: string | number;
}

export interface RawStatPoint {
  key?: unknown;
  label?: unknown;
  count?: unknown;
  success?: unknown;
  timeout?: unknown;
  queueFull?: unknown;
  badRequest?: unknown;
  error?: unknown;
  cacheHit?: unknown;
  cacheMiss?: unknown;
  durationTotalMs?: unknown;
  durationCount?: unknown;
  fast?: unknown;
  boost?: unknown;
  strong?: unknown;
  [key: string]: unknown;
}

interface LegacyStatsInput {
  source?: {
    lastTimestamp?: string;
    [key: string]: unknown;
  };
  summary?: Record<string, unknown>;
  series?: {
    byHourOfDay?: RawStatPoint[];
    byDay?: RawStatPoint[];
    byWeek?: RawStatPoint[];
    byMonth?: RawStatPoint[];
  };
  distributions?: Record<string, unknown>;
}

export interface LiveStatsOverview {
  admin?: {
    updatedAt?: string;
    totals?: Record<string, unknown>;
    series?: {
      last24Hours?: RawStatPoint[];
      last7Days?: RawStatPoint[];
      last30Days?: RawStatPoint[];
      last12Months?: RawStatPoint[];
    };
  };
}

export interface NormalizedStats {
  source: Record<string, unknown>;
  summary: Record<string, number>;
  series: Record<string, StatPoint[]>;
  distributions?: Record<string, unknown>;
}

export interface MergedStats {
  baseline: NormalizedStats;
  live: NormalizedStats;
  merged: {
    summary: Record<string, number>;
    series: {
      byDay: StatPoint[];
      byWeek: StatPoint[];
      byMonth: StatPoint[];
    };
  };
}

export function formatStatNumber(value: number): string {
  return Number(value || 0).toLocaleString("zh-CN");
}

function createStatPoint(point: Partial<RawStatPoint> & { key: unknown; label?: unknown; count?: unknown }): StatPoint {
  return {
    key: String(point.key),
    label: typeof point.label === "string" ? point.label : String(point.key),
    count: Number(point.count || 0),
    success: Number(point.success || 0),
    timeout: Number(point.timeout || 0),
    queueFull: Number(point.queueFull || 0),
    badRequest: Number(point.badRequest || 0),
    error: Number(point.error || 0),
    cacheHit: Number(point.cacheHit || 0),
    cacheMiss: Number(point.cacheMiss || 0),
    durationTotalMs: Number(point.durationTotalMs || 0),
    durationCount: Number(point.durationCount || 0),
    fast: Number(point.fast || 0),
    boost: Number(point.boost || 0) + Number(point.strong || 0),
  };
}

export function normalizeLegacyStats(raw: LegacyStatsInput | null | undefined): NormalizedStats {
  return {
    source: raw?.source || {},
    summary: {
      totalRequests: Number(raw?.summary?.totalRequests || 0),
      timestampedRequests: Number(raw?.summary?.timestampedRequests || 0),
      undatedRequests: Number(raw?.summary?.undatedRequests || 0),
      goalRequests: Number(raw?.summary?.goalRequests || 0),
      uniqueIPs: Number(raw?.summary?.uniqueIPs || 0),
      emptyResults: Number(raw?.summary?.emptyResults || 0),
      activeDays: Number(raw?.summary?.activeDays || 0),
      avgDailyTimestampedRequests: Number(raw?.summary?.avgDailyTimestampedRequests || 0),
    },
    series: {
      byHourOfDay: normalizeSeries(raw?.series?.byHourOfDay),
      byDay: normalizeSeries(raw?.series?.byDay),
      byWeek: normalizeSeries(raw?.series?.byWeek),
      byMonth: normalizeSeries(raw?.series?.byMonth),
    },
    distributions: raw?.distributions || {},
  };
}

export function normalizeLiveStats(overview: LiveStatsOverview | null | undefined): NormalizedStats {
  const admin = overview?.admin || {};
  const totals = admin.totals || {};
  return {
    source: {
      updatedAt: admin.updatedAt || "",
    },
    summary: {
      totalRequests: Number(totals.calculations || 0),
      success: Number(totals.success || 0),
      timeout: Number(totals.timeout || 0),
      queueFull: Number(totals.queueFull || 0),
      badRequest: Number(totals.badRequest || 0),
      error: Number(totals.error || 0),
      cacheHit: Number(totals.cacheHit || 0),
      cacheMiss: Number(totals.cacheMiss || 0),
      durationTotalMs: Number(totals.durationTotalMs || 0),
    },
    series: {
      byDay: normalizeSeries(admin.series?.last30Days),
      byMonth: normalizeSeries(admin.series?.last12Months),
      last24Hours: normalizeSeries(admin.series?.last24Hours),
      last7Days: normalizeSeries(admin.series?.last7Days),
      last30Days: normalizeSeries(admin.series?.last30Days),
      last12Months: normalizeSeries(admin.series?.last12Months),
    },
  };
}

export function mergeStats(legacyRaw: LegacyStatsInput, liveOverview?: LiveStatsOverview | null): MergedStats {
  const baseline = normalizeLegacyStats(legacyRaw);
  const live = normalizeLiveStats(liveOverview);
  const mergedDaySeries = mergeSeriesByKey(baseline.series.byDay, live.series.byDay);
  const mergedMonthSeries = mergeSeriesByKey(baseline.series.byMonth, live.series.byMonth);

  return {
    baseline,
    live,
    merged: {
      summary: {
        totalRequests: baseline.summary.totalRequests + live.summary.totalRequests,
        timestampedRequests: baseline.summary.timestampedRequests + live.summary.totalRequests,
        undatedRequests: baseline.summary.undatedRequests,
        uniqueIPs: baseline.summary.uniqueIPs,
        emptyResults: baseline.summary.emptyResults,
        liveRequests: live.summary.totalRequests,
        baselineRequests: baseline.summary.totalRequests,
      },
      series: {
        byDay: mergedDaySeries,
        byWeek: baseline.series.byWeek,
        byMonth: mergedMonthSeries,
      },
    },
  };
}

export function buildRecentDaySeries(series: RawStatPoint[], count: number, now = new Date()): StatPoint[] {
  const lookup = new Map(normalizeSeries(series).map((point) => [point.key, point]));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getTime() - (count - 1 - index) * DAY_MS);
    const key = formatDateKey(date);
    const point = lookup.get(key);
    return createStatPoint({
      key,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      count: point?.count || 0,
    });
  });
}

export function buildRecentMonthSeries(series: RawStatPoint[], count: number, now = new Date()): StatPoint[] {
  const lookup = new Map(normalizeSeries(series).map((point) => [point.key, point]));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now);
    date.setDate(1);
    date.setMonth(date.getMonth() - (count - 1 - index));
    const key = formatMonthKey(date);
    const point = lookup.get(key);
    return createStatPoint({
      key,
      label: `${date.getMonth() + 1}月`,
      count: point?.count || 0,
    });
  });
}

export function buildHourSeries(points: RawStatPoint[] = []): StatPoint[] {
  return normalizeSeries(points).map((point) => ({
    ...point,
    count: point.count || 0,
  }));
}

export function legacyDataNotice(baseline: Pick<NormalizedStats, "source">): string {
  const last = baseline?.source?.lastTimestamp;
  if (!last) return "旧版日志基线已接入";
  if (typeof last !== "string") return "旧版日志基线已接入";
  const date = new Date(last);
  if (Number.isNaN(date.getTime())) return `旧版日志基线截至 ${last}`;
  return `旧版日志基线截至 ${date.toLocaleDateString("zh-CN")}`;
}

function normalizeSeries(points: RawStatPoint[] = []): StatPoint[] {
  if (!Array.isArray(points)) return [];
  return points
    .filter((point) => point && point.key)
    .map((point) => createStatPoint({ ...point, key: point.key }));
}

function mergeSeriesByKey(baseSeries: RawStatPoint[], liveSeries: RawStatPoint[]): StatPoint[] {
  const map = new Map<string, StatPoint>();
  for (const point of normalizeSeries(baseSeries)) {
    map.set(point.key, { ...point });
  }
  for (const point of normalizeSeries(liveSeries)) {
    const current = map.get(point.key) || createStatPoint({ key: point.key, label: point.label });
    map.set(point.key, {
      ...current,
      ...point,
      count: Number(current.count || 0) + Number(point.count || 0),
      success: Number(current.success || 0) + Number(point.success || 0),
      timeout: Number(current.timeout || 0) + Number(point.timeout || 0),
      queueFull: Number(current.queueFull || 0) + Number(point.queueFull || 0),
      badRequest: Number(current.badRequest || 0) + Number(point.badRequest || 0),
      error: Number(current.error || 0) + Number(point.error || 0),
      cacheHit: Number(current.cacheHit || 0) + Number(point.cacheHit || 0),
      cacheMiss: Number(current.cacheMiss || 0) + Number(point.cacheMiss || 0),
      durationTotalMs: Number(current.durationTotalMs || 0) + Number(point.durationTotalMs || 0),
      durationCount: Number(current.durationCount || 0) + Number(point.durationCount || 0),
      fast: Number(current.fast || 0) + Number(point.fast || 0),
      boost: Number(current.boost || 0) + Number(point.boost || 0),
    });
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
