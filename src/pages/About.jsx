import React, { useEffect, useMemo, useState } from 'react';
import styles from '../assets/styles/About.module.css';

const LAUNCH_TIME = new Date('2025-04-19T00:00:00+08:00').getTime();

const timelineItems = [
  { version: "v2.0.0", date: "2026年4月", desc: "根据各个社交平台的反馈进行大更新。项目架构重做，页面排版优化，计算结果展示优化，新增交换输入值、清空输入值、重置设置、复制方案结果等功能，新增搓玉消耗龙门币相关数据。完善移动端体验，优化计算性能。" },
  { version: "v1.1.3", date: "2025年10月9日", desc: "修改了主页下方排版和一些文本内容。" },
  { version: "v1.1.2", date: "2025年8月7日", desc: "优化了设置区域的排版；对路径中\"使用作战记录\"有关步骤的文本内容进行了修改以避免歧义，感谢B站评论区反馈。" },
  { version: "v1.1.1", date: "2025年7月5日", desc: "把\"路径切换按钮\"改到路径的上方，这样它就不会乱跑了；优化了彩蛋和其他内容，感谢B站评论区反馈。" },
  { version: "v1.1.0", date: "2025年4月20日", desc: "处理了\"当前和目标输入同一个值会显示无合适路径\"的问题；处理了\"路径中'当前龙门币'数量为负数\"情况的问题。感谢B站评论区捉虫。" },
  { version: "v1.0.0", date: "2025年4月19日", desc: "版本上线。" },
];

const chartRanges = [
  { key: 'day', label: '日', code: 'DAILY' },
  { key: 'week', label: '周', code: 'WEEKLY' },
  { key: 'month', label: '月', code: 'MONTHLY' },
  { key: 'year', label: '年', code: 'YEARLY' },
];

const chartData = {
  day: [6, 5, 4, 4, 5, 8, 13, 18, 22, 24, 21, 19, 25, 31, 29, 34, 38, 41, 37, 33, 29, 24, 18, 12],
  week: [132, 148, 176, 169, 204, 231, 218],
  month: [
    96, 104, 112, 108, 121, 128, 136, 142, 139, 151,
    163, 158, 171, 184, 179, 191, 205, 214, 208, 221,
    236, 229, 244, 252, 247, 263, 276, 282, 291, 304,
  ],
  year: [2180, 2360, 2510, 2430, 2675, 2860, 3020, 3190, 3375, 3520, 3680, 3890],
};

function getChartPoints(values) {
  const width = 280;
  const paddingX = 14;
  const paddingTop = 12;
  const axisY = 104;
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = Math.max(maxValue - minValue, 1);

  return values.map((value, index) => {
    const x = paddingX + (index * (width - paddingX * 2)) / (values.length - 1);
    const y = axisY - ((value - minValue) / range) * (axisY - paddingTop);

    return {
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
    };
  });
}

function getSmoothPath(points) {
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

function getAreaPath(points, baselineY) {
  if (points.length < 2) return "";

  const linePath = getSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];

  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

function formatMonthDay(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatHour(date) {
  return `${String(date.getHours()).padStart(2, '0')}:00`;
}

function formatMonth(date) {
  return `${date.getMonth() + 1}月`;
}

function getChartTicks(range, now) {
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
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now);
      date.setMonth(date.getMonth() - (11 - index), 1);

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

function formatRuntime(now) {
  const diff = Math.max(0, now - LAUNCH_TIME);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);

  return {
    days,
    hours,
  };
}

function AboutPage() {
  const [now, setNow] = useState(() => Date.now());
  const [activeRange, setActiveRange] = useState('day');
  const [syncHelpOpen, setSyncHelpOpen] = useState(false);
  const runtime = useMemo(() => formatRuntime(now), [now]);
  const chartValues = chartData[activeRange];
  const chartPoints = useMemo(() => getChartPoints(chartValues), [chartValues]);
  const chartPath = useMemo(() => getSmoothPath(chartPoints), [chartPoints]);
  const chartAreaPath = useMemo(() => getAreaPath(chartPoints, 104), [chartPoints]);
  const activeTicks = useMemo(() => getChartTicks(activeRange, now), [activeRange, now]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!event.target.closest('[data-about-sync-help-root="true"]')) {
        setSyncHelpOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

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
                  <span className={styles['sync-help-root']} data-about-sync-help-root="true">
                    <button
                      type="button"
                      className={styles['sync-help-trigger']}
                      aria-label="查看统计同步说明"
                      aria-expanded={syncHelpOpen}
                      onClick={() => setSyncHelpOpen((open) => !open)}
                      onMouseEnter={() => setSyncHelpOpen(true)}
                    >
                      ?
                    </button>
                    {syncHelpOpen && (
                      <span className={styles['sync-help-popover']}>
                        <button
                          type="button"
                          className={styles['sync-help-close']}
                          aria-label="关闭统计同步说明"
                          onClick={() => setSyncHelpOpen(false)}
                        >
                          ×
                        </button>
                        <span>每 2 小时同步一次统计数据</span>
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <div className={styles['count-readout']}>待接入</div>
            </div>
          </div>

          <div className={`${styles['archive-card']} ${styles['chart-card']}`}>
            <div className={styles['chart-header']}>
              <div>
                <div className={styles['card-label']}>TREND REPORT</div>
                <div className={styles['card-title']}>计算次数趋势</div>
                <div className={styles['chart-status']}>待接入真实数据</div>
              </div>
              <div className={styles['range-tabs']} role="tablist" aria-label="统计周期">
                {chartRanges.map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    className={activeRange === item.key ? styles['range-tab-active'] : styles['range-tab']}
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

            <div className={styles['chart-body']}>
              <div className={styles['chart-plot']}>
                <svg viewBox="0 0 280 128" preserveAspectRatio="none" className={styles['trend-chart']} aria-hidden="true">
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
                    <line key={y} x1="10" y1={y} x2="270" y2={y} className={styles['chart-grid-line']} />
                  ))}
                  <line x1="14" y1="104" x2="266" y2="104" className={styles['chart-axis-line']} />
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
                        className={styles['chart-axis-guide']}
                      />
                    );
                  })}
                  <path d={chartAreaPath} className={styles['chart-area']} />
                  <path d={chartPath} className={styles['chart-polyline-shadow']} />
                  <path d={chartPath} className={styles['chart-polyline']} />
                  {chartPoints.map((point, index) => {
                    const tick = activeTicks[index];
                    const isKeyPoint = !!tick?.label || index === chartPoints.length - 1;

                    return (
                      <g key={`point-${index}`} className={styles['chart-node']}>
                        {isKeyPoint && <circle cx={point.x} cy={point.y} r="3.2" className={styles['chart-point']} />}
                        <circle cx={point.x} cy={point.y} r="7" className={styles['chart-hit-point']}>
                          <title>{`${tick?.title ?? ''}：${chartValues[index]} 次`}</title>
                        </circle>
                      </g>
                    );
                  })}
                </svg>

                <div className={styles['chart-axis-labels']} aria-hidden="true">
                  {chartPoints.map((point, index) => {
                    const tick = activeTicks[index];
                    if (!tick?.label) return null;

                    return (
                      <span
                        key={`label-${index}`}
                        className={styles['chart-axis-html-label']}
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
              <span className={styles['panel-code']}>FEEDBACK CHANNEL</span>
              <h2>反馈通道</h2>
            </div>
            <div className={styles['link-row']}>
              <a className={styles['archive-link']} href="#" aria-disabled="true">提交反馈</a>
              <a className={styles['archive-link']} href="#" aria-disabled="true">反馈详情</a>
            </div>
          </div>

          <div className={styles['action-panel']}>
            <div>
              <span className={styles['panel-code']}>EXTERNAL FILE</span>
              <h2>外部档案</h2>
            </div>
            <div className={styles['link-row']}>
              <a
                className={styles['archive-link']}
                href="https://space.bilibili.com/32772539"
                target="_blank"
                rel="noopener noreferrer"
              >
                BILIBILI
              </a>
              <a
                className={styles['archive-link']}
                href="https://github.com/parrotime/Arknights-LMD-Sum-calculator"
                target="_blank"
                rel="noopener noreferrer"
              >
                GITHUB
              </a>
            </div>
          </div>
        </section>

        <div className={styles['notice-list']}>
          <div className={styles['notice-item']}>
            <div className={styles['notice-title']}>当前版本v2.0</div>
            <div className={styles['notice-content']}>
              <div className={styles['hanging-list']}>
                <p className={styles['hanging-item']}>
                  <span className={styles['hanging-index']}>1</span>
                  本网页是作者入门前端三件套和react框架的一个练习项目，没什么技术含量，存在不足之处，欢迎提出改进意见orz
                </p>
                <p className={styles['hanging-item']}>
                  <span className={styles['hanging-index']}>2</span>
                  如果遇到问题，请通过B站私信反馈
                  <a
                    href="https://space.bilibili.com/32772539"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles['external-link3']}
                  >
                    网页作者B站主页
                  </a>
                </p>
                <p className={styles['hanging-item']}>
                  <span className={styles['hanging-index']}>3</span>
                  网页源码：
                  <a
                    href="https://github.com/parrotime/Arknights-LMD-Sum-calculator"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles['external-link3']}
                  >
                    github项目源码
                  </a>
                </p>
                <p className={styles['hanging-item']}>
                  <span className={styles['hanging-index']}>4</span>
                  本网页中所有数据与图片均来自于
                  <a
                    href="https://prts.wiki/w/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles['external-link3']}
                  >
                    PRTS wiki
                  </a>
                  官网，所有迷迭香表情包均出自NGA
                  <a
                    href="https://ngabbs.com/read.php?tid=26714373"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles['external-link3']}
                  >
                    [嵌字烤肉][授权]好猫咪！！！(By
                    coconattsu_corn)(大量迷迭香/博士表情包)(更新了十多张)
                  </a>
                  。如有侵权，请联系删除。
                </p>
              </div>
            </div>

            <div className={styles['notice-title']}>参考文献</div>
            <div className={styles['notice-content']}>
              <div className={styles['hanging-list']}>
                <p className={styles['hanging-item']}>
                  <span className={styles['hanging-index']}>1</span>
                  <a
                    href="https://bbs.nga.cn/read.php?tid=21247901"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles['external-link3']}
                  >
                    公招需要花费龙门币时代的另一位作者的凑数计算器NGA帖子
                  </a>
                  ，也就是熟知的 https://cedric341561.gitee.io/777/（似乎已经失效）
                </p>
                <p className={styles['hanging-item']}>
                  <span className={styles['hanging-index']}>2</span>
                  <a
                    href="https://ngabbs.com/read.php?tid=16847042"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles['external-link3']}
                  >
                    干员升级经验及龙门币消耗成本统计(收束测试)
                  </a>
                </p>
              </div>
            </div>

            <div className={styles['notice-title']}>声明</div>
            <div className={styles['notice-content']}>
              <div className={styles['hanging-list']}>
                <p className={styles['hanging-item']}>
                  <span className={styles['hanging-index']}>1</span>
                  网页所涉及的游戏《明日方舟》相关的名称、数据、素材、表情包等均为其各自所有者的资产，仅供识别。
                </p>
                <p className={styles['hanging-item']}>
                  <span className={styles['hanging-index']}>2</span>
                  网页内使用的游戏图片素材、文本，仅用于介绍与说明，其版权均属于上海鹰角网络科技有限公司。
                </p>
                <p className={styles['hanging-item']}>
                  <span className={styles['hanging-index']}>3</span>
                  本项目为无偿开源项目，以便于明日方舟玩家能够凑出想要的龙门币数量，仅用于学习交流使用。
                </p>
              </div>
            </div>

            <div className={styles['notice-title']}>时间轴</div>
            <div className={styles['notice-content']}>
              <div className={styles.timeline}>
                {timelineItems.map((item, i) => (
                  <div className={styles['timeline-item']} key={i}>
                    <div className={styles['timeline-dot']} />
                    <div>
                      <span className={styles['timeline-version']}>{item.version}</span>
                      <span className={styles['timeline-date']}>{item.date}</span>
                    </div>
                    <div className={styles['timeline-desc']}>{item.desc}</div>
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
