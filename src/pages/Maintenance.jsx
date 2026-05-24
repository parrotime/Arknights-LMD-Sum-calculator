import React, { useEffect, useState } from "react";
import pathRendererStyles from "../assets/styles/PathRenderer.module.css";
import styles from "../assets/styles/Maintenance.module.css";
import {
  acquireSamplePlans,
  consumeSamplePlans,
  renderSamplePathCards,
} from "../utils/samplePlans.jsx";

const DEFAULT_TITLE = "网页维护中...";
const DEFAULT_SUBTITLE = "计算功能暂时无法使用，如有凑龙门币数字的需要，请查看下方表格";
const NORMAL_TITLE = "网页维护未启用";
const NORMAL_SUBTITLE = "当前计算服务未进入维护状态，下方表格可作为离线参考备用";

const fetchMaintenanceStatus = async () => {
  const response = await fetch(`${import.meta.env.VITE_API_URL || ""}/maintenance-status`, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`maintenance status request failed: ${response.status}`);
  }

  return response.json();
};

const formatTimeParts = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0"));
};

const FlipUnit = ({ value, label }) => (
  <span className={styles['timer-unit']} aria-label={`${value} ${label}`}>
    <span key={value} className={styles['timer-number']}>{value}</span>
    <span className={styles['timer-label']}>{label}</span>
  </span>
);

const MaintenancePage = () => {
  const [status, setStatus] = useState({
    loading: true,
    error: false,
    enabled: false,
    title: DEFAULT_TITLE,
    subtitle: DEFAULT_SUBTITLE,
    endAtMs: null,
    serverOffsetMs: 0,
  });
  const [remainingMs, setRemainingMs] = useState(0);
  const [hours, minutes, seconds] = formatTimeParts(remainingMs);
  const hasCountdown = status.enabled && status.endAtMs;

  useEffect(() => {
    let ignore = false;

    fetchMaintenanceStatus()
      .then((data) => {
        if (ignore) return;
        const serverTimeMs = Date.parse(data.serverTime || "");
        const endAtMs = Date.parse(data.endAt || "");
        const enabled = Boolean(data.enabled);
        const hasValidEndAt = Number.isFinite(endAtMs);
        const serverOffsetMs = Number.isFinite(serverTimeMs)
          ? serverTimeMs - Date.now()
          : 0;

        setStatus({
          loading: false,
          error: false,
          enabled,
          title: enabled ? (data.title || DEFAULT_TITLE) : NORMAL_TITLE,
          subtitle: enabled ? (data.subtitle || DEFAULT_SUBTITLE) : NORMAL_SUBTITLE,
          endAtMs: enabled && hasValidEndAt ? endAtMs : null,
          serverOffsetMs,
        });
      })
      .catch(() => {
        if (ignore) return;
        setStatus({
          loading: false,
          error: true,
          enabled: true,
          title: DEFAULT_TITLE,
          subtitle: DEFAULT_SUBTITLE,
          endAtMs: null,
          serverOffsetMs: 0,
        });
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!status.enabled || !status.endAtMs) {
      setRemainingMs(0);
      return undefined;
    }

    const tick = () => {
      const correctedNow = Date.now() + status.serverOffsetMs;
      setRemainingMs(status.endAtMs - correctedNow);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [status.enabled, status.endAtMs, status.serverOffsetMs]);

  const renderMaintenanceSamples = (data) => renderSamplePathCards({
    data,
    pathRendererClassName: `${pathRendererStyles['path-renderer-container']} ${styles['maintenance-sample-path-container']}`,
    planListClassName: pathRendererStyles['plan-list'],
    cardClassName: styles['maintenance-sample-plan-card'],
    identityValueClassName: styles['maintenance-sample-target-mark'],
    itemClassName: styles['maintenance-sample-item-name'],
  });

  return (
    <div className={styles['maintenance-content']}>
      <main className={`${styles['maintenance-page']} ${!status.enabled ? styles['maintenance-page-normal'] : ""}`}>
        <section className={styles['hero-section']} aria-labelledby="maintenance-title">
          <span className={styles['status-chip']}>
            {status.loading ? "STATUS SYNCING" : status.enabled ? "SYSTEM MAINTENANCE" : "SYSTEM ONLINE"}
          </span>
          <h1 id="maintenance-title">{status.loading ? "正在同步维护状态..." : status.title}</h1>
          <p>{status.loading ? "正在从服务器读取当前维护配置，请稍候" : status.subtitle}</p>
        </section>

        <section className={styles['contact-panel']} aria-label="维护反馈联系方式">
          <span className={styles['contact-code']}>CONTACT</span>
          <p>
            如有问题需要反馈，请点击
            <a
              href="https://space.bilibili.com/32772539"
              target="_blank"
              rel="noopener noreferrer"
            >
              B站链接私信
            </a>
          </p>
        </section>

        <section className={styles['timer-panel']} aria-label="预计恢复倒计时">
          <div className={styles['timer-copy']}>
            <span>{status.enabled ? "预计恢复倒计时" : "维护状态"}</span>
            <strong>{status.enabled ? "MAINTENANCE TIMER" : "MAINTENANCE SWITCH"}</strong>
          </div>
          {hasCountdown ? (
            <div className={styles['timer-readout']} aria-live="polite">
              <FlipUnit value={hours} label="HRS" />
              <span className={styles['timer-separator']}>:</span>
              <FlipUnit value={minutes} label="MIN" />
              <span className={styles['timer-separator']}>:</span>
              <FlipUnit value={seconds} label="SEC" />
            </div>
          ) : (
            <div className={`${styles['timer-readout']} ${styles['status-readout']}`} aria-live="polite">
              <strong>{status.loading ? "SYNCING" : status.error ? "CONFIG UNREACHABLE" : status.enabled ? "WAITING" : "STANDBY"}</strong>
              <span>
                {status.loading
                  ? "正在读取维护配置"
                  : status.error
                    ? "无法连接状态接口，已保留离线参考表格"
                    : status.enabled
                      ? "维护已启用，暂未设置恢复时间"
                      : "维护未启用"}
              </span>
            </div>
          )}
        </section>

        <section className={styles['sample-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-code']}>OFFLINE 01</span>
            <div>
              <h2>临时参考方案：需要获取龙门币</h2>
              <p>OFFLINE REFERENCE / ACQUIRE</p>
            </div>
          </div>
          <div className={styles['section-content']}>
            <p className={styles['sample-note']}>
              以下路径用于维护期间快速查找，不一定是最适合、最简单的路径方案，仅供参考。（默认初始龙门币为0，目标龙门币为对应值）
            </p>
            {renderMaintenanceSamples(acquireSamplePlans)}
          </div>
        </section>

        <section className={styles['sample-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-code']}>OFFLINE 02</span>
            <div>
              <h2>临时参考方案：需要消耗龙门币</h2>
              <p>OFFLINE REFERENCE / CONSUME</p>
            </div>
          </div>
          <div className={styles['section-content']}>
            <p className={styles['sample-note']}>
              以下路径用于维护期间快速查找，不一定是最适合、最简单的路径方案，仅供参考。（默认初始龙门币为对应值，目标龙门币为0）
            </p>
            {renderMaintenanceSamples(consumeSamplePlans)}
          </div>
        </section>
      </main>
    </div>
  );
};

export default MaintenancePage;
