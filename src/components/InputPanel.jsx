import React, { useState, useMemo } from "react";
import { computeDiff } from "../utils/calcLogic";
import LimitWheelInput from "./LimitWheelInput";
import panelStyles from "../assets/styles/PanelFrame.module.css";
import styles from "../assets/styles/InputPanel.module.css";

const WHEEL_LIMIT_FIELDS = new Set([
  "upgrade0Count",
  "upgrade1Count",
  "upgrade2Count",
  "trade2Count",
  "trade3Count",
  "trade4Count",
  "trade5Count",
]);

const InputPanel = ({
  state,
  handleInputChange,
  handleUpgradeCountChange,
  handleCalculate,
  onSwap,
  onResetInputs,
  onClearLmdInput,
}) => {
  const [pressedCalculate, setPressedCalculate] = useState(null);

  // 实时计算差值
  const diffInfo = useMemo(() => computeDiff(state.num1, state.num2), [state.num1, state.num2]);
  const diffAmount = diffInfo ? Math.abs(diffInfo.value).toLocaleString("zh-CN") : "";
  const hasInputError = !!(state.error1 || state.error2);
  const isDiffOutOfRange = hasInputError || diffInfo?.outOfRange;
  const diffText = hasInputError || diffInfo?.outOfRange
    ? "超出范围"
    : diffInfo
      ? diffInfo.value > 0
        ? `需获取 ${diffAmount} 龙门币`
        : diffInfo.value < 0
          ? `需消耗 ${diffAmount} 龙门币`
          : "无需变化"
      : "—";
  const diffToneClass = diffInfo
    ? diffInfo.value > 0
      ? styles['diff-gain']
      : diffInfo.value < 0
        ? styles['diff-spend']
        : styles['diff-zero']
    : "";

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
          max: 210,
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
          max: 10,
          icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/Bskill_tra_flow_gs.webp",
        },
        {
          labelCn: "3赤金订单",
          labelEn: "ORDER-3",
          field: "trade3Count",
          max: 10,
          icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/Bskill_tra_wtcost1.webp",
        },
        {
          labelCn: "4赤金订单",
          labelEn: "ORDER-4",
          field: "trade4Count",
          max: 10,
          icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/Bskill_tra_wtcost2.webp",
        },
        {
          labelCn: "5赤金订单",
          labelEn: "ORDER-5",
          field: "trade5Count",
          max: 10,
          icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/Bskill_tra_against2.webp",
        },
      ],
    },
  ];

  // Enter 键触发计算
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !state.isCalculating) {
      handleCalculate(e, 'fast');
    }
  };

  const handleCalculateClick = (e, mode) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const originX = e.clientX
      ? `${e.clientX - rect.left}px`
      : "50%";

    e.currentTarget.style.setProperty("--confirm-origin-x", originX);
    setPressedCalculate(null);
    requestAnimationFrame(() => setPressedCalculate(mode));
    handleCalculate(e, mode);
  };

  const handleLimitWheelChange = (field, value, max) => {
    handleUpgradeCountChange({ target: { value } }, field, 0, max);
  };

  const renderLimitInput = ({ labelCn, field, max }) => {
    if (WHEEL_LIMIT_FIELDS.has(field)) {
      return (
        <LimitWheelInput
          value={state[field] ?? ""}
          min={0}
          max={max}
          placeholder="不限"
          ariaLabel={`${labelCn}数量限制`}
          onChange={(value) => handleLimitWheelChange(field, value, max)}
        />
      );
    }

    return (
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
    );
  };

  return (
  <div className={`${panelStyles['content-panel']} ${styles['left-panel']}`}>
    <div className={panelStyles['title-bar']}>
      <h1>
        <span data-assistant-anchor="main-title">// [01] 罗德岛物资清点</span>
      </h1>
      <p className={panelStyles['title-code']}>RHODES ISLAND MATERIAL INVENTORY</p>
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
          <span className={styles['limit-block-title-note']}>未输入时采用后端默认上限</span>
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
                        {renderLimitInput({ labelCn, field, max })}
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
                      {renderLimitInput({ labelCn, field, max })}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles['operation-section']}>
        <div className={styles['limit-block-title']}>
          <span className={styles['limit-block-title-main']}>操作区域</span>
          <span className={styles['limit-block-title-code']}>OPERATION AREA</span>
        </div>
        <div className={styles['operation-row']}>
          <div className={`${styles['diff-section']} ${
            isDiffOutOfRange ? styles['diff-out-of-range'] : diffToneClass
          }`}>
            <span className={styles['diff-value']}>{diffText}</span>
          </div>

          <div className={styles['action-buttons']}>
            <button
              className={`${styles['calculate-button']} ${styles['calculate-button-fast']} ${
                pressedCalculate === 'fast' ? styles['calculate-button-confirming'] : ''
              }`}
              onClick={(e) => handleCalculateClick(e, 'fast')}
              onAnimationEnd={() => setPressedCalculate(null)}
              disabled={state.isCalculating}
            >
              {state.isCalculating ? "计算中..." : "快速计算模式"}
            </button>
            <button
              className={`${styles['calculate-button']} ${styles['calculate-button-strong']} ${
                pressedCalculate === 'strong' ? styles['calculate-button-confirming'] : ''
              }`}
              onClick={(e) => handleCalculateClick(e, 'strong')}
              onAnimationEnd={() => setPressedCalculate(null)}
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
