import React from "react";
import PathRenderer from "./PathRenderer";

const ResultArea = ({
  state,
  styles,
  handleChangePath,
  isBonusReady,
  activeImageUrl,
}) => (
  <div className={styles['history-box']}>
    {state.isCalculating ? (
      <div className={styles['loading-container']}>
        <div className={styles['progress-bar']}>
          <div className={styles['progress-bar-fill']}></div>
        </div>
        <p>正在计算路径，请稍候...</p>
      </div>
    ) : state.pathCache.length > 0 ? (
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
