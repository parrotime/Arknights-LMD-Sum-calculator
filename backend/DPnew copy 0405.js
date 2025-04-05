import { classifyData } from "../src/DataService.js";

/**
 * 根据物品 ID 和限制条件，获取该物品的最大可用次数
 * @param {number} id - 物品 ID
 * @param {Array} items - 物品列表
 * @param {Object} userLimits - 用户限制条件
 * @returns {number} - 最大可用次数
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
/*
function getOptimalTradeCombo(subTarget, items, userLimits, usedTrade) {
  const tradeItems = items.filter((item) => item.type === "trade");
  if (tradeItems.length === 0) return { steps: Infinity, combo: [] };

  tradeItems.sort((a, b) => b.item_value - a.item_value); // 按 item_value 降序

  let remaining = subTarget;
  let combo = [];
  let steps = 0;

  for (const item of tradeItems) {
    const value = item.item_value;
    const maxCount = getMaxCountForId(item.id, items, userLimits);
    const availableCount = maxCount - (usedTrade || 0);

    if (value > 0 && remaining >= value) {
      const useCount = Math.min(Math.floor(remaining / value), availableCount, 10 - steps);
      if (useCount > 0) {
        combo.push({ id: item.id, count: useCount });
        remaining -= useCount * value;
        steps += useCount;
      }
    }
  }

  return { steps, combo };
}*/
/*
function getOptimalSanityCombo(subTarget, items, userLimits, currentSanity) {
  const sanityItems = items.filter(
    (item) =>
      (item.type === "3_star" || item.type === "2_star") &&
      item.consume <= userLimits.sanityLimit - currentSanity
  );
  if (sanityItems.length === 0) return { steps: Infinity, combo: [] };

  sanityItems.sort((a, b) => b.consume - a.consume); // 按理智消耗降序

  let remaining = subTarget;
  let combo = [];
  let steps = 0;
  let totalSanity = currentSanity;

  for (const item of sanityItems) {
    const value = item.item_value;
    const consume = item.consume || 0;
    if (value <= 0 || remaining <= 0) continue;

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
 * 获取最优 material 和 upgrade 组合
 */
/*
function getOptimalMaterialCombo(subTarget, items, userLimits, usedCounts) {
  const materialItems = items.filter((item) => item.type === "material" || item.type === "upgrade");
  if (materialItems.length === 0) return { steps: Infinity, combo: [] };

  materialItems.sort((a, b) => b.item_value - a.item_value); // 按 item_value 降序（负值大者优先）

  let remaining = subTarget;
  let combo = [];
  let steps = 0;

  for (const item of materialItems) {
    const value = item.item_value;
    const maxCount = getMaxCountForId(item.id, items, userLimits);
    const usedCount = usedCounts[item.type] || 0;
    const comboUsed = combo.find((c) => c.id === item.id)?.count || 0;
    const availableCount = maxCount - usedCount - comboUsed;

    if (value < 0 && remaining <= value) {
      const maxByValue = Math.floor(remaining / value);
      const useCount = Math.min(maxByValue, availableCount);
      if (useCount > 0) {
        combo.push({ id: item.id, count: useCount });
        remaining -= useCount * value;
        steps += useCount;
      }
    }
  }

  return { steps, combo };
}
*/

/*
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
/*
function getOptimalSanityCombo(subTarget, items, userLimits, currentSanity) {
  const sanityItems = items.filter(
    (item) => (item.type === "3_star" || item.type === "2_star") && item.consume <= (userLimits.sanityLimit - currentSanity)
  );
  if (sanityItems.length === 0) return { steps: Infinity, combo: [] };

  sanityItems.sort((a, b) => b.consume - a.consume); // 按 consume 降序

  let remaining = subTarget;
  let combo = [];
  let steps = 0;
  let totalSanity = currentSanity;

  for (const item of sanityItems) {
    const value = item.item_value;
    const consume = item.consume || 0;
    const maxCount = getMaxCountForId(item.id, items, userLimits);

    if (value > 0 && remaining >= value) {
      const maxByValue = Math.floor(remaining / value);
      const maxBySanity = consume > 0 ? Math.floor((userLimits.sanityLimit - totalSanity) / consume) : Infinity;
      const useCount = Math.min(maxByValue, maxCount, maxBySanity);
      if (useCount > 0) {
        combo.push({ id: item.id, count: useCount });
        remaining -= useCount * value;
        steps += useCount;
        totalSanity += useCount * consume;
      }
    }
  }

  return { steps, combo };
}
  */

/*
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
 * 寻找所有可能的路径
 * @param {number} target - 目标龙门币
 * @param {Array} items - 物品列表
 * @param {Object} userLimits - 用户限制条件
 * @param {number} currentSanity - 当前理智值
 * @returns {Object} - 最优路径
 */

/**
 * 获取最优 trade 组合
 */
function getOptimalTradeCombo(subTarget, items, userLimits, usedTrade) {
  const tradeItems = items.filter((item) => item.type === "trade");
  if (tradeItems.length === 0 || subTarget < 0) return { steps: Infinity, combo: [] };

  tradeItems.sort((a, b) => b.item_value - a.item_value); // 按收益降序

  let remaining = subTarget;
  let combo = [];
  let steps = 0;

  for (const item of tradeItems) {
    const value = item.item_value;
    const maxCount = getMaxCountForId(item.id, items, userLimits);
    const availableCount = Math.min(maxCount - (usedTrade || 0), 10 - steps);
    const useCount = Math.min(Math.floor(remaining / value), availableCount);

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
  const materialItems = items.filter((item) => item.type === "material" || item.type === "upgrade");
  if (materialItems.length === 0 || subTarget > 0) return { steps: Infinity, combo: [] };

  materialItems.sort((a, b) => b.item_value - a.item_value); // 负值大者优先

  let remaining = subTarget;
  let combo = [];
  let steps = 0;

  for (const item of materialItems) {
    const value = item.item_value;
    const maxCount = getMaxCountForId(item.id, items, userLimits);
    const usedCount = usedCounts[item.type] || 0;
    const comboUsed = combo.find((c) => c.id === item.id)?.count || 0;
    const useCount = Math.min(Math.floor(remaining / value), maxCount - usedCount - comboUsed);

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
    (item) => (item.type === "3_star" || item.type === "2_star") && 
              item.consume <= (userLimits.sanityLimit - currentSanity)
  );
  if (sanityItems.length === 0 || subTarget < 0) return { steps: Infinity, combo: [] };

  sanityItems.sort((a, b) => b.item_value - a.item_value); // 按收益降序

  let remaining = subTarget;
  let combo = [];
  let steps = 0;
  let totalSanity = currentSanity;

  for (const item of sanityItems) {
    const value = item.item_value;
    const consume = item.consume || 0;
    const maxBySanity = consume > 0 ? Math.floor((userLimits.sanityLimit - totalSanity) / consume) : Infinity;
    const maxCount = getMaxCountForId(item.id, items, userLimits);
    const useCount = Math.min(Math.floor(remaining / value), maxBySanity, maxCount);

    if (useCount > 0) {
      combo.push({ id: item.id, count: useCount });
      remaining -= useCount * value;
      steps += useCount;
      totalSanity += useCount * consume;
    }
  }

  return remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
}


function findPaths(
  target,
  items = classifyData,
  userLimits = {},
  epsilon = 1e-6
) {
  const startTime = performance.now(); // 记录开始时间
  console.log(
    `[Start] 计算目标值: ${target}, 时间: ${new Date().toISOString()}`
  );

  if (typeof target !== "number" || !Array.isArray(items)) return [];

  const {
    sanityLimit = Infinity,
    upgrade0Limit = 10,
    upgrade1Limit = 10,
    upgrade2Limit = 10,
  } = userLimits;

  /*
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
  const effectVisited = new Map();

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

  // 三种组合并行处理，无优先级
    const combos = [
      getOptimalSanityCombo(subTarget, items, userLimits, totalSanity),
      getOptimalTradeCombo(subTarget, items, userLimits, usedTrade),
      getOptimalMaterialCombo(subTarget, items, userLimits, usedCounts),
    ];

    for (const comboResult of combos) {
      if (comboResult.steps < Infinity) {
        const isTrade = comboResult === combos[1];
        const newSteps = [...steps, ...comboResult.combo];
        const newValue = totalValue + comboResult.combo.reduce((sum, c) => sum + items.find((i) => i.id === c.id).item_value * c.count, 0);
        const newSanity = totalSanity + comboResult.combo.reduce((sum, c) => sum + (items.find((i) => i.id === c.id).consume || 0) * c.count, 0);
        const pathKey = newSteps.map((s) => `${s.id}x${s.count}`).sort().join("_");
        const effectKey = `${newValue}_${newSanity}`;

        if (!visited.has(pathKey) && newSanity <= sanityLimit && steps.length + comboResult.steps <= 6) {
          if (isTrade && usedTrade + comboResult.steps > 10) continue;

          visited.add(pathKey);
          if (!effectVisited.has(effectKey) || newSteps.length < effectVisited.get(effectKey)) {
            effectVisited.set(effectKey, newSteps.length);
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

    // 单物品逻辑
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
          newUsedTrade > 6
        ) {
          continue;
        }

        if (
          !effectVisited.has(effectKey) ||
          newSteps.length < effectVisited.get(effectKey)
        ) {
          effectVisited.set(effectKey, newSteps.length);
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

  exactPaths.sort((a, b) => a.steps.length - b.steps.length);
  return exactPaths.map((path) => path.steps);
};*/

  // 初始化 DP Map
  const dp = new Map([[0, [[]]]]);
  const MAX_STEPS = 6;
  const MAX_PATHS = 10;

  // 第一阶段：单步路径
  for (const item of items) {
    const value = item.item_value;
    const maxCount = getMaxCountForId(item.id, items, userLimits);
    for (let count = 1; count <= maxCount; count++) {
      const newValue = value * count;
      const newSanity = (item.consume || 0) * count;
      if (newSanity > sanityLimit) break;

      let combo;
      if (item.type === "trade") {
        combo = getOptimalTradeCombo(newValue, items, userLimits, 0).combo;
      } else if (item.type === "material" || item.type === "upgrade") {
        combo = getOptimalMaterialCombo(newValue, items, userLimits, {}).combo;
      } else if (item.type === "3_star" || item.type === "2_star") {
        combo = getOptimalSanityCombo(newValue, items, userLimits, 0).combo;
      } else {
        combo = [{ id: item.id, count }];
      }

      if (combo.length > 0) {
        savePath(dp, newValue, combo, target, epsilon);
      }
    }
  }

  // 第二阶段：多步路径
  for (let step = 2; step <= MAX_STEPS; step++) {
    const states = Array.from(dp.entries());
    for (const [sum, paths] of states) {
      if (Math.abs(sum - target) > 3000) continue; // 剪枝

      for (const item of items) {
        const value = item.item_value;
        const maxCount = getMaxCountForId(item.id, items, userLimits);
        for (let count = 1; count <= maxCount; count++) {
          const newValue = sum + value * count;
          const newSanity = (item.consume || 0) * count;
          if (newSanity > sanityLimit) break;

          for (const path of paths) {
            const totalSanity =
              path.reduce(
                (acc, s) =>
                  acc +
                  (items.find((i) => i.id === s.id).consume || 0) * s.count,
                0
              ) + newSanity;
            if (totalSanity > sanityLimit) continue;

            const usedTrade = path.reduce(
              (acc, s) =>
                acc +
                (items.find((i) => i.id === s.id).type === "trade"
                  ? s.count
                  : 0),
              0
            );
            if (item.type === "trade" && usedTrade + count > 10) continue;

            let combo;
            if (item.type === "trade") {
              combo = getOptimalTradeCombo(
                value * count,
                items,
                userLimits,
                usedTrade
              ).combo;
            } else if (item.type === "material" || item.type === "upgrade") {
              combo = getOptimalMaterialCombo(
                value * count,
                items,
                userLimits,
                {}
              ).combo;
            } else if (item.type === "3_star" || item.type === "2_star") {
              combo = getOptimalSanityCombo(
                value * count,
                items,
                userLimits,
                totalSanity - newSanity
              ).combo;
            } else {
              combo = [{ id: item.id, count }];
            }

            if (combo.length > 0) {
              const newPath = [...path, ...combo];
              if (isPathValid(newPath, items, userLimits)) {
                savePath(dp, newValue, newPath, target, epsilon);
              }
            }
          }
        }
      }
    }
    if ((dp.get(target) || []).length >= MAX_PATHS) break;
  }

  // 后处理优化
  const optimizedPaths = optimizePaths(dp.get(target) || [], items, userLimits);
  const endTime = performance.now();
  console.log(`[End] 计算完成，耗时: ${(endTime - startTime).toFixed(2)}ms`);

  return optimizedPaths;
}

/**
 * 保存路径
 */
function savePath(dp, sum, path, target, epsilon) {
  if (!dp.has(sum)) dp.set(sum, []);
  const paths = dp.get(sum);
  const pathKey = path
    .map((s) => `${s.id}x${s.count}`)
    .sort()
    .join("_");
  if (
    !paths.some(
      (p) =>
        p
          .map((s) => `${s.id}x${s.count}`)
          .sort()
          .join("_") === pathKey
    )
  ) {
    paths.push(path);
    if (Math.abs(sum - target) <= epsilon && paths.length <= 10) {
      console.log(`找到精确路径: ${sum}, ${pathKey}`);
    }
  }
}

/**
 * 验证路径有效性
 */
function isPathValid(path, items, userLimits) {
  const idCountMap = new Map();
  for (const step of path) {
    const count = idCountMap.get(step.id) || 0;
    idCountMap.set(step.id, count + step.count);
    if (idCountMap.get(step.id) > getMaxCountForId(step.id, items, userLimits))
      return false;
  }
  return true;
}

/**
 * 后处理优化路径
 */
function optimizePaths(paths, items, userLimits) {
  return paths
    .map((path) => {
      const tradeSteps = path.filter(
        (s) => items.find((i) => i.id === s.id).type === "trade"
      );
      const materialSteps = path.filter(
        (s) =>
          items.find((i) => i.id === s.id).type === "material" ||
          items.find((i) => i.id === s.id).type === "upgrade"
      );
      const sanitySteps = path.filter(
        (s) =>
          items.find((i) => i.id === s.id).type === "3_star" ||
          items.find((i) => i.id === s.id).type === "2_star"
      );
      const otherSteps = path.filter(
        (s) =>
          !["trade", "material", "upgrade", "3_star", "2_star"].includes(
            items.find((i) => i.id === s.id).type
          )
      );

      let totalSanity = path.reduce(
        (acc, s) =>
          acc + (items.find((i) => i.id === s.id).consume || 0) * s.count,
        0
      );
      let usedTrade = tradeSteps.reduce((acc, s) => acc + s.count, 0);

      // 优化 trade
      const tradeValue = tradeSteps.reduce(
        (acc, s) => acc + items.find((i) => i.id === s.id).item_value * s.count,
        0
      );
      const tradeCombo = getOptimalTradeCombo(
        tradeValue,
        items,
        userLimits,
        0
      ).combo;
      if (
        tradeCombo.length > 0 &&
        tradeCombo.reduce((acc, s) => acc + s.count, 0) <= 10
      ) {
        usedTrade = tradeCombo.reduce((acc, s) => acc + s.count, 0);
      } else {
        tradeCombo.length = 0; // 保留原路径
      }

      // 优化 material
      const materialValue = materialSteps.reduce(
        (acc, s) => acc + items.find((i) => i.id === s.id).item_value * s.count,
        0
      );
      const materialCombo = getOptimalMaterialCombo(
        materialValue,
        items,
        userLimits,
        {}
      ).combo;

      // 优化 sanity
      const sanityValue = sanitySteps.reduce(
        (acc, s) => acc + items.find((i) => i.id === s.id).item_value * s.count,
        0
      );
      const sanityCombo = getOptimalSanityCombo(
        sanityValue,
        items,
        userLimits,
        totalSanity -
          sanitySteps.reduce(
            (acc, s) =>
              acc + (items.find((i) => i.id === s.id).consume || 0) * s.count,
            0
          )
      ).combo;

      // 合并优化结果
      const optimizedPath = [
        ...otherSteps,
        ...(tradeCombo.length ? tradeCombo : tradeSteps),
        ...(materialCombo.length ? materialCombo : materialSteps),
        ...(sanityCombo.length ? sanityCombo : sanitySteps),
      ];
      return isPathValid(optimizedPath, items, userLimits)
        ? optimizedPath
        : path;
    })
    .sort(
      (a, b) =>
        a.reduce((acc, s) => acc + s.count, 0) -
        b.reduce((acc, s) => acc + s.count, 0)
    )
    .slice(0, 10);
}




export { getOptimalTradeCombo, getOptimalMaterialCombo, getOptimalSanityCombo, findPaths };