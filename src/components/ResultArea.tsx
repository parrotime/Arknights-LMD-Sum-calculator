import React, { useState, useEffect, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import PathRenderer, { buildAllPathsCopyText } from "./PathRenderer";
import type { CalcMeta, CalculatorState } from "../types/calculator";
import panelStyles from "../assets/styles/PanelFrame.module.css";
import styles from "../assets/styles/ResultArea.module.css";

const COPY_ICON_URL = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/duplication.webp";
const COPIED_ICON_URL = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/bq10.webp";

type ResultAreaStyles = typeof styles;

interface LoadingTimerProps {
  styles: ResultAreaStyles;
}

// 加载计时器子组件
const LoadingTimer = ({ styles }: LoadingTimerProps) => {
  const { t } = useTranslation("results");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles['loading-container']}>
      <div className={styles['pulse-dots']}>
        <span className={styles['pulse-dot']} />
        <span className={styles['pulse-dot']} />
        <span className={styles['pulse-dot']} />
      </div>
      <p className={styles['loading-text']}>{t("loading")}</p>
      {elapsed >= 2 && (
        <p className={styles['loading-elapsed']}>{t("wait", { seconds: elapsed })}</p>
      )}
    </div>
  );
};

interface CopyAllButtonProps {
  copyText: string;
}

const CopyAllButton = ({ copyText }: CopyAllButtonProps) => {
  const { t } = useTranslation("results");
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    if (!copyText) return;

    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <button
      type="button"
      className={copied ? styles['copy-all-btn-done'] : styles['copy-all-btn']}
      onClick={handleCopyAll}
      aria-label={t(copied ? "copiedAll" : "copyAll")}
      aria-live="polite"
    >
      <img
        src={copied ? COPIED_ICON_URL : COPY_ICON_URL}
        alt=""
        className={styles['copy-all-icon']}
        loading="lazy"
        decoding="async"
      />
      <span className={styles['copy-all-text-desktop']}>{t(copied ? "copiedAllDesktop" : "copyAllDesktop")}</span>
      <span className={styles['copy-all-text-mobile']}>{t(copied ? "copiedAllMobile" : "copyAll")}</span>
    </button>
  );
};

interface ResultAreaProps {
  state: CalculatorState;
  calcError: string;
  calcMeta: CalcMeta | null;
}

const ResultArea = ({
  state,
  calcError,
  calcMeta,
}: ResultAreaProps) => {
  const { t, i18n } = useTranslation("results");
  const language = i18n.resolvedLanguage;
  const initialLMD = parseInt(state.num1) || 0;
  const allCopyText = useMemo(() => (
    buildAllPathsCopyText({
      paths: state.pathCache,
      initialLMD,
      t,
      language,
    })
  ), [initialLMD, state.pathCache, t, language]);

  return (
    <div className={panelStyles['history-box']}>
      <div className={`${panelStyles['title-bar']} ${styles['result-title-bar']}`}>
        <h1>// [03] {t("title")}</h1>
        <p className={panelStyles['title-code']}>RECOMMENDED PLAN</p>
      </div>

      {state.isCalculating ? (
        <LoadingTimer styles={styles} />
      ) : calcError ? (
        <div className={styles['calc-error-card']}>
          <div className={styles['calc-error-icon']}>!</div>
          <div className={styles['calc-error-text']}>{calcError}</div>
        </div>
      ) : state.pathCache.length > 0 ? (
        <div className={styles['fade-in']}>
          <div className={styles['result-summary-bar']}>
            <div className={styles['result-summary-source']}>
              <span className={styles['result-summary-source-label']}>
                {calcMeta?.fromCache ? "CACHE" : "TIME"}
              </span>
              <span className={styles['result-summary-source-value']}>
                {calcMeta?.fromCache ? (
                  t("cache")
                ) : (
                  <>
                    <span className={styles['result-summary-source-value-desktop']}>
                      {t("elapsed", { ms: calcMeta?.elapsed ?? 0 })}
                    </span>
                    <span className={styles['result-summary-source-value-mobile']}>
                      {t("elapsedShort", { ms: calcMeta?.elapsed ?? 0 })}
                    </span>
                  </>
                )}
              </span>
            </div>
            <div className={styles['result-summary-count']}>
              <Trans
                ns="results"
                t={t}
                i18nKey="count"
                values={{ count: state.pathCache.length }}
                components={{ total: <strong /> }}
              />
            </div>
            <CopyAllButton copyText={allCopyText} />
          </div>

          <PathRenderer
            paths={state.pathCache}
            initialLMD={initialLMD}
          />
        </div>
      ) : null}
    </div>
  );
};

export default ResultArea;
