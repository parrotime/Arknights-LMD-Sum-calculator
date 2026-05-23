import React, { useEffect, useMemo, useState } from "react";
import pathRendererStyles from "../assets/styles/PathRenderer.module.css";
import styles from "../assets/styles/Maintenance.module.css";
import {
  acquireSamplePlans,
  consumeSamplePlans,
  renderSamplePathCards,
} from "../utils/samplePlans.jsx";

const MAINTENANCE_DURATION_MS = 12 * 60 * 60 * 1000;
const START_STORAGE_KEY = "maintenanceCountdownStart";

const getInitialEndTime = () => {
  const now = Date.now();
  const savedStart = Number(localStorage.getItem(START_STORAGE_KEY));
  const validStart = Number.isFinite(savedStart) && savedStart > 0
    ? savedStart
    : now;

  if (!Number.isFinite(savedStart) || savedStart <= 0) {
    localStorage.setItem(START_STORAGE_KEY, String(validStart));
  }

  return validStart + MAINTENANCE_DURATION_MS;
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
  const endTime = useMemo(getInitialEndTime, []);
  const [remainingMs, setRemainingMs] = useState(() => endTime - Date.now());
  const [hours, minutes, seconds] = formatTimeParts(remainingMs);

  useEffect(() => {
    const tick = () => setRemainingMs(endTime - Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [endTime]);

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
      <main className={styles['maintenance-page']}>
        <section className={styles['hero-section']} aria-labelledby="maintenance-title">
          <span className={styles['status-chip']}>SYSTEM MAINTENANCE</span>
          <h1 id="maintenance-title">网页维护中...</h1>
          <p>计算功能暂时无法使用，如有凑龙门币数字的需要，请查看下方表格</p>
        </section>

        <section className={styles['timer-panel']} aria-label="预计恢复倒计时">
          <div className={styles['timer-copy']}>
            <span>预计恢复倒计时</span>
            <strong>MAINTENANCE TIMER</strong>
          </div>
          <div className={styles['timer-readout']} aria-live="polite">
            <FlipUnit value={hours} label="HRS" />
            <span className={styles['timer-separator']}>:</span>
            <FlipUnit value={minutes} label="MIN" />
            <span className={styles['timer-separator']}>:</span>
            <FlipUnit value={seconds} label="SEC" />
          </div>
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
