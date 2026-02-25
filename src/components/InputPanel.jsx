import React, { useMemo } from "react";
import { computeDiff } from "../utils/calcLogic";

const InputPanel = ({
  state,
  styles,
  handleInputChange,
  handleUpgradeCountChange,
  handleCalculate,
  onSwap,
  onResetInputs,
  settingsDirty,
}) => {
  // 实时计算差值
  const diffInfo = useMemo(() => computeDiff(state.num1, state.num2), [state.num1, state.num2]);

  // Enter 键触发计算
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !state.isCalculating) {
      handleCalculate(e);
    }
  };

  return (
  <div className={`${styles['content-panel']} ${styles['left-panel']}`}>
    <div className={styles['title-bar']}>
      <h1>龙门币凑数计算器</h1>
    </div>

    <div className={styles['info-banner']}>
      <span className={styles['info-icon']}>ℹ</span>
      <div className={styles['info-lines']}>
        <span>输入范围：两个 [0, 999999999] 区间的整数</span>
        <span>差值范围：两数之差需在 [-5000, 5000] 区间内</span>
      </div>
    </div>

    <div className={styles['main-content']}>
      <div className={styles['input-area-with-swap']}>
        <div className={styles['input-rows']}>
          <div className={styles['input-row']}>
            <label className={styles['input-label']}>当前龙门币数量</label>
            <div className={styles['input-field']}>
              <input
                type="text"
                className={styles['input-box']}
                placeholder="请输入数字"
                value={state.num1}
                onChange={(e) => handleInputChange(e, "num1")}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          <button
            type="button"
            className={styles['swap-btn']}
            onClick={onSwap}
            title="交换当前与目标数值"
          >
            交换
          </button>

          <div className={styles['input-row']}>
            <label className={styles['input-label']}>目标龙门币数量</label>
            <div className={styles['input-field']}>
              <input
                type="text"
                className={styles['input-box']}
                placeholder="请输入数字"
                value={state.num2}
                onChange={(e) => handleInputChange(e, "num2")}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles['limit-section']}>
        <div className={styles['limit-title']}>数量限制</div>
        <div className={styles['limit-grid']}>
          {[
            { label: "允许升级精零干员数量", field: "upgrade0Count", max: 10 },
            { label: "允许升级精一干员数量", field: "upgrade1Count", max: 10 },
            { label: "允许升级精二干员数量", field: "upgrade2Count", max: 10 },
            { label: "允许使用理智数量", field: "sanityCount", max: 200 },
          ].map(({ label, field, max }) => (
            <div className={styles['limit-item']} key={field}>
              <span className={styles['limit-label']}>{label}</span>
              <input
                type="number"
                className={styles['short-input-box']}
                min="0"
                max={max}
                step="1"
                placeholder="不限"
                value={state[field]}
                onChange={(e) => handleUpgradeCountChange(e, field, 0, max)}
              />
            </div>
          ))}
        </div>
      </div>

      {settingsDirty && state.pathCache.length > 0 && (
        <div className={styles['settings-dirty-hint']}>
          设置已更改，请重新计算
        </div>
      )}

      <div className={styles['action-buttons']}>
        <button
          type="button"
          className={styles['reset-inputs-btn']}
          onClick={onResetInputs}
        >
          清空
        </button>
        <button
          className={styles['calculate-button']}
          onClick={handleCalculate}
          disabled={state.isCalculating}
        >
          {state.isCalculating ? "计算中..." : "立即计算"}
        </button>
      </div>

      <div className={styles['diff-section']}>
        <div className={styles['diff-label']}>还需龙门币:</div>
        <div className={`${styles['diff-value']} ${
          (state.error1 || state.error2 || state.differenceError)
            ? styles['diff-out-of-range']
            : diffInfo?.outOfRange ? styles['diff-out-of-range'] : ''
        }`}>
          {state.error1 || state.error2 || state.differenceError
            ? (state.error1 || state.error2 || state.differenceError)
            : diffInfo
              ? (diffInfo.outOfRange
                  ? `${diffInfo.value}（超出 [-5000, 5000] 范围）`
                  : diffInfo.value)
              : "—"}
        </div>
      </div>

      <div className={styles['usage-guide']}>
        <div className={styles['notice-title']}>注意事项</div>
        <div className={styles['notice-content']}>
          <p>1.点击"立即计算"按钮开始计算，点击页面底部参考路径方案中的"上一方案"和"下一方案"按钮可以切换路径方案。</p>
          <p>2.设置面板中的开关调整之后，需要重新点击"立即计算"按钮才会生效。
          如果点击"立即计算"之后不起作用，建议重新点击或者刷新一下网页。
          对于某些较大的数字可能存在计算较慢的现象，但一般5秒左右能计算出结果。后续会继续优化计算速度。</p>
        </div>
      </div>
    </div>
  </div>
  );
};

export default InputPanel;
