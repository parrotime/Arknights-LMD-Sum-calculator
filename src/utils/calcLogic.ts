import type {
  CalculatorSettings,
  CalculationPath,
  DiffInfo,
  LimitInputState,
  StepData,
  UserLimitKey,
  UserLimits,
  ValidationResult,
} from "../types/calculator";
import type { GameItem } from "../DataService";

// 纯计算逻辑 — 从 App.jsx / PathRenderer.jsx / InputPanel.jsx 提取
// 无 React/JSX 依赖，可直接用 Node.js 测试

// ============================================================
// 1. 输入校验
// ============================================================

/** 校验两个龙门币输入，返回 { error, difference, num1Val, num2Val } */
export const validateInput = (num1: string, num2: string): ValidationResult => {
  if (!num1 || !num2) {
    return { error: "请检查当前/目标龙门币数量是否填写完整~" };
  }
  if (num1 === num2) {
    return { error: "好像输入了两个相同的数字，要不检查一下?" };
  }
  const num1Val = parseInt(num1, 10);
  const num2Val = parseInt(num2, 10);
  const difference = num2Val - num1Val;
  if (Math.abs(difference) > 5000) {
    return { error: "差值需在-5000~5000之间" };
  }
  return { error: null, difference, num1Val, num2Val };
};

/** 实时差值计算（InputPanel 用） */
export const computeDiff = (num1: string, num2: string): DiffInfo | null => {
  if (!num1 || !num2) return null;
  const v1 = parseInt(num1, 10);
  const v2 = parseInt(num2, 10);
  if (isNaN(v1) || isNaN(v2)) return null;
  const diff = v2 - v1;
  return { value: diff, outOfRange: Math.abs(diff) > 5000 };
};

// ============================================================
// 2. 限制参数与缓存键
// ============================================================

const parseLimit = (value: string | undefined | null): number =>
  value === "" || value === undefined || value === null ? Infinity : parseInt(value, 10);

/** 从 state 构建数量限制参数 */
export const buildLimits = (state: LimitInputState): UserLimits => ({
  upgrade0Limit: parseLimit(state.upgrade0Count),
  upgrade1Limit: parseLimit(state.upgrade1Count),
  upgrade2Limit: parseLimit(state.upgrade2Count),
  sanityLimit: parseLimit(state.sanityCount),
  trade2Limit: parseLimit(state.trade2Count),
  trade3Limit: parseLimit(state.trade3Count),
  trade4Limit: parseLimit(state.trade4Count),
  trade5Limit: parseLimit(state.trade5Count),
});

const LIMIT_CACHE_KEYS = [
  "upgrade0Limit",
  "upgrade1Limit",
  "upgrade2Limit",
  "sanityLimit",
  "trade2Limit",
  "trade3Limit",
  "trade4Limit",
  "trade5Limit",
] satisfies UserLimitKey[];

/** 构建本地缓存键 */
export const buildCacheKey = (
  difference: number,
  settings: CalculatorSettings | Record<string, boolean>,
  limits: UserLimits,
  calcMode = "fast"
): string =>
  `${calcMode}_${difference}_${Object.entries(settings)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|")}_${LIMIT_CACHE_KEYS.map((key) => `${key}:${limits[key]}`).join("|")}`;

// ============================================================
// 3. PathRenderer 计算逻辑
// ============================================================

/** 稀有度 → 颜色映射 */
const DEFAULT_RARITY_COLOR = "#d8e3ec";

export const getRarityColor = (rarity: number | undefined): string => {
  const colorMap: Record<number, string> = {
    1: "#3f9f68",
    2: "#4f8fd8",
    3: "#b277ff",
    5: "#f0a33a",
  };
  return rarity === undefined ? DEFAULT_RARITY_COLOR : colorMap[rarity] || DEFAULT_RARITY_COLOR;
};

/** 预计算每步数据和总理智消耗，getItemFn 为物品查找函数 */
export const computeStepData = (
  path: CalculationPath,
  getItemFn: (id: number) => GameItem | null
): { steps: Array<StepData | null>; totalSanity: number } => {
  let totalSanity = 0;
  const steps = path.map((step) => {
    const item = getItemFn(Number(step.id));
    if (!item) return null;
    totalSanity += (item.consume || 0) * step.count;
    return { item, stepValue: item.item_value * step.count };
  });
  return { steps, totalSanity };
};

/** 计算运行余额序列 */
export const computeRunningTotals = (
  stepData: Array<Pick<StepData, "stepValue"> | null>,
  startLMD: number
): number[] =>
  stepData.reduce<number[]>((acc, sd) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : startLMD;
    acc.push(prev + (sd ? sd.stepValue : 0));
    return acc;
  }, []);
