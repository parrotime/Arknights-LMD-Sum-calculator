import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
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
  legacyDataNotice,
  mergeStats,
} from '../utils/statsMerge';
import type { LiveStatsOverview, StatPoint } from '../utils/statsMerge';

const LAUNCH_TIME = new Date('2025-04-19T00:00:00+08:00').getTime();
const API_BASE = import.meta.env.VITE_API_URL || "";

type ChartRangeKey = 'day' | 'week' | 'month' | 'year';

interface TimelineItem {
  version: string;
  date: string;
  desc: ReactNode;
}

interface ChartRange {
  key: ChartRangeKey;
  label: string;
  code: string;
}

interface ChartPoint {
  x: number;
  y: number;
}

interface ChartTick {
  label: string;
  title: string;
}

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

const timelineItems: TimelineItem[] = [
  { version: "v2.0.0", date: "2026年6月", desc: (
    <>
      根据各个社交平台的反馈进行2.0版本大更新。
      <br />
      项目架构重做，页面排版重新设计，计算结果展示优化。
      <br />
      新增交换、清空输入值，新增重置设置、复制方案结果等功能，新增搓玉消耗龙门币相关数据。
      <br />
      完善移动端体验，优化计算性能。
    </>
  ), },
  { version: "v1.1.3", date: "2025年10月9日", desc: (
    <>
      修改了主页下方排版。
      <br />
      调整了一些文本内容。
    </>
  ), },
  { version: "v1.1.2", date: "2025年8月7日", desc: (
    <>
      优化了设置区域的排版；
      <br />
      对路径中"使用作战记录"有关步骤的文本内容进行了修改以避免歧义。
      <br />
      感谢B站评论区反馈。
    </>
  ), },
  { version: "v1.1.1", date: "2025年7月5日", desc: (
    <>
      把"路径切换按钮"改到路径的上方，这样它就不会乱跑了；
      <br/>
      优化了彩蛋和其他内容。
      <br/>
      感谢B站评论区反馈。
    </>),},
  { version: "v1.1.0", date: "2025年4月20日", desc: (
    <>
      处理了"当前和目标输入同一个值会显示无合适路径"的问题；
      <br/>
      处理了"路径中'当前龙门币'数量为负数"情况的问题。
      <br/>
      感谢B站评论区捉虫。
    </>
    ),},
  { version: "v1.0.0", date: "2025年4月19日", desc: "1.0版本上线。" },
];

const chartRanges: ChartRange[] = [
  { key: 'day', label: '日', code: 'DAILY' },
  { key: 'week', label: '周', code: 'WEEKLY' },
  { key: 'month', label: '月', code: 'MONTHLY' },
  { key: 'year', label: '年', code: 'YEARLY' },
];

function getChartPoints(values: number[]): ChartPoint[] {
  const width = 280;
  const paddingX = 14;
  const paddingTop = 12;
  const axisY = 104;
  const normalizedValues = values.length ? values : [0];
  const maxValue = Math.max(...normalizedValues);
  const minValue = Math.min(...normalizedValues);
  const range = Math.max(maxValue - minValue, 1);

  return normalizedValues.map((value, index) => {
    const denominator = Math.max(normalizedValues.length - 1, 1);
    const x = paddingX + (index * (width - paddingX * 2)) / denominator;
    const y = axisY - ((value - minValue) / range) * (axisY - paddingTop);

    return {
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
    };
  });
}

function getSmoothPath(points: ChartPoint[]): string {
  if (points.length < 2) return "";

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;

    const previous = points[index - 1];
    const beforePrevious = points[index - 2] ?? previous;
    const next = points[index + 1] ?? point;
    const tension = 0.18;
    const cp1x = previous.x + (point.x - beforePrevious.x) * tension;
    const cp1y = previous.y + (point.y - beforePrevious.y) * tension;
    const cp2x = point.x - (next.x - previous.x) * tension;
    const cp2y = point.y - (next.y - previous.y) * tension;

    return `${path} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${point.x} ${point.y}`;
  }, "");
}

function getAreaPath(points: ChartPoint[], baselineY: number): string {
  if (points.length < 2) return "";

  const linePath = getSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];

  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatHour(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:00`;
}

function formatMonth(date: Date): string {
  return `${date.getMonth() + 1}月`;
}

function getChartTicks(range: ChartRangeKey, now: number, itemCount: number): ChartTick[] {
  if (range === 'day') {
    return Array.from({ length: 24 }, (_, index) => {
      const date = new Date(now);
      date.setHours(date.getHours() - (23 - index), 0, 0, 0);

      return {
        label: index % 6 === 0 || index === 23 ? formatHour(date) : "",
        title: `${formatMonthDay(date)} ${formatHour(date)}`,
      };
    });
  }

  if (range === 'week') {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - index));
      return {
        label: formatMonthDay(date),
        title: formatMonthDay(date),
      };
    });
  }

  if (range === 'year') {
    return Array.from({ length: itemCount }, (_, index) => {
      const date = new Date(now);
      date.setMonth(date.getMonth() - (itemCount - 1 - index), 1);

      return {
        label: formatMonth(date),
        title: `${date.getFullYear()}年${formatMonth(date)}`,
      };
    });
  }

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (29 - index));

    return {
      label: index % 6 === 0 || index === 29 ? formatMonthDay(date) : "",
      title: formatMonthDay(date),
    };
  });
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
  const [now, setNow] = useState(() => Date.now());
  const [activeRange, setActiveRange] = useState<ChartRangeKey>('day');
  const [liveStats, setLiveStats] = useState<LiveStatsOverview | null>(null);
  const [syncHelpOpen, setSyncHelpOpen] = useState(false);
  const [syncHelpStyle, setSyncHelpStyle] = useState<SyncHelpStyle | null>(null);
  const [isMobileChart, setIsMobileChart] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
  ));
  const syncHelpTriggerRef = useRef<HTMLButtonElement | null>(null);
  const syncHelpPopoverRef = useRef<HTMLSpanElement | null>(null);
  const runtime = useMemo(() => formatRuntime(now), [now]);
  const combinedStats = useMemo(() => mergeStats(legacyLogStats, liveStats), [liveStats]);
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
  const chartValues = useMemo(() => {
    return chartSeries.map((point) => point.count);
  }, [chartSeries]);
  const chartPoints = useMemo(() => getChartPoints(chartValues), [chartValues]);
  const chartPath = useMemo(() => getSmoothPath(chartPoints), [chartPoints]);
  const chartAreaPath = useMemo(() => getAreaPath(chartPoints, 104), [chartPoints]);
  const isDenseChart = chartPoints.length > 12;
  const chartExtremes = useMemo(() => {
    if (!chartValues.length) return { maxIndex: -1, minIndex: -1 };

    const maxValue = Math.max(...chartValues);
    const minValue = Math.min(...chartValues);
    const maxIndex = chartValues.findIndex((value) => value === maxValue);
    const minIndex = maxValue === minValue
      ? -1
      : chartValues.findIndex((value) => value === minValue);

    return { maxIndex, minIndex };
  }, [chartValues]);
  const activeTicks = useMemo(() => {
    if (chartSeries.length) {
      return chartSeries.map((point, index) => ({
        label: activeRange === 'day'
          ? (index % 6 === 0 || index === chartSeries.length - 1 ? point.label : "")
          : (activeRange === 'month' ? (index % 6 === 0 || index === chartSeries.length - 1 ? point.label : "") : point.label),
        title: point.key,
      }));
    }
    return getChartTicks(activeRange, now, chartValues.length);
  }, [activeRange, chartSeries, chartValues.length, now]);
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
  }, [syncHelpOpen, updateSyncHelpPosition]);

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
          <h1>// [*] 项目档案</h1>
          <p>ARCHIVES OF PROJECT</p>
        </div>

        <section className={styles['archive-grid']} aria-label="项目运行状态">
          <div className={styles['status-row']}>
            <div className={`${styles['archive-card']} ${styles['status-card']} ${styles['runtime-card']}`}>
              <div className={styles['status-card-copy']}>
                <div className={styles['card-label']}>OPERATION TIME</div>
                <div className={styles['card-title']}>网站已运行时间</div>
              </div>
              <div className={styles['runtime-readout']}>
                <span>{runtime.days}</span>
                <small>天</small>
                <span>{runtime.hours}</span>
                <small>小时</small>
              </div>
            </div>

            <div className={`${styles['archive-card']} ${styles['status-card']} ${styles['count-card']}`}>
              <div className={styles['status-card-copy']}>
                <div className={styles['card-label']}>CALCULATION LOG</div>
                <div className={styles['card-title-row']}>
                  <div className={styles['card-title']}>累计完成计算次数</div>
                  <span className={chartStyles['sync-help-root']} data-about-sync-help-root="true">
                    <button
                      type="button"
                      className={chartStyles['sync-help-trigger']}
                      ref={syncHelpTriggerRef}
                      aria-label="查看统计同步说明"
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
                          aria-label="关闭统计同步说明"
                          onClick={() => setSyncHelpOpen(false)}
                        >
                          ×
                        </button>
                        <span>页面刷新可能存在延迟。</span>
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
                <div className={styles['card-title']}>计算次数趋势</div>
                <div className={chartStyles['chart-status']}>
                  {legacyDataNotice(combinedStats.baseline)} / 新增 {formatStatNumber(combinedStats.live.summary.totalRequests)} 次
                </div>
              </div>
              <div className={chartStyles['range-tabs']} role="tablist" aria-label="统计周期">
                {chartRanges.map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    className={activeRange === item.key ? chartStyles['range-tab-active'] : chartStyles['range-tab']}
                    onClick={() => setActiveRange(item.key)}
                    aria-selected={activeRange === item.key}
                    role="tab"
                  >
                    <span>{item.label}</span>
                    <small>{item.code}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className={chartStyles['chart-body']}>
              <div className={chartStyles['chart-plot']}>
                <svg
                  viewBox="0 0 280 128"
                  preserveAspectRatio={isMobileChart ? 'xMidYMid meet' : 'none'}
                  className={chartStyles['trend-chart']}
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="aboutTrendGlow" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="rgba(99, 180, 247, 0.25)" />
                      <stop offset="50%" stopColor="rgba(99, 180, 247, 0.95)" />
                      <stop offset="100%" stopColor="rgba(99, 180, 247, 0.35)" />
                    </linearGradient>
                    <linearGradient id="aboutTrendArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(99, 180, 247, 0.22)" />
                      <stop offset="100%" stopColor="rgba(99, 180, 247, 0)" />
                    </linearGradient>
                  </defs>
                  {[22, 52, 82].map((y) => (
                    <line key={y} x1="10" y1={y} x2="270" y2={y} className={chartStyles['chart-grid-line']} />
                  ))}
                  <line x1="14" y1="104" x2="266" y2="104" className={chartStyles['chart-axis-line']} />
                  {chartPoints.map((point, index) => {
                    const tick = activeTicks[index];
                    if (!tick?.label) return null;

                    return (
                      <line
                        key={`axis-${index}`}
                        x1={point.x}
                        y1="18"
                        x2={point.x}
                        y2="104"
                        className={chartStyles['chart-axis-guide']}
                      />
                    );
                  })}
                  <path d={chartAreaPath} className={chartStyles['chart-area']} />
                  <path d={chartPath} className={chartStyles['chart-polyline-shadow']} />
                  <path d={chartPath} className={chartStyles['chart-polyline']} />
                  {chartPoints.map((point, index) => {
                    const tick = activeTicks[index];

                    return (
                      <g key={`point-${index}`} className={chartStyles['chart-node']}>
                        <circle cx={point.x} cy={point.y} r="7" className={chartStyles['chart-hit-point']}>
                          <title>{`${tick?.title ?? ''}：${formatStatNumber(chartValues[index])} 次`}</title>
                        </circle>
                      </g>
                    );
                  })}
                </svg>

                <div className={chartStyles['chart-point-layer']}>
                  {chartPoints.map((point, index) => {
                    const tick = activeTicks[index];
                    const value = formatStatNumber(chartValues[index]);
                    const labelClass = point.y < 25 ? chartStyles['chart-value-below'] : chartStyles['chart-value-above'];
                    const isMaxPoint = index === chartExtremes.maxIndex;
                    const isMinPoint = index === chartExtremes.minIndex;
                    const extremeClass = isMaxPoint
                      ? chartStyles['chart-html-point-max']
                      : (isMinPoint ? chartStyles['chart-html-point-min'] : '');

                    return (
                      <button
                        type="button"
                        key={`html-point-${index}`}
                        className={`${chartStyles['chart-html-point']} ${labelClass} ${index === 0 ? chartStyles['chart-value-edge-start'] : ''} ${index === chartPoints.length - 1 ? chartStyles['chart-value-edge-end'] : ''} ${isMaxPoint || isMinPoint ? chartStyles['chart-html-point-extreme'] : ''} ${extremeClass} ${isDenseChart ? chartStyles['chart-html-point-dense'] : ''}`}
                        style={{
                          left: `${(point.x / 280) * 100}%`,
                          top: `${(point.y / 128) * 100}%`,
                        }}
                        aria-label={`${tick?.title ?? '统计点'}：${value} 次${isMaxPoint ? '，最高点' : ''}${isMinPoint ? '，最低点' : ''}`}
                        title={`${tick?.title ?? ''}：${value} 次`}
                      >
                        <span className={chartStyles['chart-html-dot']} />
                        <span className={chartStyles['chart-value-label']}>{value}</span>
                      </button>
                    );
                  })}
                </div>

                <div className={chartStyles['chart-axis-labels']} aria-hidden="true">
                  {chartPoints.map((point, index) => {
                    const tick = activeTicks[index];
                    if (!tick?.label) return null;

                    return (
                      <span
                        key={`label-${index}`}
                        className={chartStyles['chart-axis-html-label']}
                        style={{ left: `${(point.x / 280) * 100}%` }}
                      >
                        {tick.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles['action-grid']} aria-label="反馈与外部链接">
          <div className={styles['action-panel']}>
            <div>
              <span className={styles['panel-code']}>FEEDBACK</span>
              <h2>反馈通道</h2>
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
                <span>填写反馈问卷</span>
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
                <span>查看反馈详情</span>
              </a>
            </div>
          </div>

          <div className={styles['action-panel']}>
            <div>
              <span className={styles['panel-code']}>EXTERNAL LINK</span>
              <h2>外部链接</h2>
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

        <div className={noticeStyles['notice-list']}>
          <div className={noticeStyles['notice-item']}>
            <div className={noticeStyles['notice-title']}>当前版本v2.0.0</div>
            <div className={noticeStyles['notice-content']}>
              <div className={noticeStyles['hanging-list']}>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>1</span>
                  本网页是作者入门前端三件套和react框架的一个练习项目，没什么技术含量，存在不足之处，欢迎通过反馈渠道提出改进意见
                </p>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>2</span>
                  如果遇到问题，请通过B站私信反馈或直接填写反馈问卷
                  <a
                    href="https://space.bilibili.com/32772539"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={noticeStyles['external-link3']}
                  >
                    网页作者B站主页
                  </a>
                </p>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>3</span>
                  网页源码：
                  <a
                    href="https://github.com/parrotime/Arknights-LMD-Sum-calculator"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={noticeStyles['external-link3']}
                  >
                    github项目源码
                  </a>
                </p>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>4</span>
                  本网页中所有数据与图片均来自于
                  <a
                    href="https://prts.wiki/w/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={noticeStyles['external-link3']}
                  >
                    PRTS wiki
                  </a>
                  官网以及游戏社区图片。如有侵权，请联系删除。
                </p>
              </div>
            </div>

            <div className={noticeStyles['notice-title']}>参考文献</div>
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
                    在公招需要花费龙门币时代，另一位作者的凑数计算器NGA帖子
                  </a>
                  ，也就是熟知的 https://cedric341561.gitee.io/777/（似乎已经失效）
                </p>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>2</span>
                  龙门币消耗与各级所需经验值之间的数学关系研究：
                  <a
                    href="https://ngabbs.com/read.php?tid=16847042"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={noticeStyles['external-link3']}
                  >
                    干员升级经验及龙门币消耗成本统计(收束测试)
                  </a>
                </p>
              </div>
            </div>

            <div className={noticeStyles['notice-title']}>声明</div>
            <div className={noticeStyles['notice-content']}>
              <div className={noticeStyles['hanging-list']}>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>1</span>
                  网页所涉及的游戏《明日方舟》相关的名称、数据、素材、表情包等均为其各自所有者的资产，仅供识别。
                </p>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>2</span>
                  网页内使用的游戏图片素材、文本，仅用于介绍与说明，其版权均属于上海鹰角网络科技有限公司。
                </p>
                <p className={noticeStyles['hanging-item']}>
                  <span className={noticeStyles['hanging-index']}>3</span>
                  本项目为无偿开源项目，以便于明日方舟玩家能够凑出想要的龙门币数量，仅用于学习交流使用。
                </p>
              </div>
            </div>

            <div className={noticeStyles['notice-title']}>时间轴</div>
            <div className={noticeStyles['notice-content']}>
              <div className={noticeStyles.timeline}>
                {timelineItems.map((item, i) => (
                  <div className={noticeStyles['timeline-item']} key={i}>
                    <div className={noticeStyles['timeline-dot']} />
                    <div>
                      <span className={noticeStyles['timeline-version']}>{item.version}</span>
                      <span className={noticeStyles['timeline-date']}>{item.date}</span>
                    </div>
                    <div className={noticeStyles['timeline-desc']}>{item.desc}</div>
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
