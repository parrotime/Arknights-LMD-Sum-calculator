// 纯计算逻辑 — 从 App.jsx / PathRenderer.jsx / InputPanel.jsx 提取
// 无 React/JSX 依赖，可直接用 Node.js 测试

// ============================================================
// 1. 输入校验
// ============================================================

/** 校验两个龙门币输入，返回 { error, difference, num1Val, num2Val } */
export const validateInput = (num1, num2) => {
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
export const computeDiff = (num1, num2) => {
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

/** 从 state 构建升级/理智限制参数 */
export const buildLimits = (state) => ({
  upgrade0Limit: state.upgrade0Count === "" ? Infinity : parseInt(state.upgrade0Count, 10),
  upgrade1Limit: state.upgrade1Count === "" ? Infinity : parseInt(state.upgrade1Count, 10),
  upgrade2Limit: state.upgrade2Count === "" ? Infinity : parseInt(state.upgrade2Count, 10),
  sanityLimit: state.sanityCount === "" ? Infinity : parseInt(state.sanityCount, 10),
});

/** 构建本地缓存键 */
export const buildCacheKey = (difference, settings, limits) =>
  `${difference}_${Object.entries(settings)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|")}_${limits.upgrade0Limit}_${limits.upgrade1Limit}_${limits.upgrade2Limit}_${limits.sanityLimit}`;

// ============================================================
// 3. PathRenderer 计算逻辑
// ============================================================

/** 稀有度 → 颜色映射 */
export const getRarityColor = (rarity) => {
  const colorMap = {
    1: "#3f9f68",
    2: "#4f8fd8",
    3: "#b277ff",
    5: "#f0a33a",
  };
  return colorMap[rarity] || "#d8e3ec";
};

/** 预计算每步数据和总理智消耗，getItemFn 为物品查找函数 */
export const computeStepData = (path, getItemFn) => {
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
export const computeRunningTotals = (stepData, startLMD) =>
  stepData.reduce((acc, sd) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : startLMD;
    acc.push(prev + (sd ? sd.stepValue : 0));
    return acc;
  }, []);
