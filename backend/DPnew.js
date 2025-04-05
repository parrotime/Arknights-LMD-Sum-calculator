import { classifyData } from "../src/DataService.js";

/**
 * 根据物品 ID 和限制条件，获取该物品的最大可用次数
 */
function getMaxCountForId(id, items, userLimits) {
  const item = items.find((i) => i.id === id);
  if (!item) return 0;

  if (item.type === "upgrade_only_0")
    return userLimits.upgrade0Limit !== undefined
      ? userLimits.upgrade0Limit
      : 10;
  if (item.type === "upgrade_only_1")
    return userLimits.upgrade1Limit !== undefined
      ? userLimits.upgrade1Limit
      : 10;
  if (item.type === "upgrade_only_2")
    return userLimits.upgrade2Limit !== undefined
      ? userLimits.upgrade2Limit
      : 10;

  if ([1, 2, 3, 4, 5, 6, 7, 8, 21, 22, 23, 24, 25, 26, 51, 52].includes(id))
    return 1;
  return 10;
}

/**
 * 获取最优 trade 组合
 */
function getOptimalTradeCombo(subTarget, items, userLimits, usedTrade) {
  const tradeItems = items.filter((item) => item.type === "trade");
  if (tradeItems.length === 0 || subTarget < 0)
    return { steps: Infinity, combo: [] };

  tradeItems.sort((a, b) => b.item_value - a.item_value); // 按收益降序

  let remaining = subTarget;
  let combo = [];
  let steps = 0;

  for (const item of tradeItems) {
    const value = item.item_value;
    if (value <= 0 || remaining < value) continue;

    const maxByValue = Math.floor(remaining / value);
    const maxCount = getMaxCountForId(item.id, items, userLimits);
    const availableCount = maxCount - (usedTrade || 0);
    const useCount = Math.min(maxByValue, availableCount, 10 - steps);

    if (useCount > 0) {
      combo.push({ id: item.id, count: useCount });
      remaining -= useCount * value;
      steps += useCount;
    }
  }

  return remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
}

/**
 * 获取最优 material 和 upgrade 组合
 */
function getOptimalMaterialCombo(subTarget, items, userLimits, usedCounts) {
  const materialItems = items.filter(
    (item) => item.type === "material" || item.type === "upgrade"
  );
  if (materialItems.length === 0 || subTarget > 0)
    return { steps: Infinity, combo: [] };

  materialItems.sort((a, b) => b.item_value - a.item_value); // 负值大者优先

  let remaining = subTarget;
  let combo = [];
  let steps = 0;

  for (const item of materialItems) {
    const value = item.item_value;
    if (value >= 0 || remaining > value) continue;

    const maxByValue = Math.floor(remaining / value);
    const maxCount = getMaxCountForId(item.id, items, userLimits);
    const usedCount = usedCounts[item.type] || 0;
    const comboUsed = combo.find((c) => c.id === item.id)?.count || 0;
    const useCount = Math.min(maxByValue, maxCount - usedCount - comboUsed);

    if (useCount > 0) {
      combo.push({ id: item.id, count: useCount });
      remaining -= useCount * value;
      steps += useCount;
    }
  }

  return remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
}

/**
 * 获取最优 sanity 组合
 */
function getOptimalSanityCombo(subTarget, items, userLimits, currentSanity) {
  const sanityItems = items.filter(
    (item) =>
      (item.type === "3_star" || item.type === "2_star") &&
      item.consume <= userLimits.sanityLimit - currentSanity
  );
  if (sanityItems.length === 0 || subTarget < 0)
    return { steps: Infinity, combo: [] };

  sanityItems.sort((a, b) => b.consume - a.consume); // 按理智消耗降序

  let remaining = subTarget;
  let combo = [];
  let steps = 0;
  let totalSanity = currentSanity;

  for (const item of sanityItems) {
    const value = item.item_value;
    const consume = item.consume || 0;
    if (value <= 0 || remaining < value) continue;

    const maxByValue = Math.floor(remaining / value);
    const maxBySanity =
      consume > 0
        ? Math.floor((userLimits.sanityLimit - totalSanity) / consume)
        : Infinity;
    const maxCount = getMaxCountForId(item.id, items, userLimits);
    const useCount = Math.min(maxByValue, maxBySanity, maxCount);

    if (useCount > 0) {
      combo.push({ id: item.id, count: useCount });
      remaining -= useCount * value;
      steps += useCount;
      totalSanity += useCount * consume;
    }
  }

  return remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
}

/**
 * 寻找所有可能的路径
 */
function findPaths (
  target,
  items = classifyData,
  userLimits = {},
  epsilon = 1e-6
) {
  const startTime = performance.now(); // 开始计时

  if (typeof target !== "number" || !Array.isArray(items)) return [];

  const {
    sanityLimit = Infinity,
    upgrade0Limit = 10,
    upgrade1Limit = 10,
    upgrade2Limit = 10,
  } = userLimits;

  const queue = [
    {
      steps: [],
      totalValue: 0,
      totalSanity: 0,
      usedUpgrade0: 0,
      usedUpgrade1: 0,
      usedUpgrade2: 0,
      usedTrade: 0,
    },
  ];
  const exactPaths = [];
  const visited = new Set();
  const effectVisited = new Map(); // 增强剪枝：记录 (value, sanity) 的最优步骤数

  while (queue.length > 0 && exactPaths.length < 10) {
    const current = queue.shift();
    const {
      steps,
      totalValue,
      totalSanity,
      usedUpgrade0,
      usedUpgrade1,
      usedUpgrade2,
      usedTrade,
    } = current;

    if (steps.length >= 6) continue;

    const subTarget = target - totalValue;
    const usedCounts = {
      upgrade_only_0: usedUpgrade0,
      upgrade_only_1: usedUpgrade1,
      upgrade_only_2: usedUpgrade2,
      trade: usedTrade,
    };

    // 优先处理组合函数
    const combos = [
      getOptimalSanityCombo(subTarget, items, userLimits, totalSanity),
      getOptimalTradeCombo(subTarget, items, userLimits, usedTrade),
      getOptimalMaterialCombo(subTarget, items, userLimits, usedCounts),
    ];

    let hasValidCombo = false;
    for (const comboResult of combos) {
      if (comboResult.steps < Infinity) {
        hasValidCombo = true;
        const isTrade = comboResult === combos[1];
        const newSteps = [...steps, ...comboResult.combo];
        const newValue =
          totalValue +
          comboResult.combo.reduce(
            (sum, c) =>
              sum + items.find((i) => i.id === c.id).item_value * c.count,
            0
          );
        const newSanity =
          totalSanity +
          comboResult.combo.reduce(
            (sum, c) =>
              sum + (items.find((i) => i.id === c.id).consume || 0) * c.count,
            0
          );
        const pathKey = newSteps
          .map((s) => `${s.id}x${s.count}`)
          .sort()
          .join("_");
        const effectKey = `${newValue}_${newSanity}`;

        if (
          !visited.has(pathKey) &&
          newSanity <= sanityLimit &&
          steps.length + comboResult.steps <= 6
        ) {
          if (isTrade && usedTrade + comboResult.steps > 10) continue;

          visited.add(pathKey);
          const currentBestSteps =
            effectVisited.get(effectKey)?.steps || Infinity;
          if (
            !effectVisited.has(effectKey) ||
            newSteps.length < currentBestSteps
          ) {
            effectVisited.set(effectKey, {
              steps: newSteps.length,
              path: null,
            }); // 只存步骤数
            const newPath = {
              steps: newSteps,
              totalValue: newValue,
              totalSanity: newSanity,
              usedUpgrade0,
              usedUpgrade1,
              usedUpgrade2,
              usedTrade: isTrade ? usedTrade + comboResult.steps : usedTrade,
            };
            if (Math.abs(newValue - target) <= epsilon) {
              exactPaths.push(newPath);
              if (exactPaths.length >= 10) break;
            } else {
              queue.push(newPath);
            }
          }
        }
      }
    }

    // 单物品逻辑，仅在组合无效时执行
    if (!hasValidCombo) {
      for (const item of items) {
        const maxCount = getMaxCountForId(item.id, items, userLimits);
        for (let count = 1; count <= maxCount; count++) {
          const newValue = totalValue + item.item_value * count;
          const newSanity = totalSanity + (item.consume || 0) * count;

          if (newSanity > sanityLimit) continue;

          const newSteps = [...steps, { id: item.id, count }];
          const pathKey = newSteps
            .map((s) => `${s.id}x${s.count}`)
            .sort()
            .join("_");
          const effectKey = `${newValue}_${newSanity}`;

          if (visited.has(pathKey)) continue;
          visited.add(pathKey);

          const newUsedUpgrade0 =
            usedUpgrade0 + (item.type === "upgrade_only_0" ? count : 0);
          const newUsedUpgrade1 =
            usedUpgrade1 + (item.type === "upgrade_only_1" ? count : 0);
          const newUsedUpgrade2 =
            usedUpgrade2 + (item.type === "upgrade_only_2" ? count : 0);
          const newUsedTrade = usedTrade + (item.type === "trade" ? count : 0);

          if (
            newUsedUpgrade0 > upgrade0Limit ||
            newUsedUpgrade1 > upgrade1Limit ||
            newUsedUpgrade2 > upgrade2Limit ||
            newUsedTrade > 10
          ) {
            continue;
          }

          const currentBestSteps =
            effectVisited.get(effectKey)?.steps || Infinity;
          if (
            !effectVisited.has(effectKey) ||
            newSteps.length < currentBestSteps
          ) {
            effectVisited.set(effectKey, {
              steps: newSteps.length,
              path: null,
            });
            const newPath = {
              steps: newSteps,
              totalValue: newValue,
              totalSanity: newSanity,
              usedUpgrade0: newUsedUpgrade0,
              usedUpgrade1: newUsedUpgrade1,
              usedUpgrade2: newUsedUpgrade2,
              usedTrade: newUsedTrade,
            };

            if (Math.abs(newValue - target) <= epsilon) {
              exactPaths.push(newPath);
              if (exactPaths.length >= 10) break;
            } else {
              queue.push(newPath);
            }
          }
        }
        if (exactPaths.length >= 10) break;
      }
    }
  }

  exactPaths.sort((a, b) => a.steps.length - b.steps.length);
  const result = exactPaths.map((path) => path.steps);

  const endTime = performance.now(); // 结束计时
  console.log(`计算耗时: ${(endTime - startTime).toFixed(2)} 毫秒`);

  return result;
};

export {
  getOptimalTradeCombo,
  getOptimalMaterialCombo,
  getOptimalSanityCombo,
  findPaths,
};
