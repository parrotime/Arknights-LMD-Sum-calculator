import React, { useCallback, useEffect, useReducer, useState } from "react";
import type { ChangeEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useCursorState } from "./CursorContext";
import {
  funnyImageUrl,
  memory350234ImageUrl,
  zc325ImageUrl,
  sami325ImageUrl,
  typhoon799ImageUrls,
  TYPHOON_799_PEEK,
  isRomanticNumber,
  isFunnyNumber,
  isMemory350234Number,
  isZc325Number,
  isSami325Number,
  isTyphoon799Number,
  useHeartEffect,
} from "./EasterEggs";
import { validateInput, buildLimits, buildCacheKey } from "../utils/calcLogic";
import {
  buildDefaultSettings,
  getInitialState,
  persistCalculatorState,
} from "../utils/calculatorPersistence";
import {
  callCalculatorApi,
  checkPathCache,
  formatCalculatorError,
  savePathCache,
} from "../utils/calculatorApi";
import type {
  AssistantEggPayload,
  AssistantEggPriority,
  CalcMeta,
  CalcMode,
  CalculationPath,
  CalculatorHistoryEntry,
  CalculatorSettings,
  CalculatorState,
  LimitInputField,
  LmdInputField,
} from "../types/calculator";

type SettingKey = keyof CalculatorSettings;
type ErrorField = "error1" | "error2" | "differenceError";
type CalculateTriggerEvent = MouseEvent<HTMLElement> | KeyboardEvent<HTMLInputElement>;
type HeartEffectTrigger = (event?: CalculateTriggerEvent | Event) => void;

type CalculatorAction =
  | { type: "SET_NUM"; field: LmdInputField; value: string }
  | { type: "CLEAR_LMD_INPUT"; field: LmdInputField }
  | { type: "SET_ERROR"; field: ErrorField; value: string }
  | { type: "SET_RESULT"; value: string }
  | { type: "SET_CALC_ERROR"; value: string }
  | { type: "SET_CALC_META"; value: CalcMeta | null }
  | { type: "SET_PATHS"; paths: CalculationPath[] }
  | { type: "APPEND_HISTORY"; entry: CalculatorHistoryEntry }
  | { type: "SET_CALCULATING"; value: boolean }
  | { type: "TOGGLE_SETTING"; key: SettingKey }
  | { type: "CHANGE_PATH"; delta: number }
  | { type: "SET_UPGRADE_COUNT"; field: LimitInputField; value: string }
  | { type: "SWAP_NUMS" }
  | { type: "RESET_INPUTS" }
  | { type: "RESET_SETTINGS" }
  | { type: "CANCEL_CALCULATION" }
  | { type: "ACK_RESULT_INVALIDATED" };

interface UseCalculatorControllerOptions {
  onAssistantEgg?: (payload: AssistantEggPayload | null) => void;
}

const hasValidCalculation = (
  validation: ReturnType<typeof validateInput>
): validation is Extract<ReturnType<typeof validateInput>, { error: null }> =>
  validation.error === null;

const LIMIT_INPUT_WARNING_COOLDOWN = 1800;

const clearResultState = (state: CalculatorState): CalculatorState => ({
  ...state,
  result: "",
  calcError: "",
  calcMeta: null,
  pathCache: [],
  currentPathIndex: 0,
  clickCount: 0,
  isCalculating: false,
});

const shouldNotifyResultInvalidated = (state: CalculatorState): boolean => (
  state.pathCache.length > 0 || !!state.calcError || !!state.result
);

const reducer = (state: CalculatorState, action: CalculatorAction): CalculatorState => {
  switch (action.type) {
    case "SET_NUM":
      return {
        ...clearResultState(state),
        [action.field]: action.value,
        [action.field === "num1" ? "error1" : "error2"]: "",
      };
    case "CLEAR_LMD_INPUT":
      return {
        ...clearResultState(state),
        [action.field]: "",
        [action.field === "num1" ? "error1" : "error2"]: "",
        differenceError: "",
      };
    case "SET_ERROR":
      return {
        ...state,
        [action.field]: action.value,
      };
    case "SET_RESULT":
      return {
        ...state,
        result: action.value,
      };
    case "SET_CALC_ERROR":
      return {
        ...state,
        calcError: action.value,
      };
    case "SET_CALC_META":
      return {
        ...state,
        calcMeta: action.value,
      };
    case "SET_PATHS":
      return {
        ...state,
        pathCache: action.paths,
        currentPathIndex: 0,
        clickCount: 0,
        settingsDirty: false,
        resultInvalidated: false,
      };
    case "APPEND_HISTORY":
      return {
        ...state,
        history: [...state.history.slice(-10), action.entry],
      };
    case "SET_CALCULATING":
      return {
        ...state,
        isCalculating: action.value,
      };
    case "TOGGLE_SETTING":
      return {
        ...clearResultState(state),
        settings: {
          ...state.settings,
          [action.key]: !state.settings[action.key],
        },
        settingsDirty: true,
        resultInvalidated: shouldNotifyResultInvalidated(state),
      };
    case "CHANGE_PATH":
      return {
        ...state,
        currentPathIndex:
          (state.currentPathIndex + action.delta + state.pathCache.length) %
          state.pathCache.length,
        clickCount: state.clickCount + 1,
      };
    case "SET_UPGRADE_COUNT":
      return {
        ...clearResultState(state),
        [action.field]: action.value,
        settingsDirty: true,
        resultInvalidated: shouldNotifyResultInvalidated(state),
      };
    case "SWAP_NUMS":
      return {
        ...clearResultState(state),
        num1: state.num2,
        num2: state.num1,
        error1: "",
        error2: "",
      };
    case "RESET_INPUTS":
      return {
        ...clearResultState(state),
        num1: "",
        num2: "",
        result: "",
        error1: "",
        error2: "",
        differenceError: "",
        upgrade0Count: "",
        upgrade1Count: "",
        upgrade2Count: "",
        sanityCount: "",
        trade2Count: "",
        trade3Count: "",
        trade4Count: "",
        trade5Count: "",
      };
    case "RESET_SETTINGS":
      return {
        ...clearResultState(state),
        settings: buildDefaultSettings(),
        upgrade0Count: "",
        upgrade1Count: "",
        upgrade2Count: "",
        sanityCount: "",
        trade2Count: "",
        trade3Count: "",
        trade4Count: "",
        trade5Count: "",
        settingsDirty: true,
        resultInvalidated: shouldNotifyResultInvalidated(state),
      };
    case "CANCEL_CALCULATION":
      return clearResultState(state);
    case "ACK_RESULT_INVALIDATED":
      return {
        ...state,
        resultInvalidated: false,
      };
    default:
      return state;
  }
};

export const useCalculatorController = ({ onAssistantEgg }: UseCalculatorControllerOptions) => {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);
  const [showModal, setShowModal] = useState(false);
  const [heartsElement, triggerHeart] = useHeartEffect() as [ReactNode, HeartEffectTrigger];
  const { setCalculating } = useCursorState();
  const limitInputWarningRef = React.useRef<Partial<Record<LimitInputField, number>>>({});
  const activeCalculationIdRef = React.useRef(0);

  const cancelActiveCalculation = useCallback(() => {
    activeCalculationIdRef.current += 1;
  }, []);

  const invalidateActiveCalculation = useCallback(() => {
    cancelActiveCalculation();
    dispatch({ type: "CANCEL_CALCULATION" });
  }, [cancelActiveCalculation]);

  const showAssistantText = useCallback((message: string, priority: AssistantEggPriority = "normal", duration?: number) => {
    onAssistantEgg?.({
      type: "message",
      message,
      priority,
      duration,
    });
  }, [onAssistantEgg]);

  const getDifferenceAssistantMessage = useCallback((difference: number) => {
    const amount = Math.abs(difference).toLocaleString("zh-CN");
    if (difference > 0) return `还需要获得 ${amount} 龙门币`;
    if (difference < 0) return `还需要消耗 ${amount} 龙门币`;
    return "当前龙门币数量已经和目标一致";
  }, []);

  const triggerTyphoon799Egg = useCallback(() => {
    const variants = [...typhoon799ImageUrls, TYPHOON_799_PEEK];
    const selected = variants[Math.floor(Math.random() * variants.length)];
    if (selected === TYPHOON_799_PEEK) {
      onAssistantEgg?.({
        type: "typhoon799-peek",
      });
      return;
    }
    onAssistantEgg?.({
      imageUrl: selected,
      type: "typhoon799",
    });
  }, [onAssistantEgg]);

  useEffect(() => {
    persistCalculatorState(state);
  }, [
    state.settings,
    state.num1,
    state.num2,
    state.result,
    state.calcError,
    state.calcMeta,
    state.pathCache,
    state.upgrade0Count,
    state.upgrade1Count,
    state.upgrade2Count,
    state.sanityCount,
    state.trade2Count,
    state.trade3Count,
    state.trade4Count,
    state.trade5Count,
  ]);

  useEffect(() => {
    setCalculating(state.isCalculating);
  }, [state.isCalculating, setCalculating]);

  useEffect(() => {
    if (!state.resultInvalidated) return;
    onAssistantEgg?.({
      type: "recalculate",
      priority: "high",
    });
    dispatch({ type: "ACK_RESULT_INVALIDATED" });
  }, [onAssistantEgg, state.resultInvalidated]);

  useEffect(() => {
    if (state.settings.allowUpgradeOnlyFor1) {
      const { allowUpgradeOnly0, allowUpgradeOnly1, allowUpgradeOnly2 } =
        state.settings;
      if (!allowUpgradeOnly0 && !allowUpgradeOnly1 && !allowUpgradeOnly2) {
        setShowModal(true);
      }
    }
  }, [
    state.settings.allowUpgradeOnlyFor1,
    state.settings.allowUpgradeOnly0,
    state.settings.allowUpgradeOnly1,
    state.settings.allowUpgradeOnly2,
  ]);

  const handleToggleChange = useCallback(
    (key: SettingKey) => {
      cancelActiveCalculation();
      dispatch({ type: "TOGGLE_SETTING", key });
    },
    [cancelActiveCalculation]
  );

  const handleResetSettings = useCallback(() => {
    cancelActiveCalculation();
    dispatch({ type: "RESET_SETTINGS" });
  }, [cancelActiveCalculation]);

  const handleSwapNums = useCallback(() => {
    invalidateActiveCalculation();
    dispatch({ type: "SWAP_NUMS" });
  }, [invalidateActiveCalculation]);

  const handleResetInputs = useCallback(() => {
    invalidateActiveCalculation();
    dispatch({ type: "RESET_INPUTS" });
  }, [invalidateActiveCalculation]);

  const handleClearLmdInput = useCallback((field: LmdInputField) => {
    invalidateActiveCalculation();
    dispatch({ type: "CLEAR_LMD_INPUT", field });
  }, [invalidateActiveCalculation]);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>, field: LmdInputField) => {
    invalidateActiveCalculation();
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      dispatch({ type: "SET_NUM", field, value: "" });
      return;
    }

    const numValue = parseInt(value, 10);
    if (numValue > 999999999) {
      dispatch({
        type: "SET_ERROR",
        field: field === "num1" ? "error1" : "error2",
        value: "这么多龙门币可以分我一点吗？",
      });
      return;
    }
    dispatch({ type: "SET_NUM", field, value: numValue.toString() });
  }, [invalidateActiveCalculation]);

  const notifyLimitInputWarning = useCallback((field: LimitInputField, message: string) => {
    const now = Date.now();
    if (now - (limitInputWarningRef.current[field] ?? 0) < LIMIT_INPUT_WARNING_COOLDOWN) {
      return;
    }
    limitInputWarningRef.current[field] = now;
    showAssistantText(message, "high", 5000);
  }, [showAssistantText]);

  const handleUpgradeCountChange = useCallback((e: ChangeEvent<HTMLInputElement> | { target: { value: string } }, field: LimitInputField, min: number, max: number, label = "这个输入框") => {
    cancelActiveCalculation();
    const rawValue = String(e.target.value ?? "");
    const value = rawValue.replace(/[^\d]/g, "");
    if (value === "") {
      dispatch({ type: "SET_UPGRADE_COUNT", field, value: "" });
      return;
    }

    const trimmedValue = value.slice(0, 6);
    let numValue = parseInt(trimmedValue, 10);
    if (Number.isNaN(numValue) || numValue < min) {
      return;
    }
    if (numValue > max) {
      numValue = max;
      notifyLimitInputWarning(field, `${label}的上限是 ${max}，已按上限处理`);
    }
    dispatch({ type: "SET_UPGRADE_COUNT", field, value: numValue.toString() });
  }, [cancelActiveCalculation, notifyLimitInputWarning]);

  const handleCalculate = useCallback(
    async (event?: CalculateTriggerEvent, calcMode: CalcMode = "fast") => {
      if (isRomanticNumber(state.num2)) {
        triggerHeart(event);
        onAssistantEgg?.({
          type: "romantic",
        });
      } else if (isFunnyNumber(state.num2)) {
        onAssistantEgg?.({
          imageUrl: funnyImageUrl,
          type: "funny",
        });
      } else if (isMemory350234Number(state.num2)) {
        onAssistantEgg?.({
          imageUrl: memory350234ImageUrl,
          type: "memory350234",
        });
      } else if (isSami325Number(state.num2)) {
        onAssistantEgg?.({
          imageUrl: sami325ImageUrl,
          type: "sami325",
        });
      } else if (isTyphoon799Number(state.num2)) {
        triggerTyphoon799Egg();
      } else if (isZc325Number(state.num2)) {
        onAssistantEgg?.({
          imageUrl: zc325ImageUrl,
          type: "zc325",
        });
      } else {
        onAssistantEgg?.(null);
      }

      const validation = validateInput(state.num1, state.num2);
      if (!hasValidCalculation(validation)) {
        dispatch({ type: "SET_ERROR", field: "differenceError", value: validation.error });
        showAssistantText(validation.error, "high");
        if (state.num1 && state.num2) dispatch({ type: "SET_RESULT", value: "" });
        return;
      }

      const { difference, num1Val, num2Val } = validation;
      const hasAssistantEasterEgg =
        isRomanticNumber(state.num2) ||
        isFunnyNumber(state.num2) ||
        isMemory350234Number(state.num2) ||
        isSami325Number(state.num2) ||
        isTyphoon799Number(state.num2) ||
        isZc325Number(state.num2);
      if (!hasAssistantEasterEgg) {
        showAssistantText(getDifferenceAssistantMessage(difference));
      }
      dispatch({ type: "SET_ERROR", field: "differenceError", value: "" });
      dispatch({ type: "SET_CALC_ERROR", value: "" });
      dispatch({ type: "SET_CALC_META", value: null });
      dispatch({ type: "SET_RESULT", value: difference.toString() });
      dispatch({ type: "SET_CALCULATING", value: true });
      dispatch({ type: "SET_PATHS", paths: [] });

      const calculationId = activeCalculationIdRef.current + 1;
      activeCalculationIdRef.current = calculationId;
      const limits = buildLimits(state);
      const cacheKey = buildCacheKey(difference, state.settings, limits, calcMode);
      const t0 = performance.now();
      const isCurrentCalculation = () => activeCalculationIdRef.current === calculationId;

      const cachedPaths = checkPathCache(cacheKey);
      if (cachedPaths) {
        if (!isCurrentCalculation()) return;
        dispatch({ type: "SET_PATHS", paths: cachedPaths });
        dispatch({ type: "SET_CALC_META", value: { fromCache: true, elapsed: 0 } });
        dispatch({ type: "SET_CALCULATING", value: false });
        dispatch({ type: "APPEND_HISTORY", entry: { path: cachedPaths[0], timestamp: new Date().toLocaleString(), initialLMD: num1Val } });
        return;
      }

      try {
        const paths = await callCalculatorApi(difference, state.settings, limits, num2Val, calcMode);
        if (!isCurrentCalculation()) return;
        const elapsed = Math.round(performance.now() - t0);
        if (!paths || paths.length === 0) {
          dispatch({ type: "SET_CALC_ERROR", value: "计算完成，但未找到满足条件的路径方案。" });
          dispatch({ type: "SET_PATHS", paths: [] });
        } else {
          savePathCache(cacheKey, paths);
          dispatch({ type: "SET_CALC_META", value: { fromCache: false, elapsed } });
        }
        dispatch({ type: "SET_PATHS", paths });
        if (paths.length > 0) {
          dispatch({ type: "APPEND_HISTORY", entry: { path: paths[0], timestamp: new Date().toLocaleString(), initialLMD: num1Val } });
        }
      } catch (error) {
        if (!isCurrentCalculation()) return;
        const errorMessage = formatCalculatorError(error);
        dispatch({ type: "SET_CALC_ERROR", value: errorMessage });
        dispatch({ type: "SET_PATHS", paths: [] });
        dispatch({ type: "APPEND_HISTORY", entry: `计算失败: ${errorMessage}` });
      } finally {
        if (isCurrentCalculation()) {
          dispatch({ type: "SET_CALCULATING", value: false });
        }
      }
    },
    [
      state,
      onAssistantEgg,
      triggerHeart,
      showAssistantText,
      getDifferenceAssistantMessage,
      triggerTyphoon799Egg,
    ]
  );

  return {
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
  };
};
