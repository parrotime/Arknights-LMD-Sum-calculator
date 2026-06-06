import type { GameItem } from "../DataService";

export type CalcMode = "fast" | "strong";

export type LmdInputField = "num1" | "num2";

export interface CalculatorSettings {
  allow3Star: boolean;
  allow2Star: boolean;
  allowMaterial: boolean;
  allowStore20: boolean;
  allowStore10: boolean;
  allowStore70: boolean;
  allowStore2000: boolean;
  allowStore5000: boolean;
  allowCE: boolean;
  allowExt25: boolean;
  allowTrade: boolean;
  allowUpgradeOnly0: boolean;
  allowUpgradeOnly1: boolean;
  allowUpgradeOnly2: boolean;
  allowUpgradeOnlyFor1: boolean;
  allowOrundumsGreen: boolean;
  allowOrundumsDevice: boolean;
}

export type LimitInputField =
  | "upgrade0Count"
  | "upgrade1Count"
  | "upgrade2Count"
  | "sanityCount"
  | "trade2Count"
  | "trade3Count"
  | "trade4Count"
  | "trade5Count";

export type LimitInputState = Record<LimitInputField, string>;

export type UserLimitKey =
  | "upgrade0Limit"
  | "upgrade1Limit"
  | "upgrade2Limit"
  | "sanityLimit"
  | "trade2Limit"
  | "trade3Limit"
  | "trade4Limit"
  | "trade5Limit";

export type UserLimits = Record<UserLimitKey, number>;

export interface PathStep {
  id: number;
  count: number;
}

export type CalculationPath = PathStep[];

export interface CalculationHistoryEntry {
  path: CalculationPath;
  timestamp: string;
  initialLMD: number;
}

export type CalculatorHistoryEntry = CalculationHistoryEntry | string;

export interface CalcMeta {
  fromCache: boolean;
  elapsed: number;
}

export interface CalculatorState extends LimitInputState {
  num1: string;
  num2: string;
  result: string;
  error1: string;
  error2: string;
  history: CalculatorHistoryEntry[];
  differenceError: string;
  calcError: string;
  calcMeta: CalcMeta | null;
  pathCache: CalculationPath[];
  currentPathIndex: number;
  clickCount: number;
  isCalculating: boolean;
  settingsDirty: boolean;
  resultInvalidated?: boolean;
  settings: CalculatorSettings;
}

export type ValidationResult =
  | {
      error: string;
      difference?: never;
      num1Val?: never;
      num2Val?: never;
    }
  | {
      error: null;
      difference: number;
      num1Val: number;
      num2Val: number;
    };

export interface DiffInfo {
  value: number;
  outOfRange: boolean;
}

export interface StepData {
  item: GameItem;
  stepValue: number;
}

export interface CalculateResponse {
  success: boolean;
  paths: CalculationPath[];
  duration?: number;
  cache?: "hit" | "miss";
  error?: string;
}

export interface ApiError extends Error {
  status?: number;
  isNetworkError?: boolean;
}

export type AssistantEggPriority = "normal" | "high";

export type AssistantEggType =
  | "message"
  | "recalculate"
  | "romantic"
  | "funny"
  | "memory350234"
  | "sami325"
  | "typhoon799"
  | "typhoon799-peek"
  | "zc325";

export interface AssistantEggPayload {
  id?: number;
  imageUrl?: string;
  type?: AssistantEggType;
  message?: string;
  priority?: AssistantEggPriority;
  duration?: number;
}
