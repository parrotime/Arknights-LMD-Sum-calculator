import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import pathRendererStyles from "../assets/styles/PathRenderer.module.css";
import styles from "../assets/styles/Maintenance.module.css";
import type { SamplePlan } from "../utils/samplePlans";
import {
  acquireSamplePlans,
  consumeSamplePlans,
  renderSamplePathCards,
} from "../utils/samplePlans";

interface MaintenanceStatusResponse {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  endAt?: string;
  serverTime?: string;
}

interface MaintenanceStatusState {
  loading: boolean;
  error: boolean;
  enabled: boolean;
  title: string;
  subtitle: string;
  endAtMs: number | null;
  serverOffsetMs: number;
}

interface FlipUnitProps {
  value: string;
  label: string;
  unit: string;
}

const fetchMaintenanceStatus = async (): Promise<MaintenanceStatusResponse> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL || ""}/maintenance-status`, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`maintenance status request failed: ${response.status}`);
  }

  return response.json();
};

const formatTimeParts = (milliseconds: number): string[] => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0"));
};

const FlipUnit = ({ value, label, unit }: FlipUnitProps) => (
  <span className={styles['timer-unit']} aria-label={`${value} ${unit}`}>
    <span key={value} className={styles['timer-number']}>{value}</span>
    <span className={styles['timer-label']}>{label}</span>
  </span>
);

const MaintenancePage = () => {
  const { t } = useTranslation("maintenance");
  const [status, setStatus] = useState<MaintenanceStatusState>({
    loading: true,
    error: false,
    enabled: false,
    title: "",
    subtitle: "",
    endAtMs: null,
    serverOffsetMs: 0,
  });
  const [remainingMs, setRemainingMs] = useState(0);
  const [hours, minutes, seconds] = formatTimeParts(remainingMs);
  const hasCountdown = status.enabled && status.endAtMs !== null;
  const maintenanceCopy = (value: string, key: "maintenanceTitle" | "maintenanceSubtitle") =>
    value && value !== t(key, { lng: "zh-CN" }) ? value : t(key);
  const title = status.loading ? t("loadingTitle") : status.enabled
    ? maintenanceCopy(status.title, "maintenanceTitle")
    : t("normalTitle");
  const subtitle = status.loading ? t("loadingSubtitle") : status.enabled
    ? maintenanceCopy(status.subtitle, "maintenanceSubtitle")
    : t("normalSubtitle");
  const timerLabel = t(status.enabled ? "timer" : "status");

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
          title: data.title || "",
          subtitle: data.subtitle || "",
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
          title: "",
          subtitle: "",
          endAtMs: null,
          serverOffsetMs: 0,
        });
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!status.enabled || status.endAtMs === null) {
      setRemainingMs(0);
      return undefined;
    }

    const endAtMs = status.endAtMs;
    const tick = () => {
      const correctedNow = Date.now() + status.serverOffsetMs;
      setRemainingMs(endAtMs - correctedNow);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [status.enabled, status.endAtMs, status.serverOffsetMs]);

  const renderMaintenanceSamples = (data: SamplePlan[]) => renderSamplePathCards({
    data,
    localized: true,
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
            {t(status.loading ? "syncing" : status.error ? "unreachable" : status.enabled ? "maintaining" : "online")}
          </span>
          <h1 id="maintenance-title">{title}</h1>
          <p>{subtitle}</p>
        </section>

        <section className={styles['contact-panel']} aria-label={t("contactLabel")}>
          <span className={styles['contact-code']}>CONTACT</span>
          <p>
            <Trans
              ns="maintenance"
              t={t}
              i18nKey="contact"
              components={{
                message: <a href="https://space.bilibili.com/32772539" target="_blank" rel="noopener noreferrer" />,
                survey: <a href="https://v.wjx.cn/vm/wJwEJn8.aspx#" target="_blank" rel="noopener noreferrer" />,
                detailsLink: <a href="https://docs.qq.com/sheet/DT2hmVUhLbHVxYUtC?tab=BB08J2" target="_blank" rel="noopener noreferrer" />,
              }}
            />
          </p>
        </section>

        <section className={styles['timer-panel']} aria-label={timerLabel}>
          <div className={styles['timer-copy']}>
            <span>{timerLabel}</span>
            <strong>{status.enabled ? "MAINTENANCE TIMER" : "MAINTENANCE SWITCH"}</strong>
          </div>
          {hasCountdown ? (
            <div className={styles['timer-readout']} aria-live="polite">
              <FlipUnit value={hours} label="HRS" unit={t("hours")} />
              <span className={styles['timer-separator']}>:</span>
              <FlipUnit value={minutes} label="MIN" unit={t("minutes")} />
              <span className={styles['timer-separator']}>:</span>
              <FlipUnit value={seconds} label="SEC" unit={t("seconds")} />
            </div>
          ) : (
            <div className={`${styles['timer-readout']} ${styles['status-readout']}`} aria-live="polite">
              <strong>{t(status.loading ? "syncing" : status.error ? "unreachable" : status.enabled ? "waiting" : "standby")}</strong>
              <span>
                {t(status.loading
                  ? "reading"
                  : status.error
                    ? "offline"
                    : status.enabled
                      ? "noEnd"
                      : "inactive")}
              </span>
            </div>
          )}
        </section>

        <section className={styles['sample-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-code']}>OFFLINE 01</span>
            <div>
              <h2>{t("acquire")}</h2>
              <p>OFFLINE REFERENCE / ACQUIRE</p>
            </div>
          </div>
          <div className={styles['section-content']}>
            <p className={styles['sample-note']}>
              {t("acquireNote")}
            </p>
            {renderMaintenanceSamples(acquireSamplePlans)}
          </div>
        </section>

        <section className={styles['sample-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-code']}>OFFLINE 02</span>
            <div>
              <h2>{t("consume")}</h2>
              <p>OFFLINE REFERENCE / CONSUME</p>
            </div>
          </div>
          <div className={styles['section-content']}>
            <p className={styles['sample-note']}>
              {t("consumeNote")}
            </p>
            {renderMaintenanceSamples(consumeSamplePlans)}
          </div>
        </section>
      </main>
    </div>
  );
};

export default MaintenancePage;
