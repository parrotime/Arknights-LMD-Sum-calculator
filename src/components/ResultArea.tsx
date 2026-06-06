import React, { useState, useEffect } from "react";
import PathRenderer from "./PathRenderer";
import type { CalcMeta, CalculatorState } from "../types/calculator";
import panelStyles from "../assets/styles/PanelFrame.module.css";
import styles from "../assets/styles/ResultArea.module.css";

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
      <p className={styles['loading-text']}>正在计算路径，请稍候...</p>
      {elapsed >= 2 && (
        <p className={styles['loading-elapsed']}>已等待 {elapsed} 秒</p>
      )}
    </div>
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
          </div>

          <PathRenderer
            paths={state.pathCache}
            initialLMD={parseInt(state.num1) || 0}
          />
        </div>
      ) : null}
    </div>
  );
};

export default ResultArea;
