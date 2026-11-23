import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react";
import type {
  CalcMode,
  CalculatorState,
  LimitInputField,
  LmdInputField,
} from "../types/calculator";
import LimitControlSection from "./LimitControlSection";
import OperationPanel from "./OperationPanel";
import SectionHeader from "./SectionHeader";
import panelStyles from "../assets/styles/PanelFrame.module.css";
import styles from "../assets/styles/InputPanel.module.css";

interface InputPanelProps {
  state: CalculatorState;
  handleInputChange: (event: ChangeEvent<HTMLInputElement>, field: LmdInputField) => void;
  handleUpgradeCountChange: (
    event: ChangeEvent<HTMLInputElement> | { target: { value: string } },
    field: LimitInputField,
    min: number,
    max: number,
  ) => void;
  handleCalculate: (event?: MouseEvent<HTMLElement> | KeyboardEvent<HTMLInputElement>, calcMode?: CalcMode) => void;
  onSwap: () => void;
  onResetInputs: () => void;
  onClearLmdInput: (field: LmdInputField) => void;
  onModeWarning?: () => void;
}

const InputPanel = ({
  state,
  handleInputChange,
  handleUpgradeCountChange,
  handleCalculate,
  onSwap,
  onResetInputs,
  onClearLmdInput,
  onModeWarning,
}: InputPanelProps) => {
  const { t } = useTranslation("calculator");
  const [selectedCalcMode, setSelectedCalcMode] = useState<CalcMode>("fast");

  // Enter 键触发计算
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !state.isCalculating) {
      handleCalculate(e, selectedCalcMode);
    }
  };

  return (
  <div className={`${panelStyles['content-panel']} ${styles['left-panel']}`}>
    <div className={panelStyles['title-bar']}>
      <h1>
        <span data-assistant-anchor="main-title">// [01] {t("input.title")}</span>
      </h1>
      <p className={panelStyles['title-code']}>RHODES ISLAND MATERIAL INVENTORY</p>
    </div>

    <div className={styles['main-content']}>
      <div className={styles['lmd-section']}>
        <SectionHeader title={t("input.inventory")} code="LMD INVENTORY" className={styles['lmd-block-title']} />
        <div className={styles['input-area-with-swap']}>
          <div className={styles['input-rows']}>
            <div className={`${styles['lmd-input-side']} ${styles['lmd-input-side-left']}`}>
              <img
                className={styles['lmd-prefix-icon']}
                src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/42.webp"
                alt=""
                aria-hidden="true"
                decoding="async"
              />
              <img
                className={styles['lmd-inventory-icon']}
                src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/lmd_logo.webp"
                alt=""
                aria-hidden="true"
                decoding="async"
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
                    {t("input.current")}
                  </label>
                  {state.num1 && (
                    <button
                      type="button"
                      className={styles['input-clear-btn']}
                      onClick={() => onClearLmdInput("num1")}
                      title={t("input.clearCurrent")}
                      aria-label={t("input.clearCurrent")}
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
              decoding="async"
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
                    {t("input.target")}
                  </label>
                  {state.num2 && (
                    <button
                      type="button"
                      className={styles['input-clear-btn']}
                      onClick={() => onClearLmdInput("num2")}
                      title={t("input.clearTarget")}
                      aria-label={t("input.clearTarget")}
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
                title={t("input.swap")}
                aria-label={t("input.swap")}
              >
                <img
                  className={styles['swap-icon']}
                  src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/exchange.webp"
                  alt=""
                  aria-hidden="true"
                  decoding="async"
                />
              </button>

              <button
                type="button"
                className={`${styles['swap-btn']} ${styles['clean-btn']}`}
                onClick={onResetInputs}
                title={t("input.reset")}
                aria-label={t("input.reset")}
              >
                <img
                  className={styles['swap-icon']}
                  src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/clean.webp"
                  alt=""
                  aria-hidden="true"
                  decoding="async"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <LimitControlSection
        state={state}
        handleUpgradeCountChange={handleUpgradeCountChange}
      />

      <OperationPanel
        state={state}
        selectedCalcMode={selectedCalcMode}
        onSelectedCalcModeChange={setSelectedCalcMode}
        handleCalculate={handleCalculate}
        onModeWarning={onModeWarning}
      />

    </div>
  </div>
  );
};

export default InputPanel;
