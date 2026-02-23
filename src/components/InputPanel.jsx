import React from "react";

const InputPanel = ({
  state,
  styles,
  handleInputChange,
  handleUpgradeCountChange,
  handleCalculate,
}) => (
  <div className={`${styles['content-panel']} ${styles['left-panel']}`}>
    <div className={styles['title-bar']}>
      <h1>龙门币凑数计算器</h1>
    </div>

    <div className={styles['left-panel-title-container']}>
      <div className={styles['title-text']}>
        请输入两个[0,99999999]区间的整数
      </div>
      <div className={styles['title-text']}>且两数差值处于[-5000,5000]区间</div>
    </div>

    <div className={styles['main-content']}>
      <div className={styles['input-container']}>
        <div className={styles['input-group-horizontal']}>
          <div className={styles['input-group']}>
            <div className={styles['input-wrapper-text']}>当前龙门币数量:</div>
            <div className={styles['input-wrapper']}>
              <input
                type="text"
                className={styles['input-box']}
                placeholder="请输入数字"
                value={state.num1}
                onChange={(e) => handleInputChange(e, "num1")}
              />
              {state.error1 && (
                <div className={styles['error-message']}>{state.error1}</div>
              )}
            </div>
          </div>

          <div className={styles['input-group']}>
            <div className={styles['input-wrapper-text']}>目标龙门币数量:</div>
            <div className={styles['input-wrapper']}>
              <input
                type="text"
                className={styles['input-box']}
                placeholder="请输入数字"
                value={state.num2}
                onChange={(e) => handleInputChange(e, "num2")}
              />
              {state.error2 && (
                <div className={styles['error-message']}>{state.error2}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles['upgrade-count-container']}>
        {[
          { label: "允许升级的精零干员数量：", field: "upgrade0Count", max: 10 },
          { label: "允许升级的精一干员数量：", field: "upgrade1Count", max: 10 },
          { label: "允许升级的精二干员数量：", field: "upgrade2Count", max: 10 },
          { label: "允许升级的理智的数量：", field: "sanityCount", max: 200 },
        ].map(({ label, field, max }) => (
          <div className={styles['toggle-container']} key={field}>
            <div className={styles['toggle-text']}>{label}</div>
            <input
              type="number"
              className={styles['short-input-box']}
              min="0"
              max={max}
              step="1"
              placeholder={`0~${max}`}
              value={state[field]}
              onChange={(e) => handleUpgradeCountChange(e, field, 0, max)}
            />
          </div>
        ))}
      </div>

      <button
        className={styles['calculate-button']}
        onClick={handleCalculate}
        disabled={state.isCalculating}
      >
        {state.isCalculating ? "计算中..." : "立即计算"}
      </button>

      <div className={styles['result-section']}>
        <div className={styles['output-wrapper-text']}>
          计算得到还需要龙门币数量:
        </div>
        <div className={styles['result-container']}>
          <input
            type="text"
            className={styles['result-box']}
            placeholder="两者相差"
            value={state.result}
            readOnly
          />
        </div>
        {state.differenceError && (
          <div className={styles['error-message']}>{state.differenceError}</div>
        )}
      </div>

      <div className={styles['usage-guide']}>
        <div className={styles['notice-title']}>注意事项</div>
        <div className={styles['notice-content']}>
          1.点击"立即计算"按钮开始计算，点击页面底部参考路径方案中的"上一路径"和"下一路径"按钮可以切换路径方案。
          <br />
          2.设置面板中的开关调整之后，需要重新点击"立即计算"按钮才会生效。
          如果点击"立即计算"之后不起作用，建议重新点击或者刷新一下网页。
          对于某些较大的数字可能存在计算较慢的现象，但一般5秒左右能计算出结果。后续会继续优化计算速度。
        </div>
      </div>
    </div>
  </div>
);

export default InputPanel;
