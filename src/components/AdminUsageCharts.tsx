import React, { useState } from 'react';
import type { CSSProperties } from 'react';
import styles from '../assets/styles/AdminDashboard.module.css';
import { formatStatNumber } from '../utils/statsMerge';

interface UsageSide {
  count: number;
  amount: number;
}

interface UsagePair {
  gain: UsageSide;
  spend: UsageSide;
}

type PeriodKey = 'day' | 'week' | 'month';

export interface AdminUsage {
  heatmap: { date: string; weekday: number; hours: number[] }[];
  periods: Record<PeriodKey, {
    startDate: string;
    endDate: string;
    totals: UsagePair;
    buckets: (UsagePair & { min: number; max: number })[];
    topTargets: UsageSide[];
  }>;
}

const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const hours = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
const threeHourStarts = [0, 3, 6, 9, 12, 15, 18, 21];
const periods = [
  { key: 'day', label: '今天' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
] as const;
const formatNumber = formatStatNumber;

function CompactHeatmap({ days }: { days: AdminUsage['heatmap'] }) {
  const [selection, setSelection] = useState<{ date: string; start: number }>();
  const groups = threeHourStarts.map((start) => ({
    start,
    cells: days.map((day) => {
      const counts = day.hours.slice(start, start + 3);
      return { day, counts, total: counts.reduce((sum, count) => sum + count, 0) };
    }),
  }));
  const maximum = Math.max(1, ...groups.flatMap(({ cells }) => cells.map(({ total }) => total)));
  const selected = groups.find(({ start }) => start === selection?.start)
    ?.cells.find(({ day }) => day.date === selection?.date);

  return (
    <div className={styles['compact-heatmap']}>
      <table aria-label="每三小时计算次数">
        <thead>
          <tr>
            <th scope="col">时段</th>
            {days.map((day) => (
              <th key={day.date} scope="col">
                {weekdays[day.weekday]}
                <time dateTime={day.date}>{day.date.slice(5)}</time>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map(({ start, cells }) => {
            const range = `${hours[start]}–${hours[start + 3] ?? '24'}`;
            return (
              <tr key={start}>
                <th scope="row">{range}</th>
                {cells.map(({ day, counts, total }) => {
                  const strength = total > 0 ? 25 + 63 * total / maximum : 0;
                  return (
                    <td key={day.date}>
                      {counts.length > 0 ? (
                        <button
                          type="button"
                          aria-label={`${day.date} ${range} 时，计算 ${formatNumber(total)} 次`}
                          aria-pressed={selection?.date === day.date && selection.start === start}
                          onClick={() => setSelection({ date: day.date, start })}
                          style={{ '--heat-strength': `${strength}%` } as CSSProperties}
                        >
                          {total > 0 && formatNumber(total)}
                        </button>
                      ) : <span className={styles['heatmap-future']} aria-label="时段未到">–</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className={styles['heatmap-breakdown']} aria-live="polite">
        {selection && selected ? (
          <>
            <p><time dateTime={selected.day.date}>{selected.day.date.slice(5)}</time> {weekdays[selected.day.weekday]} · 逐小时次数</p>
            <dl>
              {hours.slice(selection.start, selection.start + 3).map((hour, index) => (
                <div key={hour}>
                  <dt>{hour}:00</dt>
                  <dd>{selected.counts[index] === undefined ? '未到' : `${formatNumber(selected.counts[index])} 次`}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : <p>每格为 3 小时，点按查看逐小时次数</p>}
      </div>
    </div>
  );
}

function UsageHeatmap({ days }: { days: AdminUsage['heatmap'] }) {
  const [selection, setSelection] = useState<{ date: string; hour: number }>();
  const maximum = Math.max(0, ...days.flatMap((day) => day.hours));
  const selectedDay = days.find((day) => day.date === selection?.date);
  const selectedCount = selection && selectedDay?.hours[selection.hour];

  return (
    <section className={`${styles['archive-card']} ${styles['usage-card']}`} aria-labelledby="admin-usage-heatmap">
      <div className={styles['section-heading']}>
        <div>
          <h2 id="admin-usage-heatmap">一周使用热力图</h2>
          <p className={styles['section-note']}>
            最近 7 天 · 北京时间
          </p>
        </div>
      </div>
        <table className={styles['usage-heatmap']}>
          <thead>
            <tr>
              <th scope="col">日期</th>
              {hours.map((hour, index) => (
                <th key={hour} scope="col" aria-label={`${hour} 点`}>
                  {index % 3 === 0 && hour}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date}>
                <th scope="row">{weekdays[day.weekday]} <time dateTime={day.date}>{day.date.slice(5)}</time></th>
                {hours.map((hour, index) => {
                  const count = day.hours[index];
                  const future = count === undefined;
                  const strength = count ? 25 + 63 * (count / maximum) : 0;
                  const label = `${day.date} ${hour}:00 · ${future ? '时段未到' : `${formatNumber(count)} 次`}`;
                  const selected = day.date === selection?.date && index === selection.hour;
                  return (
                    <td
                      key={hour}
                      data-future={future || undefined}
                      title={label}
                      style={{ '--heat-strength': `${strength}%` } as CSSProperties}
                    >
                      {count > 0 ? (
                        <button
                          type="button"
                          aria-label={label}
                          aria-pressed={selected}
                          onClick={() => setSelection({ date: day.date, hour: index })}
                        >
                          <span>{count}</span>
                        </button>
                      ) : <span>{future ? '–' : 0}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      <CompactHeatmap days={days} />
      <div className={styles['heatmap-footer']}>
        <span className={styles['heatmap-hour-selection']} aria-live="polite">
          {selection && selectedDay && selectedCount !== undefined
            ? <><time>{selectedDay.date.slice(5)} {hours[selection.hour]}:00</time> · {formatNumber(selectedCount)} 次</>
            : maximum > 0 ? '点按有颜色的格子查看次数' : '最近 7 天暂无计算记录'}
        </span>
        <span className={styles['heatmap-legend']} aria-label="颜色从浅到深表示次数从少到多">
          少
          {[0, 25, 50, 88].map((strength) => (
            <span key={strength} aria-hidden="true" style={{ '--heat-strength': `${strength}%` } as CSSProperties} />
          ))}
          多
        </span>
      </div>
    </section>
  );
}

function Comparison({ label, gain, spend }: { label: string; gain: number; spend: number }) {
  const total = gain + spend;
  return (
    <div className={styles['comparison']}>
      <div className={styles['comparison-values']}>
        <strong aria-label={`获取龙门币 ${formatNumber(gain)}`}>{formatNumber(gain)}</strong>
        <h3>{label}</h3>
        <strong aria-label={`花费龙门币 ${formatNumber(spend)}`}>{formatNumber(spend)}</strong>
      </div>
      <div className={styles['comparison-track']} aria-hidden="true">
        {total > 0 && (
          <>
            <span style={{ flexGrow: gain / total }} />
            <span style={{ flexGrow: spend / total }} />
          </>
        )}
      </div>
    </div>
  );
}

function BucketValue({ side, maximum }: { side: UsageSide; maximum: number }) {
  return (
    <>
      <strong>{formatNumber(side.count)} 次</strong>
      <div className={styles['bucket-track']} aria-hidden="true">
        <span style={{ width: `${(side.count / maximum) * 100}%` }} />
      </div>
      <small>{formatNumber(side.amount)} 龙门币</small>
    </>
  );
}

export default function AdminUsageCharts({ usage }: { usage?: AdminUsage }) {
  const [periodKey, setPeriodKey] = useState<PeriodKey>('week');
  if (!usage) {
    return <p className={styles['section-note']}>重启到新版后端后，这里会显示日志统计。</p>;
  }

  const period = usage.periods[periodKey];
  const dateLabel = period.startDate === period.endDate ? period.endDate : `${period.startDate} 至 ${period.endDate}`;
  const { totals, buckets, topTargets } = period;
  const maximumBucketCount = Math.max(1, ...buckets.flatMap(({ gain, spend }) => [gain.count, spend.count]));

  return (
    <div className={styles['usage-charts']}>
      <UsageHeatmap days={usage.heatmap} />
      <div className={styles['usage-period']}>
        <div className={styles['usage-period-switch']} role="group" aria-label="凑数分布和目标榜统计周期">
          {periods.map(({ key, label }) => (
            <button key={key} type="button" aria-pressed={key === periodKey} onClick={() => setPeriodKey(key)}>
              {label}
            </button>
          ))}
        </div>
        <span>{dateLabel} · 北京时间</span>
      </div>
      <div className={styles['usage-detail-grid']}>
        <section className={`${styles['archive-card']} ${styles['usage-card']}`} aria-labelledby="admin-usage-diff">
          <div className={styles['section-heading']}>
            <div>
              <h2 id="admin-usage-diff">龙门币凑数分布</h2>
              <p className={styles['section-note']}>按提交计算的差额统计</p>
            </div>
          </div>
          <div className={styles['usage-comparisons']}>
            <div className={styles['comparison-sides']}>
              <span>获取龙门币</span>
              <span>花费龙门币</span>
            </div>
            <Comparison label="计算次数（次）" gain={totals.gain.count} spend={totals.spend.count} />
            <Comparison label="差额合计（龙门币）" gain={totals.gain.amount} spend={totals.spend.amount} />
          </div>
          <table className={styles['usage-buckets']}>
            <caption>差额区间分布 <span>条长表示计算次数</span></caption>
            <colgroup><col /><col className={styles['bucket-range-column']} /><col /></colgroup>
            <thead>
              <tr>
                <th scope="col">获取龙门币</th>
                <th scope="col">差额区间</th>
                <th scope="col">花费龙门币</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map(({ min, max, gain, spend }) => (
                <tr key={min}>
                  <td><BucketValue side={gain} maximum={maximumBucketCount} /></td>
                  <th scope="row">{formatNumber(min)}–{formatNumber(max)}</th>
                  <td><BucketValue side={spend} maximum={maximumBucketCount} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className={`${styles['archive-card']} ${styles['usage-card']}`} aria-labelledby="admin-usage-targets">
          <div className={styles['section-heading']}>
            <div>
              <h2 id="admin-usage-targets">目标金额 Top 10</h2>
              <p className={styles['section-note']}>按目标余额被输入并提交计算的次数排名。</p>
            </div>
          </div>
          {topTargets.length === 0 ? (
            <p className={styles['usage-empty']}>这段时间暂无带目标金额的计算记录。</p>
          ) : (
            <ol className={styles['usage-ranking']}>
              {topTargets.map(({ amount, count }, index) => (
                <li key={amount}>
                  <span className={styles['usage-rank']}>{String(index + 1).padStart(2, '0')}</span>
                  <span className={styles['ranking-amount']}>
                    <span><strong>{formatNumber(amount)}</strong> 龙门币</span>
                    <span className={styles['ranking-track']} aria-hidden="true">
                      <span style={{ width: `${(count / topTargets[0].count) * 100}%` }} />
                    </span>
                  </span>
                  <span><strong>{formatNumber(count)}</strong> 次</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
