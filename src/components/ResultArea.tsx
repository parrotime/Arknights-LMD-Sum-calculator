import React, { useState, useEffect, useMemo } from "react";
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
      <p className={styles['loading-text']}>计算中，请稍候...</p>
      {elapsed >= 2 && (
        <p className={styles['loading-elapsed']}>已等待 {elapsed} 秒</p>
      )}
    </div>
  );
};

interface CopyAllButtonProps {
  copyText: string;
}

const CopyAllButton = ({ copyText }: CopyAllButtonProps) => {
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
      aria-label={copied ? "已复制全部方案" : "复制全部方案"}
      aria-live="polite"
    >
      <img
        src={copied ? COPIED_ICON_URL : COPY_ICON_URL}
        alt=""
        className={styles['copy-all-icon']}
        loading="lazy"
        decoding="async"
      />
      <span className={styles['copy-all-text-desktop']}>{copied ? "COPIED ALL" : "COPY ALL"}</span>
      <span className={styles['copy-all-text-mobile']}>{copied ? "已复制全部" : "复制全部方案"}</span>
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
  const initialLMD = parseInt(state.num1) || 0;
  const allCopyText = useMemo(() => (
    buildAllPathsCopyText({
      paths: state.pathCache,
      initialLMD,
    })
  ), [initialLMD, state.pathCache]);

  return (
    <div className={panelStyles['history-box']}>
      <div className={`${panelStyles['title-bar']} ${styles['result-title-bar']}`}>
        <h1>// [03] 推荐方案</h1>
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
                  "从缓存读取"
                ) : (
                  <>
                    <span className={styles['result-summary-source-value-desktop']}>
                      计算耗时 {calcMeta?.elapsed ?? 0}ms
                    </span>
                    <span className={styles['result-summary-source-value-mobile']}>
                      耗时 {calcMeta?.elapsed ?? 0}ms
                    </span>
                  </>
                )}
              </span>
            </div>
            <div className={styles['result-summary-count']}>
              计算得到共 <strong>{state.pathCache.length}</strong> 个方案
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
