import React, { useCallback, useEffect, useReducer, useState } from "react";
import type { ChangeEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { Transmission } from "./Transmission";
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
import type {
  ApiError,
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
  UserLimits,
} from "../types/calculator";

type DateParts = Partial<Record<Intl.DateTimeFormatPartTypes, string>>;
type SettingKey = keyof CalculatorSettings;
type PersistedKey = "settings" | LmdInputField | LimitInputField;
type SignatureKey = LmdInputField | LimitInputField;
type ErrorField = "error1" | "error2" | "differenceError";
type CalculateTriggerEvent = MouseEvent<HTMLElement> | KeyboardEvent<HTMLInputElement>;
type HeartEffectTrigger = (event?: CalculateTriggerEvent | Event) => void;

interface LegacySettings {
  disable3Star?: boolean;
  disable2Star?: boolean;
  disableMaterial?: boolean;
  disableStore20?: boolean;
  disableStore10?: boolean;
  disableStore70?: boolean;
  disableStore2000?: boolean;
  disableStore5000?: boolean;
  disableCE?: boolean;
  disableExt25?: boolean;
  disableTrade?: boolean;
  enableUpgradeOnly0?: boolean;
  enableUpgradeOnly1?: boolean;
  enableUpgradeOnly2?: boolean;
  enableUpgradeOnlyFor1?: boolean;
}

interface ResultSnapshot {
  signature: string;
  result?: string;
  calcError?: string;
  calcMeta?: CalcMeta | null;
  pathCache?: CalculationPath[];
}

type PersistedCalculatorState = Partial<Pick<CalculatorState, PersistedKey>> & {
  resultSnapshot?: ResultSnapshot;
};

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

const getBeijingDateParts = (date = new Date()): DateParts => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

const isCEOpenInBeijing = (date = new Date()): boolean => {
  const parts = getBeijingDateParts(date);
  const beijingTime = new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  beijingTime.setHours(beijingTime.getHours() - 4);

  return [0, 2, 4, 6].includes(beijingTime.getDay());
};

const defaultState: CalculatorState = {
  num1: "", // 当前数量
  num2: "", // 目标数量
  result: "", // 两者相差
  error1: "", // num1错误信息
  error2: "", // num2错误信息
  history: [], // 计算历史记录
  differenceError: "", // 差值错误信息
  calcError: "", // 计算结果错误（显示在ResultArea）
  calcMeta: null, // { fromCache: bool, elapsed: number } 计算元信息
  pathCache: [], // 计算出来的路径缓存
  currentPathIndex: 0, // 路径索引
  clickCount: 0, // 路径切换次数
  isCalculating: false,
  settingsDirty: false,
  settings: {
    allow3Star: true,
    allow2Star: true,
    allowMaterial: true,
    allowStore20: false,
    allowStore10: false,
    allowStore70: false,
    allowStore2000: false,
    allowStore5000: false,
    allowCE: true,
    allowExt25: false,
    allowTrade: true,
    allowUpgradeOnly0: true,
    allowUpgradeOnly1: true,
    allowUpgradeOnly2: true,
    allowUpgradeOnlyFor1: true,
    allowOrundumsGreen: false,
    allowOrundumsDevice: false,
  },
  upgrade0Count: "",
  upgrade1Count: "",
  upgrade2Count: "",
  sanityCount: "",
  trade2Count: "",
  trade3Count: "",
  trade4Count: "",
  trade5Count: "",
};

const buildDefaultSettings = (): CalculatorSettings => ({
  ...defaultState.settings,
  allowCE: isCEOpenInBeijing(),
});

const migrateSettings = (settings: unknown): Partial<CalculatorSettings> => {
  if (!settings || typeof settings !== "object") return {};
  if (!("disable3Star" in settings)) return settings as Partial<CalculatorSettings>;
  const legacy = settings as LegacySettings;
  return {
    allow3Star: !legacy.disable3Star,
    allow2Star: !legacy.disable2Star,
    allowMaterial: !legacy.disableMaterial,
    allowStore20: !legacy.disableStore20,
    allowStore10: !legacy.disableStore10,
    allowStore70: !legacy.disableStore70,
    allowStore2000: !legacy.disableStore2000,
    allowStore5000: !legacy.disableStore5000,
    allowCE: !legacy.disableCE,
    allowExt25: !legacy.disableExt25,
    allowTrade: !legacy.disableTrade,
    allowUpgradeOnly0: !!legacy.enableUpgradeOnly0,
    allowUpgradeOnly1: !!legacy.enableUpgradeOnly1,
    allowUpgradeOnly2: !!legacy.enableUpgradeOnly2,
    allowUpgradeOnlyFor1: !!legacy.enableUpgradeOnlyFor1,
    allowOrundumsGreen: false,
    allowOrundumsDevice: false,
  };
};

const PERSISTED_KEYS = [
  "settings",
  "num1",
  "num2",
  "upgrade0Count",
  "upgrade1Count",
  "upgrade2Count",
  "sanityCount",
  "trade2Count",
  "trade3Count",
  "trade4Count",
  "trade5Count",
] satisfies PersistedKey[];

const SIGNATURE_KEYS = [
  "num1",
  "num2",
  "upgrade0Count",
  "upgrade1Count",
  "upgrade2Count",
  "sanityCount",
  "trade2Count",
  "trade3Count",
  "trade4Count",
  "trade5Count",
] satisfies SignatureKey[];

const LIMIT_INPUT_WARNING_COOLDOWN = 1800;

const buildResultSignature = (state: CalculatorState): string => JSON.stringify({
  inputs: Object.fromEntries(SIGNATURE_KEYS.map((key) => [key, state[key] ?? ""])),
  settings: state.settings,
});

const getDefaultInitialState = (): CalculatorState => ({
  ...defaultState,
  settings: buildDefaultSettings(),
});

const parseStoredObject = <T,>(key: string, fallback: T | null = null): T | null => {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;

  try {
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" ? parsed as T : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

const getInitialState = (): CalculatorState => {
  const parsed = parseStoredObject<PersistedCalculatorState>("calculatorState");
  if (!parsed) {
    return getDefaultInitialState();
  }

  const restored: CalculatorState = { ...defaultState, settings: { ...defaultState.settings } };
  for (const key of PERSISTED_KEYS) {
    if (key in parsed) {
      if (key === "settings") {
        restored.settings = { ...defaultState.settings, ...migrateSettings(parsed.settings) };
      } else {
        restored[key] = parsed[key] ?? "";
      }
    }
  }
  restored.settings = { ...defaultState.settings, ...migrateSettings(restored.settings) };
  restored.settings.allowCE = isCEOpenInBeijing();
  const resultSnapshot = parsed.resultSnapshot;
  if (
    resultSnapshot?.signature === buildResultSignature(restored) &&
    (Array.isArray(resultSnapshot.pathCache) || resultSnapshot.calcError)
  ) {
    restored.result = resultSnapshot.result || "";
    restored.calcError = resultSnapshot.calcError || "";
    restored.calcMeta = resultSnapshot.calcMeta || null;
    restored.pathCache = Array.isArray(resultSnapshot.pathCache) ? resultSnapshot.pathCache : [];
  }
  return restored;
};

const parseStoredArray = <T,>(key: string): T[] => {
  const parsed = parseStoredObject<T[]>(key, []);
  return Array.isArray(parsed) ? parsed : [];
};

const getPathCacheQueue = (): string[] => {
  const parsed = parseStoredObject<string[]>("pathCacheQueue", []);
  if (Array.isArray(parsed)) return parsed;
  localStorage.removeItem("pathCacheQueue");
  return [];
};

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

const checkCache = (cacheKey: string): CalculationPath[] | null => {
  const key = `pathCache_${cacheKey}`;
  const paths = parseStoredArray<CalculationPath>(key);
  if (paths.length > 0) return paths;
  localStorage.removeItem(key);
  return null;
};

const callAPI = (
  difference: number,
  settings: CalculatorSettings,
  limits: UserLimits,
  num2Val: number,
  calcMode: CalcMode = "fast",
): Promise<CalculationPath[]> =>
  Promise.race([
    Transmission(difference, settings, limits, num2Val, calcMode),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("计算超时,请重试")), 18000)
    ),
  ]);

const formatError = (error: unknown): string => {
  const apiError = error as ApiError;
  if (apiError.isNetworkError) return apiError.message;
  if (apiError.status) {
    const map = {
      400: `输入错误: ${apiError.message}`,
      429: `请求过于频繁: ${apiError.message}`,
      503: `服务器繁忙，请稍后再试`,
      504: `计算超时: ${apiError.message}`,
      500: `服务器内部错误: ${apiError.message}. 如果问题持续，请联系管理员。`,
    };
    return map[apiError.status as keyof typeof map] || `请求失败: ${apiError.message} (代码: ${apiError.status})`;
  }
  return apiError.message ? `发生错误: ${apiError.message}` : "发生未知错误，请稍后再试。";
};

const managePathCache = (newKey: string): void => {
  const cacheQueue = getPathCacheQueue();
  if (!cacheQueue.includes(newKey)) {
    cacheQueue.push(newKey);
    if (cacheQueue.length > 5) {
      localStorage.removeItem(`pathCache_${cacheQueue.shift()}`);
    }
    localStorage.setItem("pathCacheQueue", JSON.stringify(cacheQueue));
  }
};

export const useCalculatorController = ({ onAssistantEgg }: UseCalculatorControllerOptions) => {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);
  const [showModal, setShowModal] = useState(false);
  const [heartsElement, triggerHeart] = useHeartEffect() as [ReactNode, HeartEffectTrigger];
  const { setCalculating } = useCursorState();
  const limitInputWarningRef = React.useRef<Partial<Record<LimitInputField, number>>>({});
  const activeCalculationIdRef = React.useRef(0);

  const invalidateActiveCalculation = useCallback(() => {
    activeCalculationIdRef.current += 1;
    dispatch({ type: "CANCEL_CALCULATION" });
  }, []);

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
    const toSave: PersistedCalculatorState = {};
    for (const key of PERSISTED_KEYS) {
      if (key === "settings") {
        toSave.settings = state.settings;
      } else {
        toSave[key] = state[key];
      }
    }
    if (state.pathCache.length > 0 || state.calcError) {
      toSave.resultSnapshot = {
        signature: buildResultSignature(state),
        result: state.result,
        calcError: state.calcError,
        calcMeta: state.calcMeta,
        pathCache: state.pathCache,
      };
    }
    localStorage.setItem("calculatorState", JSON.stringify(toSave));
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
      invalidateActiveCalculation();
      dispatch({ type: "TOGGLE_SETTING", key });
    },
    [invalidateActiveCalculation]
  );

  const handleResetSettings = useCallback(() => {
    invalidateActiveCalculation();
    dispatch({ type: "RESET_SETTINGS" });
  }, [invalidateActiveCalculation]);

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
    invalidateActiveCalculation();
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
  }, [invalidateActiveCalculation, notifyLimitInputWarning]);

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

      const cachedPaths = checkCache(cacheKey);
      if (cachedPaths) {
        if (!isCurrentCalculation()) return;
        dispatch({ type: "SET_PATHS", paths: cachedPaths });
        dispatch({ type: "SET_CALC_META", value: { fromCache: true, elapsed: 0 } });
        dispatch({ type: "SET_CALCULATING", value: false });
        dispatch({ type: "APPEND_HISTORY", entry: { path: cachedPaths[0], timestamp: new Date().toLocaleString(), initialLMD: num1Val } });
        return;
      }

      try {
        const paths = await callAPI(difference, state.settings, limits, num2Val, calcMode);
        if (!isCurrentCalculation()) return;
        const elapsed = Math.round(performance.now() - t0);
        if (!paths || paths.length === 0) {
          dispatch({ type: "SET_CALC_ERROR", value: "计算完成，但未找到满足条件的路径方案。" });
          dispatch({ type: "SET_PATHS", paths: [] });
        } else {
          localStorage.setItem(`pathCache_${cacheKey}`, JSON.stringify(paths));
          managePathCache(cacheKey);
          dispatch({ type: "SET_CALC_META", value: { fromCache: false, elapsed } });
        }
        dispatch({ type: "SET_PATHS", paths });
        if (paths.length > 0) {
          dispatch({ type: "APPEND_HISTORY", entry: { path: paths[0], timestamp: new Date().toLocaleString(), initialLMD: num1Val } });
        }
      } catch (error) {
        if (!isCurrentCalculation()) return;
        dispatch({ type: "SET_CALC_ERROR", value: formatError(error) });
        dispatch({ type: "SET_PATHS", paths: [] });
        dispatch({ type: "APPEND_HISTORY", entry: `计算失败: ${formatError(error)}` });
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
