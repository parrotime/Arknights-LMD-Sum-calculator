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
  onClearLmdInput,
  settingsDirty,
}) => {
  // 实时计算差值
  const diffInfo = useMemo(() => computeDiff(state.num1, state.num2), [state.num1, state.num2]);
  const diffLabel = diffInfo
    ? diffInfo.value > 0
      ? "还需获得龙门币"
      : diffInfo.value < 0
        ? "还需消耗龙门币"
        : "无需调整龙门币"
    : "还需龙门币";

  const limitGroups = [
    {
      title: "理智类",
      code: "SANITY CATEGORY",
      row: "top",
      layout: "sanity",
      items: [
        {
          labelCn: "允许使用理智数量",
          labelEn: "PERMITTED SANITY",
          field: "sanityCount",
          max: 200,
          icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/san.webp",
        },
      ],
    },
    {
      title: "允许升级的干员人数",
      code: "ALLOWED OPERATOR PROMOTION COUNT",
      row: "top",
      layout: "elite",
      items: [
        {
          labelCn: "精零人数",
          labelEn: "ELITE-0",
          field: "upgrade0Count",
          max: 10,
          icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/elite_0.webp",
        },
        {
          labelCn: "精一人数",
          labelEn: "ELITE-I",
          field: "upgrade1Count",
          max: 10,
          icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/elite_1.webp",
        },
        {
          labelCn: "精二人数",
          labelEn: "ELITE-II",
          field: "upgrade2Count",
          max: 10,
          icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/elite_2.webp",
        },
      ],
    },
    {
      title: "贸易站赤金订单数",
      code: "TRADING POST PURE GOLD ORDERS",
      row: "bottom",
      layout: "trade",
      items: [
        {
          labelCn: "2赤金订单",
          labelEn: "ORDER-2",
          field: "trade2Count",
          max: 99,
          icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/Bskill_tra_flow_gs.webp",
        },
        {
          labelCn: "3赤金订单",
          labelEn: "ORDER-3",
          field: "trade3Count",
          max: 99,
          icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/Bskill_tra_wtcost1.webp",
        },
        {
          labelCn: "4赤金订单",
          labelEn: "ORDER-4",
          field: "trade4Count",
          max: 99,
          icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/Bskill_tra_wtcost2.webp",
        },
        {
          labelCn: "5赤金订单",
          labelEn: "ORDER-5",
          field: "trade5Count",
          max: 99,
          icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/Bskill_tra_against2.webp",
        },
      ],
    },
  ];

  // Enter 键触发计算
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !state.isCalculating) {
      handleCalculate(e);
    }
  };

  return (
  <div className={`${styles['content-panel']} ${styles['left-panel']}`}>
    <div className={styles['title-bar']}>
      <h1>// [01] 罗德岛物资清点 </h1>
      <p className={styles['title-code']}>RHODES ISLAND MATERIAL INVENTORY</p>
    </div>

    <div className={styles['main-content']}>
      <div className={`${styles['limit-section']} ${styles['lmd-section']}`}>
        <div className={styles['limit-block-title']}>
          <span className={styles['limit-block-title-main']}>龙门币统计清单</span>
          <span className={styles['limit-block-title-code']}>LMD INVENTORY</span>
        </div>
        <div className={styles['input-area-with-swap']}>
          <div className={styles['input-rows']}>
            <div className={`${styles['lmd-input-side']} ${styles['lmd-input-side-left']}`}>
              <img
                className={styles['lmd-prefix-icon']}
                src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/42.webp"
                alt=""
                aria-hidden="true"
              />
              <img
                className={styles['lmd-inventory-icon']}
                src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/lmd_logo.webp"
                alt=""
                aria-hidden="true"
              />
              <div className={styles['input-row']}>
                <div className={styles['input-field']} data-native-cursor="true">
                  <input
                    id="current-lmd-input"
                    type="text"
                    inputMode="numeric"
                    className={styles['input-box']}
                    placeholder=" "
                    value={state.num1}
                    onChange={(e) => handleInputChange(e, "num1")}
                    onKeyDown={handleKeyDown}
                  />
                  <label className={styles['input-label']} htmlFor="current-lmd-input">
                    请输入当前龙门币数量
                  </label>
                  {state.num1 && (
                    <button
                      type="button"
                      className={styles['input-clear-btn']}
                      onClick={() => onClearLmdInput("num1")}
                      title="清除当前龙门币数量"
                      aria-label="清除当前龙门币数量"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            <img
              className={styles['lmd-flow-icon']}
              src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/turn_right.webp"
              alt=""
              aria-hidden="true"
            />

            <div className={`${styles['lmd-input-side']} ${styles['lmd-input-side-right']}`}>
              <div className={styles['input-row']}>
                <div className={styles['input-field']} data-native-cursor="true">
                  <input
                    id="target-lmd-input"
                    type="text"
                    inputMode="numeric"
                    className={styles['input-box']}
                    placeholder=" "
                    value={state.num2}
                    onChange={(e) => handleInputChange(e, "num2")}
                    onKeyDown={handleKeyDown}
                  />
                  <label className={styles['input-label']} htmlFor="target-lmd-input">
                    请输入目标龙门币数量
                  </label>
                  {state.num2 && (
                    <button
                      type="button"
                      className={styles['input-clear-btn']}
                      onClick={() => onClearLmdInput("num2")}
                      title="清除目标龙门币数量"
                      aria-label="清除目标龙门币数量"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                className={styles['swap-btn']}
                onClick={onSwap}
                title="交换数字"
                aria-label="交换数字"
              >
                <img
                  className={styles['swap-icon']}
                  src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/exchange.webp"
                  alt=""
                  aria-hidden="true"
                />
              </button>

              <button
                type="button"
                className={`${styles['swap-btn']} ${styles['clean-btn']}`}
                onClick={onResetInputs}
                title="清空数字"
                aria-label="清空数字"
              >
                <img
                  className={styles['swap-icon']}
                  src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/clean.webp"
                  alt=""
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles['limit-section']}>
        <div className={styles['limit-block-title']}>
          <span className={styles['limit-block-title-main']}>数量限制</span>
          <span className={styles['limit-block-title-note']}>未输入时默认为不设置上限</span>
          <span className={styles['limit-block-title-code']}>LIMIT CONTROL</span>
        </div>
        <div className={styles['limit-category-list']}>
          <div className={styles['limit-category-row']}>
            {limitGroups.filter((group) => group.row === "top").map((group) => (
              <div className={`${styles['limit-category']} ${styles[`limit-category-${group.layout}`]}`} key={group.code}>
                <div className={styles['limit-category-header']}>
                  <span className={styles['limit-category-title']}>{group.title}</span>
                  <span className={styles['limit-category-code']}>{group.code}</span>
                </div>
                <div className={`${styles['limit-card-grid']} ${styles[`limit-card-grid-${group.layout}`]}`}>
                  {group.items.map(({ labelCn, labelEn, field, max, icon }) => (
                    <label className={styles['limit-card']} key={field}>
                      <img className={styles['limit-card-icon']} src={icon} alt="" aria-hidden="true" />
                      <span className={styles['limit-card-text']}>
                        <span className={styles['limit-card-label-cn']}>{labelCn}</span>
                        <span className={styles['limit-card-label-en']}>{labelEn}</span>
                      </span>
                      <span className={styles['limit-input-field']}>
                        <input
                          type="number"
                          className={styles['short-input-box']}
                          min="0"
                          max={max}
                          step="1"
                          placeholder="不限"
                          value={state[field] ?? ""}
                          onChange={(e) => handleUpgradeCountChange(e, field, 0, max)}
                        />
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {limitGroups.filter((group) => group.row === "bottom").map((group) => (
            <div className={`${styles['limit-category']} ${styles[`limit-category-${group.layout}`]}`} key={group.code}>
              <div className={styles['limit-category-header']}>
                <span className={styles['limit-category-title']}>{group.title}</span>
                <span className={styles['limit-category-code']}>{group.code}</span>
              </div>
              <div className={`${styles['limit-card-grid']} ${styles[`limit-card-grid-${group.layout}`]}`}>
                {group.items.map(({ labelCn, labelEn, field, max, icon }) => (
                  <label className={styles['limit-card']} key={field}>
                    <img className={styles['limit-card-icon']} src={icon} alt="" aria-hidden="true" />
                    <span className={styles['limit-card-text']}>
                      <span className={styles['limit-card-label-cn']}>{labelCn}</span>
                      <span className={styles['limit-card-label-en']}>{labelEn}</span>
                    </span>
                    <span className={styles['limit-input-field']}>
                      <input
                        type="number"
                        className={styles['short-input-box']}
                        min="0"
                        max={max}
                        step="1"
                        placeholder="不限"
                        value={state[field] ?? ""}
                        onChange={(e) => handleUpgradeCountChange(e, field, 0, max)}
                      />
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {settingsDirty && state.pathCache.length > 0 && (
        <div className={styles['settings-dirty-hint']}>
          设置发生更改，请重新计算结果
        </div>
      )}

      <div className={styles['operation-section']}>
        <div className={styles['limit-block-title']}>
          <span className={styles['limit-block-title-main']}>操作区域</span>
          <span className={styles['limit-block-title-code']}>OPERATION AREA</span>
        </div>
        <div className={styles['operation-row']}>
          <div className={`${styles['diff-section']} ${
            (state.error1 || state.error2 || state.differenceError)
              ? styles['diff-out-of-range']
              : diffInfo?.outOfRange ? styles['diff-out-of-range'] : ''
          }`}>
            <span className={styles['diff-label']}>{diffLabel}</span>
            <span className={styles['diff-value']}>
              {state.error1 || state.error2 || state.differenceError
                ? (state.error1 || state.error2 || state.differenceError)
                : diffInfo
                  ? (diffInfo.outOfRange
                      ? `${diffInfo.value}（超出 [-5000, 5000] 范围）`
                      : diffInfo.value)
                  : "—"}
            </span>
          </div>

          <div className={styles['action-buttons']}>
            <button
              className={`${styles['calculate-button']} ${styles['calculate-button-fast']}`}
              onClick={handleCalculate}
              disabled={state.isCalculating}
            >
              {state.isCalculating ? "计算中..." : "快速计算模式"}
            </button>
            <button
              className={`${styles['calculate-button']} ${styles['calculate-button-strong']}`}
              onClick={handleCalculate}
              disabled={state.isCalculating}
            >
              {state.isCalculating ? "计算中..." : "计算加强模式"}
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
  );
};

export default InputPanel;
