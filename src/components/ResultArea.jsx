import React, { useState, useEffect } from "react";
import PathRenderer from "./PathRenderer";

// 加载计时器子组件
const LoadingTimer = ({ styles }) => {
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

const ResultArea = ({
  state,
  styles,
  activeImageUrl,
  calcError,
  calcMeta,
}) => (
  <div className={styles['history-box']}>
    <div className={`${styles['title-bar']} ${styles['result-title-bar']}`}>
      {calcMeta && !state.isCalculating && !calcError && (
        <div className={styles['calc-meta-badge']}>
          <span className={styles['calc-meta-label']}>
            {calcMeta.fromCache ? "CACHE" : "TIME"}
          </span>
          <span className={styles['calc-meta-value']}>
            {calcMeta.fromCache ? "从缓存读取" : `${calcMeta.elapsed}ms`}
          </span>
        </div>
      )}
      <h1>// [03] 推荐方案</h1>
      <p className={styles['title-code']}>RECOMMENDED PLAN</p>
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
        <PathRenderer
          paths={state.pathCache}
          initialLMD={parseInt(state.num1) || 0}
          activeImageUrl={activeImageUrl}
        />
      </div>
    ) : null}
  </div>
);

export default ResultArea;
