import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import styles from '../assets/styles/About.module.css';
import chartStyles from '../assets/styles/AboutChart.module.css';
import noticeStyles from '../assets/styles/AboutNotice.module.css';
import legacyLogStats from '../data/legacyLogStats.json';
import {
  buildHourSeries,
  buildRecentDaySeries,
  buildRecentHourSeries,
  buildRecentMonthSeries,
  formatStatNumber,
  formatLegacyBaselineEnd,
  mergeStats,
} from '../utils/statsMerge';
import type { LiveStatsOverview, StatPoint } from '../utils/statsMerge';

const LAUNCH_TIME = new Date('2025-04-19T00:00:00+08:00').getTime();
const API_BASE = import.meta.env.VITE_API_URL || "";

interface RuntimeParts {
  days: number;
  hours: number;
}

type SyncHelpStyle = CSSProperties & {
  '--about-sync-arrow-left'?: string;
  '--about-sync-arrow-edge'?: 'top' | 'bottom';
};

const actionIconUrls = {
  survey: 'https://ark-lmd.oss-cn-beijing.aliyuncs.com/survey.svg',
  feedback: 'https://ark-lmd.oss-cn-beijing.aliyuncs.com/document.svg',
  bilibili: 'https://ark-lmd.oss-cn-beijing.aliyuncs.com/bilibili.svg',
  github: 'https://ark-lmd.oss-cn-beijing.aliyuncs.com/github.svg',
} as const;

type ActionIconName = keyof typeof actionIconUrls;

function ActionLinkIcon({ name }: { name: ActionIconName }) {
  return (
    <img
      src={actionIconUrls[name]}
      alt=""
      decoding="async"
      loading="lazy"
    />
  );
}

const timelineItems = [
  { version: "v2.0.1", date: "2026年11月25日", lines: ["release_v201_1", "release_v201_2", "release_v201_3", "release_v201_4"] },
  { version: "v2.0.0", date: "2026年6月28日", lines: ["release_v200_1", "release_v200_2", "release_v200_3", "release_v200_4"] },
  { version: "v1.1.3", date: "2025年10月9日", lines: ["release_v113_1", "release_v113_2"] },
  { version: "v1.1.2", date: "2025年8月7日", lines: ["release_v112_1", "release_v112_2", "release_v112_3"] },
  { version: "v1.1.1", date: "2025年7月5日", lines: ["release_v111_1", "release_v111_2", "release_v111_3"] },
  { version: "v1.1.0", date: "2025年4月20日", lines: ["release_v110_1", "release_v110_2", "release_v110_3"] },
  { version: "v1.0.0", date: "2025年4月19日", lines: ["release_v100_1"] },
] as const;

const chartRanges = ['day', 'week', 'month', 'year'] as const;
type ChartRangeKey = (typeof chartRanges)[number];

interface ChartPlotData {
  series: StatPoint[];
  maximum: number;
  ticks: number[];
  labeledIndexes: Set<number>;
  valueIndexes: Set<number>;
  raisedIndex: number;
  selectedKey: string | null;
}

function getChartScale(peak: number) {
  const desiredStep = Math.max(1, peak / 4);
  const magnitude = 10 ** Math.floor(Math.log10(desiredStep));
  const step = ([1, 2, 5, 10].find((factor) => factor * magnitude >= desiredStep) ?? 10) * magnitude;
  const maximum = Math.max(step * 2, Math.ceil(peak / step) * step);

  return {
    maximum,
    ticks: Array.from({ length: maximum / step + 1 }, (_, index) => index * step),
  };
}

function formatChartPeriod(key: string, compact = false): string {
  const parts = /^(\d{4})-(\d{2})(?:-(\d{2})(?:T(\d{2}))?)?$/.exec(key);
  if (!parts) return key;

  const [, year, month, day, hour] = parts;
  const yearLabel = compact && day ? '' : year + '年';
  const date = yearLabel + Number(month) + '月' + (day ? Number(day) + '日' : '');
  return hour ? date + ' ' + hour + ':00' : date;
}

function formatRuntime(now: number): RuntimeParts {
  const diff = Math.max(0, now - LAUNCH_TIME);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);

  return {
    days,
    hours,
  };
}

function getBaselineReferenceDate(source: Record<string, unknown>, fallback: Date): Date {
  const rawTimestamp = source.lastTimestamp;
  if (typeof rawTimestamp !== 'string') return fallback;

  const parsed = new Date(rawTimestamp);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function AboutPage() {
  const { t, i18n } = useTranslation(['about', 'common']);
  const [now, setNow] = useState(() => Date.now());
  const [activeRange, setActiveRange] = useState<ChartRangeKey>('day');
  const [chartEntrance, setChartEntrance] = useState<'waiting' | 'entering' | 'ready'>('waiting');
  const [outgoingPlot, setOutgoingPlot] = useState<ChartPlotData | null>(null);
  const [selectedBarKey, setSelectedBarKey] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStatsOverview | null>(null);
  const [syncHelpOpen, setSyncHelpOpen] = useState(false);
  const [syncHelpStyle, setSyncHelpStyle] = useState<SyncHelpStyle | null>(null);
  const [isMobileChart, setIsMobileChart] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
  ));
  const rangeSwipeStart = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const chartBaselineRef = useRef<HTMLSpanElement | null>(null);
  const syncHelpTriggerRef = useRef<HTMLButtonElement | null>(null);
  const syncHelpPopoverRef = useRef<HTMLSpanElement | null>(null);
  const runtime = useMemo(() => formatRuntime(now), [now]);
  const combinedStats = useMemo(() => mergeStats(legacyLogStats, liveStats), [liveStats]);
  const baselineEnd = formatLegacyBaselineEnd(combinedStats.baseline, i18n.resolvedLanguage);
  const chartSeries = useMemo<StatPoint[]>(() => {
    const currentDate = new Date(now);
    if (activeRange === 'day') {
      const liveHours = buildHourSeries(combinedStats.live.series.last24Hours);
      return liveHours.length
        ? liveHours
        : buildRecentHourSeries(combinedStats.baseline.series.byExactHour, 24, getBaselineReferenceDate(combinedStats.baseline.source, currentDate));
    }
    if (activeRange === 'week') return buildRecentDaySeries(combinedStats.merged.series.byDay, 7, currentDate);
    if (activeRange === 'month') return buildRecentDaySeries(combinedStats.merged.series.byDay, 30, currentDate);
    return buildRecentMonthSeries(combinedStats.merged.series.byMonth, isMobileChart ? 6 : 12, currentDate);
  }, [activeRange, combinedStats, isMobileChart, now]);
  const counts = chartSeries.map((point) => point.count);
  const peakCount = Math.max(0, ...counts);
  const peakIndex = counts.indexOf(peakCount);
  const lowestIndex = counts.indexOf(Math.min(...counts));
  const showAllValues = !isMobileChart || activeRange === 'week' || activeRange === 'year';
  const staggerExtremes = !showAllValues && peakIndex !== lowestIndex && Math.abs(peakIndex - lowestIndex) <= 3;
  const { maximum: chartMaximum, ticks: chartTicks } = getChartScale(peakCount);
  const selectedBar = chartSeries.find((point) => point.key === selectedBarKey);
  const readout = selectedBar
    ?? chartSeries[peakCount > 0 ? peakIndex : chartSeries.length - 1];
  const labelCount = activeRange === 'week' || activeRange === 'year'
    ? chartSeries.length
    : Math.min(isMobileChart ? 5 : 7, chartSeries.length);
  const labeledIndexes = new Set(
    Array.from({ length: labelCount }, (_, index) => (
      Math.round(index * (chartSeries.length - 1) / Math.max(1, labelCount - 1))
    )),
  );
  const chartPlot: ChartPlotData = {
    series: chartSeries,
    maximum: chartMaximum,
    ticks: chartTicks,
    labeledIndexes,
    valueIndexes: new Set(showAllValues ? counts.map((_, index) => index) : [peakIndex, lowestIndex]),
    raisedIndex: staggerExtremes ? peakIndex : -1,
    selectedKey: selectedBarKey,
  };
  const formatBarLabel = (point: StatPoint) => (
    t('pointValue', { date: formatChartPeriod(point.key), value: formatStatNumber(point.count) })
  );

  const selectRange = (range: ChartRangeKey) => {
    if (range !== activeRange) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setOutgoingPlot(reduceMotion ? null : chartPlot);
      setChartEntrance(reduceMotion ? 'ready' : 'entering');
    }
    setActiveRange(range);
    setSelectedBarKey(null);
  };

  const handleRangePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobileChart || event.pointerType !== 'touch' || !event.isPrimary) return;

    rangeSwipeStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const handleRangePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = rangeSwipeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const distanceX = Math.abs(event.clientX - start.x);
    const distanceY = Math.abs(event.clientY - start.y);
    if (distanceX >= 24 && distanceX > distanceY) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handleRangePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = rangeSwipeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;

    rangeSwipeStart.current = null;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    const distanceX = event.clientX - start.x;
    if (Math.abs(distanceX) < 24 || Math.abs(distanceX) <= Math.abs(event.clientY - start.y)) return;

    const nextRange = chartRanges[chartRanges.indexOf(activeRange) + Math.sign(distanceX)];
    if (nextRange) selectRange(nextRange);
  };

  const selectBarAtPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    if (width <= 0 || !chartSeries.length) return;

    const column = Math.floor((event.clientX - left) / width * chartSeries.length);
    const index = Math.max(0, Math.min(chartSeries.length - 1, column));
    setSelectedBarKey(chartSeries[index].key);
  };

  const handleChartPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobileChart || event.pointerType !== 'touch' || !event.isPrimary) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    selectBarAtPointer(event);
  };

  const handleChartPointerSlide = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) selectBarAtPointer(event);
  };

  useEffect(() => {
    const baseline = chartBaselineRef.current;
    if (!baseline || chartEntrance !== 'waiting') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setChartEntrance('ready');
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      setChartEntrance('entering');
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setChartEntrance((phase) => phase === 'waiting' ? 'entering' : phase);
    });
    observer.observe(baseline);
    return () => observer.disconnect();
  }, [chartEntrance]);

  useEffect(() => {
    if (chartEntrance !== 'entering') return;
    const timer = window.setTimeout(() => setChartEntrance('ready'), 840);
    return () => window.clearTimeout(timer);
  }, [activeRange, chartEntrance]);

  useEffect(() => {
    if (!outgoingPlot) return;
    const timer = window.setTimeout(() => setOutgoingPlot(null), 250);
    return () => window.clearTimeout(timer);
  }, [outgoingPlot]);

  const renderChartPlot = (plot: ChartPlotData, phase: typeof chartEntrance | 'outgoing') => {
    const isOutgoing = phase === 'outgoing';

    return (
      <div
        key={`${isOutgoing ? 'outgoing' : 'current'}-${activeRange}`}
        className={chartStyles['chart-plot']}
        data-phase={phase}
        data-crossfade-in={!isOutgoing && outgoingPlot ? true : undefined}
        aria-hidden={isOutgoing || undefined}
        style={{ '--chart-scale-width': `${formatStatNumber(plot.maximum).length}ch` } as CSSProperties}
      >
        <div className={chartStyles['chart-grid']} aria-hidden="true">
          {plot.ticks.map((tick) => (
            <div
              className={chartStyles['chart-grid-line']}
              key={tick}
              style={{ bottom: `${tick / plot.maximum * 100}%` }}
            >
              <span>{formatStatNumber(tick)}</span>
            </div>
          ))}
        </div>
        <div
          className={chartStyles['chart-bars']}
          style={{ gridTemplateColumns: `repeat(${plot.series.length}, minmax(0, 1fr))` }}
          onPointerDown={isOutgoing ? undefined : handleChartPointerDown}
          onPointerMove={isOutgoing ? undefined : handleChartPointerSlide}
          onPointerUp={isOutgoing ? undefined : handleChartPointerSlide}
        >
          {plot.series.map((point, index) => (
            <div
              key={point.key}
              className={chartStyles['chart-column']}
              style={{
                '--chart-bar-height': `${point.count / plot.maximum * 100}%`,
                '--chart-bar-delay': `${index / Math.max(1, plot.series.length - 1) * 300}ms`,
              } as CSSProperties}
            >
              {isOutgoing ? (
                <span className={chartStyles['chart-bar-target']} data-selected={point.key === plot.selectedKey}>
                  <span className={chartStyles['chart-bar']} />
                </span>
              ) : (
                <button
                  type="button"
                  className={chartStyles['chart-bar-target']}
                  data-selected={point.key === plot.selectedKey}
                  aria-pressed={point.key === plot.selectedKey}
                  aria-label={formatBarLabel(point)}
                  onPointerEnter={(event) => {
                    if (event.pointerType === 'mouse') setSelectedBarKey(point.key);
                  }}
                  onFocus={() => setSelectedBarKey(point.key)}
                  onClick={() => setSelectedBarKey(point.key)}
                >
                  <span className={chartStyles['chart-bar']} aria-hidden="true" />
                </button>
              )}
              {plot.valueIndexes.has(index) && (
                <span
                  className={chartStyles['chart-bar-value']}
                  data-raised={index === plot.raisedIndex}
                  aria-hidden="true"
                >
                  {formatStatNumber(point.count)}
                </span>
              )}
              {plot.labeledIndexes.has(index) && (
                <span className={chartStyles['chart-axis-label']} aria-hidden="true">{point.label}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const isMobileHelpLayout = useCallback(() => (
    window.matchMedia('(max-width: 900px)').matches || window.matchMedia('(pointer: coarse)').matches
  ), []);

  const updateSyncHelpPosition = useCallback(() => {
    if (!syncHelpOpen || !isMobileHelpLayout()) {
      setSyncHelpStyle(null);
      return;
    }

    const trigger = syncHelpTriggerRef.current;
    const popover = syncHelpPopoverRef.current;
    if (!trigger || !popover) return;

    const triggerRect = trigger.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const popoverWidth = Math.min(324, Math.max(0, window.innerWidth - 32));
    const popoverLeft = (window.innerWidth - popoverWidth) / 2;
    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const arrowLeft = Math.min(Math.max(triggerCenter - popoverLeft, 16), popoverWidth - 16);
    const spaceAbove = triggerRect.top;
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const shouldPlaceBelow = spaceAbove < popoverRect.height + 18 && spaceBelow > spaceAbove;
    const top = shouldPlaceBelow
      ? Math.max(12, Math.min(window.innerHeight - popoverRect.height - 12, triggerRect.bottom + 10))
      : Math.max(12, triggerRect.top - popoverRect.height - 10);

    setSyncHelpStyle({
      top: `${top}px`,
      visibility: 'visible',
      '--about-sync-arrow-left': `${arrowLeft}px`,
      '--about-sync-arrow-edge': shouldPlaceBelow ? 'top' : 'bottom',
    });
  }, [isMobileHelpLayout, syncHelpOpen]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchPublicStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/public-stats`);
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled) setLiveStats(payload);
      } catch {
        if (!cancelled) setLiveStats(null);
      }
    };

    fetchPublicStats();
    const timer = window.setInterval(fetchPublicStats, 120000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)');
    const updateMobileChart = () => setIsMobileChart(mediaQuery.matches);

    updateMobileChart();
    mediaQuery.addEventListener('change', updateMobileChart);

    return () => mediaQuery.removeEventListener('change', updateMobileChart);
  }, []);

  useEffect(() => {
    setSyncHelpStyle(null);
    if (!syncHelpOpen) return undefined;

    const frame = requestAnimationFrame(updateSyncHelpPosition);
    window.addEventListener('scroll', updateSyncHelpPosition, { passive: true });
    window.addEventListener('resize', updateSyncHelpPosition);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateSyncHelpPosition);
      window.removeEventListener('resize', updateSyncHelpPosition);
    };
  }, [syncHelpOpen, updateSyncHelpPosition, i18n.resolvedLanguage]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (isMobileHelpLayout()) return;

      if (!(event.target instanceof Element) || !event.target.closest('[data-about-sync-help-root="true"]')) {
        setSyncHelpOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isMobileHelpLayout]);

  const handleSyncHelpHover = () => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      setSyncHelpOpen(true);
    }
  };

  return (
    <div className={styles['main-about-content']}>
      <div className={styles['about-page']}>
        <div className={styles['about-title-bar']}>
          <h1>// [*] {t("archive")}</h1>
          <p>ARCHIVES OF PROJECT</p>
        </div>

        <section className={styles['action-grid']} aria-label={t("action")}>
          <div className={styles['action-panel']}>
            <div>
              <span className={styles['panel-code']}>FEEDBACK</span>
              <h2>{t("feedback")}</h2>
            </div>
            <div className={styles['link-row']}>
              <a
                className={styles['archive-link']}
                href="https://v.wjx.cn/vm/wJwEJn8.aspx#"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles['archive-link-icon']} aria-hidden="true">
                  <ActionLinkIcon name="survey" />
                </span>
                <span>{t("survey.title", { ns: "common" })}</span>
              </a>
              <a
                className={styles['archive-link']}
                href="https://docs.qq.com/sheet/DT2hmVUhLbHVxYUtC?tab=BB08J2"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles['archive-link-icon']} aria-hidden="true">
                  <ActionLinkIcon name="feedback" />
                </span>
                <span>{t("feedbackDetail")}</span>
              </a>
            </div>
          </div>

          <div className={styles['action-panel']}>
            <div>
              <span className={styles['panel-code']}>EXTERNAL LINK</span>
              <h2>{t("links")}</h2>
            </div>
            <div className={styles['link-row']}>
              <a
                className={styles['archive-link']}
                href="https://space.bilibili.com/32772539"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles['archive-link-icon']} aria-hidden="true">
                  <ActionLinkIcon name="bilibili" />
                </span>
                <span>Bilibili</span>
              </a>
              <a
                className={styles['archive-link']}
                href="https://github.com/parrotime/Arknights-LMD-Sum-calculator"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles['archive-link-icon']} aria-hidden="true">
                  <ActionLinkIcon name="github" />
                </span>
                <span>GITHUB</span>
              </a>
            </div>
          </div>
        </section>

        <section className={styles['archive-grid']} aria-label={t("status")}>
          <div className={styles['status-row']}>
            <div className={`${styles['archive-card']} ${styles['status-card']} ${styles['runtime-card']}`}>
              <div className={styles['status-card-copy']}>
                <div className={styles['card-label']}>OPERATION TIME</div>
                <div className={styles['card-title']}>{t("runtime")}</div>
              </div>
              <div className={styles['runtime-readout']}>
                <span>{runtime.days}</span>
                <small>{t("days")}</small>
                <span>{runtime.hours}</span>
                <small>{t("hours")}</small>
              </div>
            </div>

            <div className={`${styles['archive-card']} ${styles['status-card']} ${styles['count-card']}`}>
              <div className={styles['status-card-copy']}>
                <div className={styles['card-label']}>CALCULATION LOG</div>
                <div className={styles['card-title-row']}>
                  <div className={styles['card-title']}>{t("total")}</div>
                  <span className={chartStyles['sync-help-root']} data-about-sync-help-root="true">
                    <button
                      type="button"
                      className={chartStyles['sync-help-trigger']}
                      ref={syncHelpTriggerRef}
                      aria-label={t("syncOpen")}
                      aria-expanded={syncHelpOpen}
                      onClick={() => setSyncHelpOpen((open) => !open)}
                      onMouseEnter={handleSyncHelpHover}
                    >
                      ?
                    </button>
                    {syncHelpOpen && (
                      <span
                        className={chartStyles['sync-help-popover']}
                        ref={syncHelpPopoverRef}
                        style={syncHelpStyle || undefined}
                      >
                        <button
                          type="button"
                          className={chartStyles['sync-help-close']}
                          aria-label={t("syncClose")}
                          onClick={() => setSyncHelpOpen(false)}
                        >
                          ×
                        </button>
                        <span>{t("syncNote")}</span>
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <div className={styles['count-readout']}>{formatStatNumber(combinedStats.merged.summary.totalRequests)}</div>
            </div>
          </div>

          <div className={`${styles['archive-card']} ${chartStyles['chart-card']}`}>
            <div className={chartStyles['chart-header']}>
              <div>
                <div className={styles['card-label']}>TREND REPORT</div>
                <div className={styles['card-title']}>{t("trend")}</div>
                <div className={chartStyles['chart-status']}>
                  {baselineEnd ? t("baselineEnd", { date: baselineEnd }) : t("baseline")} / {t("newCount", { count: formatStatNumber(combinedStats.live.summary.totalRequests) })}
                </div>
              </div>
              <div
                className={chartStyles['range-tabs']}
                style={{ '--range-index': chartRanges.indexOf(activeRange) } as CSSProperties}
                role="group"
                aria-label={t("range")}
                onPointerDown={handleRangePointerDown}
                onPointerMove={handleRangePointerMove}
                onPointerUp={handleRangePointerUp}
                onPointerCancel={(event) => {
                  if (rangeSwipeStart.current?.pointerId === event.pointerId) rangeSwipeStart.current = null;
                }}
              >
                {chartRanges.map((range) => (
                  <button
                    type="button"
                    key={range}
                    className={chartStyles['range-tab']}
                    onClick={() => selectRange(range)}
                    aria-pressed={activeRange === range}
                  >
                    {t(`range_${range}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className={chartStyles['chart-body']}>
              {readout && (
                <div className={chartStyles['chart-readout']}>
                  <span className={chartStyles['chart-readout-date']}>{formatChartPeriod(readout.key, true)}</span>
                  <span className={chartStyles['chart-readout-count']}>
                    <strong>{formatStatNumber(readout.count)}</strong> 次
                  </span>
                </div>
              )}
              <div className={chartStyles['chart-stage']}>
                {renderChartPlot(chartPlot, chartEntrance)}
                {outgoingPlot && renderChartPlot(outgoingPlot, 'outgoing')}
                <span ref={chartBaselineRef} className={chartStyles['chart-baseline']} aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <div className={noticeStyles['notice-list']}>
          <div className={noticeStyles['notice-item']}>
            <div className={noticeStyles['notice-title']}>{t("release", { version: "v2.0.1" })}</div>
            <div className={noticeStyles['notice-content']}>
              <div className={noticeStyles['hanging-list']}>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>1</span>
                  {t("project")}
                </p>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>2</span>
                  {t("report")}
                  <a
                    href="https://space.bilibili.com/32772539"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={noticeStyles['external-link3']}
                  >
                    {t("profile")}
                  </a>
                </p>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>3</span>
                  {t("source")}
                  <a
                    href="https://github.com/parrotime/Arknights-LMD-Sum-calculator"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={noticeStyles['external-link3']}
                  >
                    {t("github")}
                  </a>
                </p>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>4</span>
                  {t("assetIntro")}
                  <a
                    href="https://prts.wiki/w/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={noticeStyles['external-link3']}
                  >
                    PRTS wiki
                  </a>
                  {t("assetSuffix")}
                </p>
              </div>
            </div>

            <div className={noticeStyles['notice-title']}>{t("references")}</div>
            <div className={noticeStyles['notice-content']}>
              <div className={noticeStyles['hanging-list']}>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>1</span>
                  <a
                    href="https://bbs.nga.cn/read.php?tid=21247901"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={noticeStyles['external-link3']}
                  >
                    {t("olderCalculator")}
                  </a>
                  {t("olderSite")}
                </p>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>2</span>
                  {t("research")}
                  <a
                    href="https://ngabbs.com/read.php?tid=16847042"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={noticeStyles['external-link3']}
                  >
                    {t("researchTitle")}
                  </a>
                </p>
              </div>
            </div>

            <div className={noticeStyles['notice-title']}>{t("disclaimer")}</div>
            <div className={noticeStyles['notice-content']}>
              <div className={noticeStyles['hanging-list']}>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>1</span>
                  {t("ownership")}
                </p>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>2</span>
                  {t("copyright")}
                </p>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>3</span>
                  {t("purpose")}
                </p>
              </div>
            </div>

            <div className={noticeStyles['notice-title']}>{t("timeline")}</div>
            <div className={noticeStyles['notice-content']}>
              <div className={noticeStyles.timeline}>
                {timelineItems.map((item) => (
                  <div className={noticeStyles['timeline-item']} key={item.version}>
                    <div className={noticeStyles['timeline-dot']} />
                    <div>
                      <span className={noticeStyles['timeline-version']}>{item.version}</span>
                      <span className={noticeStyles['timeline-date']}>{item.date}</span>
                    </div>
                    <div className={noticeStyles['timeline-desc']}>{item.lines.map((key, index) => (
                        <React.Fragment key={key}>
                          {index > 0 && <br />}
                          {t(key)}
                        </React.Fragment>
                      ))}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
