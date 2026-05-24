import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../assets/styles/AdminDashboard.module.css';

const API_BASE = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "ark_lmd_admin_token";

const statusLabels = {
  success: "成功",
  timeout: "超时",
  queue_full: "队列满",
  bad_request: "参数错误",
  error: "异常",
};

const modeLabels = {
  fast: "快速",
  boost: "加强",
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString("zh-CN");
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${(value * 100).toFixed(1)}%`;
}

function formatDuration(totalMs, count) {
  if (!count) return "0 ms";
  return `${Math.round(totalMs / count)} ms`;
}

function formatTime(raw) {
  if (!raw) return "--";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString("zh-CN", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTodayCount(series = []) {
  return series.length ? series[series.length - 1].count : 0;
}

function TrendBars({ points = [] }) {
  const max = Math.max(...points.map((point) => point.count), 1);
  const visiblePoints = points.slice(-24);

  return (
    <div className={styles['trend-bars']} aria-label="最近趋势">
      {visiblePoints.map((point) => (
        <div className={styles['trend-bar-cell']} key={point.key} title={`${point.label}: ${point.count} 次`}>
          <span
            className={styles['trend-bar']}
            style={{ height: `${Math.max(6, (point.count / max) * 100)}%` }}
          />
          <small>{point.label}</small>
        </div>
      ))}
    </div>
  );
}

function StatCard({ code, title, value, detail }) {
  return (
    <div className={styles['stat-card']}>
      <div>
        <span className={styles['card-code']}>{code}</span>
        <h2>{title}</h2>
      </div>
      <strong>{value}</strong>
      {detail && <p>{detail}</p>}
    </div>
  );
}

function AdminDashboard() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [draftToken, setDraftToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchOverview = useCallback(async (nextToken = token) => {
    if (!nextToken) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/admin/overview`, {
        headers: {
          "X-Admin-Token": nextToken,
        },
      });
      if (response.status === 401) {
        throw new Error("管理员 token 不正确");
      }
      if (response.status === 404) {
        throw new Error("后端未配置 ADMIN_TOKEN，管理员接口未启用");
      }
      if (!response.ok) {
        throw new Error(`读取失败：${response.status}`);
      }
      const payload = await response.json();
      setOverview(payload);
    } catch (err) {
      setOverview(null);
      setError(err.message || "读取管理员数据失败");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    fetchOverview(token);
    const timer = window.setInterval(() => fetchOverview(token), 60000);
    return () => window.clearInterval(timer);
  }, [fetchOverview, token]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextToken = draftToken.trim();
    sessionStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    fetchOverview(nextToken);
  };

  const handleClearToken = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setDraftToken("");
    setOverview(null);
    setError("");
  };

  const admin = overview?.admin;
  const totals = admin?.totals || {};
  const server = overview?.server || {};
  const cache = overview?.cache || {};
  const todayCount = useMemo(() => getTodayCount(admin?.series?.last7Days), [admin]);
  const hitRate = totals.cacheHit + totals.cacheMiss > 0
    ? totals.cacheHit / (totals.cacheHit + totals.cacheMiss)
    : cache.hitRate || 0;

  return (
    <div className={styles['admin-content']}>
      <div className={styles['admin-page']}>
        <div className={styles['admin-title-bar']}>
          <h1>// [ADMIN] 数据大屏</h1>
          <p>RHODES ISLAND OPERATION OVERVIEW</p>
        </div>

        <section className={styles['auth-panel']} aria-label="管理员认证">
          <div>
            <span className={styles['panel-code']}>ACCESS TOKEN</span>
            <h2>管理员令牌</h2>
            <p>隐藏页面不会主动请求数据；输入 token 后才读取后端快照。</p>
          </div>
          <form className={styles['token-form']} onSubmit={handleSubmit}>
            <input
              type="password"
              value={draftToken}
              onChange={(event) => setDraftToken(event.target.value)}
              placeholder="输入 ADMIN_TOKEN"
              aria-label="管理员 token"
            />
            <button type="submit" disabled={loading || !draftToken.trim()}>
              {loading ? "读取中" : "接入"}
            </button>
            <button type="button" onClick={handleClearToken}>
              清除
            </button>
          </form>
        </section>

        {error && <div className={styles['error-panel']} role="alert">{error}</div>}

        {overview && (
          <>
            <section className={styles['status-strip']} aria-label="服务状态">
              <div>
                <span>SERVER</span>
                <strong>ONLINE</strong>
              </div>
              <div>
                <span>MAINTENANCE</span>
                <strong>{overview.maintenance?.enabled ? "ON" : "OFF"}</strong>
              </div>
              <div>
                <span>UPDATED</span>
                <strong>{formatTime(admin?.updatedAt)}</strong>
              </div>
              <div>
                <span>REFRESH</span>
                <strong>60 SEC</strong>
              </div>
            </section>

            <section className={styles['stat-grid']} aria-label="核心指标">
              <StatCard code="TOTAL" title="累计计算" value={formatNumber(totals.calculations)} detail={`今日 ${formatNumber(todayCount)} 次`} />
              <StatCard code="CACHE" title="缓存命中率" value={formatPercent(hitRate)} detail={`命中 ${formatNumber(totals.cacheHit)} / 未命中 ${formatNumber(totals.cacheMiss)}`} />
              <StatCard code="DURATION" title="平均耗时" value={formatDuration(totals.durationTotalMs, totals.calculations)} detail="按聚合日志估算" />
              <StatCard code="QUEUE" title="当前队列" value={`${formatNumber(server.running)} / ${formatNumber(server.queued)}`} detail={`拒绝 ${formatNumber(server.queueRejected)} 次`} />
            </section>

            <section className={styles['dashboard-grid']}>
              <div className={`${styles['archive-card']} ${styles['trend-card']}`}>
                <div className={styles['section-heading']}>
                  <span className={styles['panel-code']}>24H TREND</span>
                  <h2>最近 24 小时计算趋势</h2>
                </div>
                <TrendBars points={admin?.series?.last24Hours || []} />
              </div>

              <div className={`${styles['archive-card']} ${styles['split-card']}`}>
                <div className={styles['section-heading']}>
                  <span className={styles['panel-code']}>MODE / STATUS</span>
                  <h2>模式与状态</h2>
                </div>
                <div className={styles['split-list']}>
                  {Object.entries(admin?.modeCounts || {}).map(([key, value]) => (
                    <div key={key}>
                      <span>{modeLabels[key] || key}</span>
                      <strong>{formatNumber(value)}</strong>
                    </div>
                  ))}
                  {Object.entries(admin?.statusCounts || {}).map(([key, value]) => (
                    <div key={key}>
                      <span>{statusLabels[key] || key}</span>
                      <strong>{formatNumber(value)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className={`${styles['archive-card']} ${styles['event-card']}`} aria-label="最近事件">
              <div className={styles['section-heading']}>
                <span className={styles['panel-code']}>RECENT EVENTS</span>
                <h2>最近计算事件</h2>
              </div>
              <div className={styles['event-table-wrap']}>
                <table className={styles['event-table']}>
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>差值</th>
                      <th>模式</th>
                      <th>缓存</th>
                      <th>耗时</th>
                      <th>方案</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(admin?.recentEvents || []).map((event, index) => (
                      <tr key={`${event.time}-${index}`}>
                        <td>{formatTime(event.time)}</td>
                        <td>{event.lmdDiff}</td>
                        <td>{modeLabels[event.calcMode] || event.calcMode}</td>
                        <td>{event.cache || "--"}</td>
                        <td>{event.durationMs} ms</td>
                        <td>{event.pathsCount}</td>
                        <td>{statusLabels[event.status] || event.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
