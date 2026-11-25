import React, { useCallback, useEffect, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ChangeEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useCursorState } from "./CursorContext";
import { findCalculationPaths } from "../services/calculatorService";
import { CalculationRequestError } from "../utils/calculatorErrors";
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
import { validateInput, computeDiff, buildLimits, buildCacheKey } from "../utils/calcLogic";
import {
  buildDefaultSettings,
  buildResultSignature,
  getInitialState,
  persistCalculatorState,
} from "../utils/calculatorPersistence";
import {
  checkPathCache,
  savePathCache,
} from "../utils/calculatorApi";
import type {
  AssistantEggPayload,
  CalcMode,
  CalculatorError,
  CalculatorHistoryEntry,
  CalculatorResult,
  CalculatorSettings,
  CalculatorState,
  LimitInputField,
  InputErrorKey,
  LmdInputField,
} from "../types/calculator";

type SettingKey = keyof CalculatorSettings;
type ErrorField = "error1" | "error2" | "differenceError";
type CalculateTriggerEvent = MouseEvent<HTMLElement> | KeyboardEvent<HTMLInputElement>;
type HeartEffectTrigger = (event?: CalculateTriggerEvent | Event) => void;

type CalculatorAction =
  | { type: "SET_NUM"; field: LmdInputField; value: string }
  | { type: "CLEAR_LMD_INPUT"; field: LmdInputField }
  | { type: "SET_ERROR"; field: ErrorField; value: InputErrorKey | "" }
  | { type: "SET_CALC_ERROR"; value: CalculatorError | null }
  | { type: "SET_SUCCESSFUL_RESULT"; result: CalculatorResult }
  | { type: "APPEND_HISTORY"; entry: CalculatorHistoryEntry }
  | { type: "SET_CALCULATING"; value: boolean }
  | { type: "TOGGLE_SETTING"; key: SettingKey }
  | { type: "SET_UPGRADE_COUNT"; field: LimitInputField; value: string }
  | { type: "SWAP_NUMS" }
  | { type: "RESET_INPUTS" }
  | { type: "RESET_SETTINGS" };

interface UseCalculatorControllerOptions {
  onAssistantEgg?: (payload: AssistantEggPayload | null) => void;
}

const hasValidCalculation = (
  validation: ReturnType<typeof validateInput>
): validation is Extract<ReturnType<typeof validateInput>, { error: null }> =>
  validation.error === null;

const LIMIT_INPUT_WARNING_COOLDOWN = 1800;

const stopCalculation = (state: CalculatorState): CalculatorState => ({
  ...state,
  calcError: null,
  isCalculating: false,
});

const reducer = (state: CalculatorState, action: CalculatorAction): CalculatorState => {
  switch (action.type) {
    case "SET_NUM":
      return {
        ...stopCalculation(state),
        [action.field]: action.value,
        [action.field === "num1" ? "error1" : "error2"]: "",
      };
    case "CLEAR_LMD_INPUT":
      return {
        ...stopCalculation(state),
        [action.field]: "",
        [action.field === "num1" ? "error1" : "error2"]: "",
        differenceError: "",
      };
    case "SET_ERROR":
      return {
        ...state,
        [action.field]: action.value,
      };
    case "SET_CALC_ERROR":
      return {
        ...state,
        calcError: action.value,
      };
    case "SET_SUCCESSFUL_RESULT":
      return {
        ...state,
        lastResult: action.result,
        resultVersion: state.resultVersion + 1,
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
        ...stopCalculation(state),
        settings: {
          ...state.settings,
          [action.key]: !state.settings[action.key],
        },
      };
    case "SET_UPGRADE_COUNT":
      return {
        ...stopCalculation(state),
        [action.field]: action.value,
      };
    case "SWAP_NUMS":
      return {
        ...stopCalculation(state),
        num1: state.num2,
        num2: state.num1,
        error1: "",
        error2: "",
      };
    case "RESET_INPUTS":
      return {
        ...stopCalculation(state),
        num1: "",
        num2: "",
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
        ...stopCalculation(state),
        settings: buildDefaultSettings(),
        upgrade0Count: "",
        upgrade1Count: "",
        upgrade2Count: "",
        sanityCount: "",
        trade2Count: "",
        trade3Count: "",
        trade4Count: "",
        trade5Count: "",
      };
    default:
      return state;
  }
};

export const useCalculatorController = ({ onAssistantEgg }: UseCalculatorControllerOptions) => {
  const { i18n } = useTranslation("errors");
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);
  const [showModal, setShowModal] = useState(false);
  const [heartsElement, triggerHeart] = useHeartEffect() as [ReactNode, HeartEffectTrigger];
  const { setCalculating } = useCursorState();
  const limitInputWarningRef = React.useRef<Partial<Record<LimitInputField, number>>>({});
  const activeCalculationIdRef = React.useRef(0);
  const activeRequestRef = React.useRef<AbortController | null>(null);

  const cancelActiveCalculation = useCallback(() => {
    activeCalculationIdRef.current += 1;
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
  }, []);

  useEffect(() => cancelActiveCalculation, [cancelActiveCalculation]);

  const showModeWarning = useCallback(() => {
    onAssistantEgg?.({ type: "strong-warning", priority: "high" });
  }, [onAssistantEgg]);

  const showInputError = useCallback((inputError: InputErrorKey) => {
    onAssistantEgg?.({ type: "message", inputError, priority: "high" });
  }, [onAssistantEgg]);

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
    state.calcError,
    state.lastResult,
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
    cancelActiveCalculation();
    dispatch({ type: "SWAP_NUMS" });
  }, [cancelActiveCalculation]);

  const handleResetInputs = useCallback(() => {
    cancelActiveCalculation();
    dispatch({ type: "RESET_INPUTS" });
  }, [cancelActiveCalculation]);

  const handleClearLmdInput = useCallback((field: LmdInputField) => {
    cancelActiveCalculation();
    dispatch({ type: "CLEAR_LMD_INPUT", field });
  }, [cancelActiveCalculation]);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>, field: LmdInputField) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      cancelActiveCalculation();
      dispatch({ type: "SET_NUM", field, value: "" });
      return;
    }

    const numValue = parseInt(value, 10);
    if (numValue > 999999999) {
      dispatch({
        type: "SET_ERROR",
        field: field === "num1" ? "error1" : "error2",
        value: "balanceTooLarge",
      });
      showInputError("balanceTooLarge");
      return;
    }
    const nextValue = numValue.toString();
    const nextDiff = computeDiff(
      field === "num1" ? nextValue : state.num1,
      field === "num2" ? nextValue : state.num2,
    );
    if (nextDiff?.outOfRange && !computeDiff(state.num1, state.num2)?.outOfRange) {
      showInputError("difference");
    }

    cancelActiveCalculation();
    dispatch({ type: "SET_NUM", field, value: nextValue });
  }, [cancelActiveCalculation, showInputError, state.num1, state.num2]);

  const notifyLimitInputWarning = useCallback((field: LimitInputField, max: number) => {
    const now = Date.now();
    if (now - (limitInputWarningRef.current[field] ?? 0) < LIMIT_INPUT_WARNING_COOLDOWN) {
      return;
    }
    limitInputWarningRef.current[field] = now;
    onAssistantEgg?.({ type: "message", limitWarning: { field, max }, priority: "high", duration: 5000 });
  }, [onAssistantEgg]);

  const handleUpgradeCountChange = useCallback((e: ChangeEvent<HTMLInputElement> | { target: { value: string } }, field: LimitInputField, min: number, max: number) => {
    const rawValue = String(e.target.value ?? "");
    const value = rawValue.replace(/[^\d]/g, "");
    if (value === "") {
      cancelActiveCalculation();
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
      notifyLimitInputWarning(field, max);
    }
    cancelActiveCalculation();
    dispatch({ type: "SET_UPGRADE_COUNT", field, value: numValue.toString() });
  }, [cancelActiveCalculation, notifyLimitInputWarning]);

  const handleCalculate = useCallback(
    async (event?: CalculateTriggerEvent, calcMode: CalcMode = "fast") => {
      const inputError = state.error1 || state.error2;
      if (inputError) {
        showInputError(inputError);
        return;
      }

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
        showInputError(validation.error);
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
        onAssistantEgg?.({ type: "message", difference, priority: "normal" });
      }
      dispatch({ type: "SET_ERROR", field: "differenceError", value: "" });
      dispatch({ type: "SET_CALC_ERROR", value: null });
      dispatch({ type: "SET_CALCULATING", value: true });

      cancelActiveCalculation();
      const calculationId = activeCalculationIdRef.current;
      const limits = buildLimits(state);
      const signature = buildResultSignature(state);
      const cacheKey = buildCacheKey(difference, state.settings, limits, calcMode);
      const t0 = performance.now();
      const isCurrentCalculation = () => activeCalculationIdRef.current === calculationId;

      const cachedPaths = checkPathCache(cacheKey);
      if (cachedPaths) {
        if (!isCurrentCalculation()) return;
        dispatch({ type: "SET_SUCCESSFUL_RESULT", result: { signature, initialLMD: num1Val, paths: cachedPaths, meta: { fromCache: true, elapsed: 0 } } });
        dispatch({ type: "SET_CALCULATING", value: false });
        dispatch({ type: "APPEND_HISTORY", entry: { path: cachedPaths[0], timestamp: new Date().toLocaleString(), initialLMD: num1Val } });
        return;
      }

      const controller = new AbortController();
      activeRequestRef.current = controller;
      try {
        const paths = await findCalculationPaths(difference, state.settings, limits, num2Val, controller, calcMode);
        if (!isCurrentCalculation()) return;
        const elapsed = Math.round(performance.now() - t0);
        if (paths.length === 0) {
          dispatch({ type: "SET_CALC_ERROR", value: { key: "noSolution" } });
        } else {
          savePathCache(cacheKey, paths);
          dispatch({ type: "SET_SUCCESSFUL_RESULT", result: { signature, initialLMD: num1Val, paths, meta: { fromCache: false, elapsed } } });
          dispatch({ type: "APPEND_HISTORY", entry: { path: paths[0], timestamp: new Date().toLocaleString(), initialLMD: num1Val } });
        }
      } catch (error) {
        if (!isCurrentCalculation()) return;
        const notice: CalculatorError = error instanceof CalculationRequestError ? error.notice : { key: "unknown" };
        dispatch({ type: "SET_CALC_ERROR", value: notice });
        const message = i18n.t(notice.key, { ns: "errors", status: notice.key === "request" ? notice.status : undefined });
        dispatch({ type: "APPEND_HISTORY", entry: i18n.t("history", { ns: "errors", message }) });
      } finally {
        if (isCurrentCalculation()) {
          activeRequestRef.current = null;
          dispatch({ type: "SET_CALCULATING", value: false });
        }
      }
    },
    [
      state,
      cancelActiveCalculation,
      onAssistantEgg,
      triggerHeart,
      showInputError,
      i18n,
      triggerTyphoon799Egg,
    ]
  );

  return {
    state,
    showModal,
    setShowModal,
    heartsElement,
    showModeWarning,
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
