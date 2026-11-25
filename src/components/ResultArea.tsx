import React, { useState, useEffect, useMemo, useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import PathRenderer, { buildAllPathsCopyText } from "./PathRenderer";
import { getItemById } from "../DataService";
import { computeRunningTotals, computeStepData } from "../utils/calcLogic";
import { buildResultSignature } from "../utils/calculatorPersistence";
import type { CalculationPath, CalculatorState } from "../types/calculator";
import panelStyles from "../assets/styles/PanelFrame.module.css";
import styles from "../assets/styles/ResultArea.module.css";

const COPY_ICON_URL = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/duplication.webp";
const COPIED_ICON_URL = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/bq10.webp";
const EMPTY_PATHS: CalculationPath[] = [];

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
      <span className={styles['copy-all-text']} aria-hidden="true">
        <span className={copied ? styles['copy-all-text-hidden'] : undefined}>{t("copyAll")}</span>
        <span className={copied ? undefined : styles['copy-all-text-hidden']}>{t("copiedAllShort")}</span>
      </span>
    </button>
  );
};

interface ResultAreaProps {
  state: CalculatorState;
}

const ResultArea = ({ state }: ResultAreaProps) => {
  const { t, i18n } = useTranslation("results");
  const { t: translateError } = useTranslation("errors");
  const { calcError, lastResult, resultVersion } = state;
  const isStale = !!lastResult && lastResult.signature !== buildResultSignature(state);
  const language = i18n.resolvedLanguage;
  const initialLMD = lastResult?.initialLMD ?? 0;
  const paths = lastResult?.paths ?? EMPTY_PATHS;
  const planListRef = useRef<HTMLDivElement>(null);
  const [enteredVersion, setEnteredVersion] = useState<number | null>(null);
  const isEntryPending = paths.length > 0 && enteredVersion === null &&
    typeof IntersectionObserver !== "undefined";
  const calcMeta = lastResult?.meta;
  const { steps } = computeStepData(paths[0] ?? [], getItemById);
  const balances = computeRunningTotals(steps, initialLMD);
  const finalLMD = balances[balances.length - 1] ?? initialLMD;
  const allCopyText = useMemo(() => (
    buildAllPathsCopyText({
      paths,
      initialLMD,
      t,
      language,
    })
  ), [initialLMD, paths, t, language]);

  useEffect(() => {
    if (!isEntryPending) return;
    const planList = planListRef.current;
    if (!planList) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || !planList.isConnected) return;
      observer.disconnect();
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setEnteredVersion(reducedMotion ? -1 : resultVersion);
    }, { rootMargin: "0px 0px -24px 0px" });
    observer.observe(planList);
    return () => observer.disconnect();
  }, [isEntryPending, resultVersion]);

  return (
    <div className={`${panelStyles['history-box']} ${styles['result-area']}`}>
      <div className={`${panelStyles['title-bar']} ${styles['result-title-bar']}`}>
        <h1>// [03] {t("title")}</h1>
      </div>

      {state.isCalculating ? (
        <LoadingTimer styles={styles} />
      ) : calcError ? (
        <div className={styles['calc-error-card']}>
          <div className={styles['calc-error-icon']}>!</div>
          <div className={styles['calc-error-text']} role="alert">
            {calcError.key === "request" ? translateError("request", { status: calcError.status }) : translateError(calcError.key)}
          </div>
        </div>
      ) : null}
      <div role="status">
        {isStale && <p className={styles['stale-notice']}>{t("staleNotice")}</p>}
      </div>
      {paths.length > 0 && (
        <div
          key={resultVersion}
          className={isStale ? styles['stale-results'] : undefined}
          data-result-enter={isEntryPending ? "pending" : enteredVersion === resultVersion ? "playing" : undefined}
        >
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
            <CopyAllButton copyText={allCopyText} />
            <div className={styles['result-summary-details']}>
              <div className={styles['result-summary-count']}>
                <Trans
                  ns="results"
                  t={t}
                  i18nKey="count"
                  values={{ count: paths.length }}
                  components={{ total: <strong /> }}
                />
              </div>
              <div className={styles['result-summary-balance']}>
                <span>{t("balance")}</span>
                <span className={styles['result-summary-values']}>
                  <strong>{initialLMD}</strong>
                  <span aria-hidden="true">→</span>
                  <strong>{finalLMD}</strong>
                </span>
              </div>
            </div>
          </div>

          <PathRenderer
            paths={paths}
            initialLMD={initialLMD}
            listRef={planListRef}
          />
        </div>
      )}
    </div>
  );
};

export default ResultArea;
