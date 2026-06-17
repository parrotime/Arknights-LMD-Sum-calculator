import InputPanel from "./InputPanel";
import SettingsPanel from "./SettingsPanel";
import ResultArea from "./ResultArea";
import { SettingsWarningModal } from "./EasterEggs";
import { useCalculatorController } from "./useCalculatorController";
import styles from "../assets/styles/App.module.css";
import type { AssistantEggPayload } from "../types/calculator";

interface MainCalculatorProps {
  onAssistantEgg?: (payload: AssistantEggPayload | null) => void;
}

const MainCalculator = ({ onAssistantEgg }: MainCalculatorProps) => {
  const {
    state,
    showModal,
    setShowModal,
    heartsElement,
    showAssistantText,
    handleToggleChange,
    handleResetSettings,
    handleSwapNums,
    handleResetInputs,
    handleClearLmdInput,
    handleInputChange,
    handleUpgradeCountChange,
    handleCalculate,
  } = useCalculatorController({ onAssistantEgg });

  return (
    <>
      <div className={styles['input-area']}>
        <div className={styles['main-container']}>
          <div className={styles['main-content-container']}>
            <InputPanel
              state={state}
              handleInputChange={handleInputChange}
              handleUpgradeCountChange={handleUpgradeCountChange}
              handleCalculate={handleCalculate}
              onSwap={handleSwapNums}
              onResetInputs={handleResetInputs}
              onClearLmdInput={handleClearLmdInput}
              onModeWarning={(message: string) => showAssistantText(message, "high")}
            />
            <SettingsPanel
              settings={state.settings}
              onToggle={handleToggleChange}
              onReset={handleResetSettings}
            />
          </div>
          <ResultArea
            state={state}
            calcError={state.calcError}
            calcMeta={state.calcMeta}
          />
        </div>
      </div>

      {showModal && (
        <SettingsWarningModal
          settings={state.settings}
          onClose={() => setShowModal(false)}
          styles={styles}
        />
      )}
      {heartsElement}
    </>
  );
};

export default MainCalculator;
