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
  handleChangePath,
  isBonusReady,
  activeImageUrl,
  calcError,
  calcMeta,
}) => (
  <div className={styles['history-box']}>
    {state.isCalculating ? (
      <LoadingTimer styles={styles} />
    ) : calcError ? (
      <div className={styles['calc-error-card']}>
        <div className={styles['calc-error-icon']}>!</div>
        <div className={styles['calc-error-text']}>{calcError}</div>
      </div>
    ) : state.pathCache.length > 0 ? (
      <div className={styles['fade-in']}>
        {calcMeta && (
          <div className={styles['calc-meta-badge']}>
            {calcMeta.fromCache
              ? "从缓存读取"
              : `计算耗时 ${calcMeta.elapsed}ms`}
          </div>
        )}
        <PathRenderer
          path={state.pathCache[state.currentPathIndex] || []}
          initialLMD={parseInt(state.num1) || 0}
          totalPaths={state.pathCache.length}
          currentIndex={state.currentPathIndex}
          onPrevPath={() => handleChangePath(-1)}
          onNextPath={() => handleChangePath(1)}
          isBonusReady={isBonusReady}
          activeImageUrl={activeImageUrl}
        />
      </div>
    ) : (
      <div className={styles['no-path']}>{""}</div>
    )}

    {state.pathCache.length > 0 &&
      state.clickCount >= 10 &&
      state.clickCount < 30 && (
        <div className={styles['change-over-text']}>
          <p>
            {state.clickCount < 20
              ? "已经尝试过所有路径"
              : "再按几次，好像有什么东西要出来了？"}
          </p>
        </div>
      )}
  </div>
);

export default ResultArea;
