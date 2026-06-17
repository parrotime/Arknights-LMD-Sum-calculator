import { isCEOpenInBeijing } from "./ceSchedule";
import type {
  CalcMeta,
  CalculationPath,
  CalculatorSettings,
  CalculatorState,
  LimitInputField,
  LmdInputField,
} from "../types/calculator";

type PersistedKey = "settings" | LmdInputField | LimitInputField;
type SignatureKey = LmdInputField | LimitInputField;

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

export const defaultState: CalculatorState = {
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

export const buildDefaultSettings = (): CalculatorSettings => ({
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

const buildResultSignature = (state: CalculatorState): string => JSON.stringify({
  inputs: Object.fromEntries(SIGNATURE_KEYS.map((key) => [key, state[key] ?? ""])),
  settings: state.settings,
});

const getDefaultInitialState = (): CalculatorState => ({
  ...defaultState,
  settings: buildDefaultSettings(),
});

export const parseStoredObject = <T,>(key: string, fallback: T | null = null): T | null => {
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

export const getInitialState = (): CalculatorState => {
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

export const persistCalculatorState = (state: CalculatorState): void => {
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
};
