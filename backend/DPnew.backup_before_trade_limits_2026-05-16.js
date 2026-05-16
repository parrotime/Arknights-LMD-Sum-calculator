import { classifyData } from "./DataService.js";

const MAX_STEPS = 6;
const MAX_PATHS_PER_SUM = 10;
const MAX_PATHS_FOR_TARGET = 15; // target 值多保留，最终由 finalizeResult 裁剪
const TARGET_PATH_COUNT = 10;

// 获取物品最大使用次数
const getMaxCountForId = (id, itemMap) => {
  const item = itemMap.get(id);
  if (!item) return 10;
  const t = item.type;
  if (t === "upgrade") return 1;
  if (t === "upgrade_only_1") return 5;
  if (t === "upgrade_only_2") return 3;
  return 10;
};

//通用贪心面额组合（售卖赤金 / 基建合成共用）
const tradeDenoms = [{ id: 119, value: 2000 }, { id: 118, value: 1500 }, { id: 117, value: 1000 }];
const materialDenoms = [{ id: 103, value: 400 }, { id: 102, value: 300 }, { id: 101, value: 200 }, { id: 100, value: 100 }];

const getOptimalGreedyCombo = (absTarget, denoms, cache) => {
  if (absTarget === 0) return { steps: 0, combo: [] };
  if (absTarget < 0) return { steps: Infinity, combo: [] };
  if (cache.has(absTarget)) return cache.get(absTarget);
  let remaining = absTarget;
  let steps = 0;
  const combo = [];
  for (const { id, value } of denoms) {
    const cnt = Math.floor(remaining / value);
    if (cnt > 0) {
      combo.push({ id, count: cnt });
      remaining -= cnt * value;
      steps += cnt;
    }
  }
  const result = remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
  cache.set(absTarget, result);
  return result;
};

//计算”消耗理智”最优组合（精确有界背包 DP）
const getOptimalStageCombo = (subTarget, stageItems, itemMap, cache) => {
  if (subTarget <= 0) return { steps: 0, combo: [] };
  if (cache.has(subTarget)) return cache.get(subTarget);

  const T = Math.round(subTarget);
  const dp = new Array(T + 1).fill(Infinity);
  dp[0] = 0;
  const from = new Array(T + 1).fill(null);

  for (const item of stageItems) {
    const val = item.item_value;
    const maxCnt = getMaxCountForId(item.id, itemMap);
    for (let v = T; v >= val; v--) {
      for (let k = 1; k <= maxCnt && k * val <= v; k++) {
        if (dp[v - k * val] + k < dp[v]) {
          dp[v] = dp[v - k * val] + k;
          from[v] = { id: item.id, count: k, prev: v - k * val };
        }
      }
    }
  }

  if (dp[T] === Infinity) {
    const result = { steps: Infinity, combo: [] };
    cache.set(subTarget, result);
    return result;
  }

  const combo = [];
  let v = T;
  while (v > 0 && from[v]) {
    combo.push({ id: from[v].id, count: from[v].count });
    v = from[v].prev;
  }

  const result = { steps: dp[T], combo };
  cache.set(subTarget, result);
  return result;
};

//根据物品类型获取最优组合片段（两阶段共用）
const getOptimalFragment = (item, count, stageItems, itemMap, caches) => {
  const val = item.item_value * count;
  if (item.type === "trade") {
    const { combo } = getOptimalGreedyCombo(val, tradeDenoms, caches.trade);
    return combo.length > 0 ? combo : null;
  }
  if (item.type === "material") {
    const { combo } = getOptimalGreedyCombo(Math.abs(val), materialDenoms, caches.material);
    return combo.length > 0 ? combo : null;
  }
  if (item.type === "3_star" || item.type === "2_star") {
    const { combo } = getOptimalStageCombo(val, stageItems, itemMap, caches.stage);
    return combo.length > 0 ? combo : null;
  }
  return [{ id: item.id, count }];
};

// 路径规范 - 只选择最优的步骤组合
function normalizePath(path, itemMap, caches) {
  let totalTradeValue = 0;
  let totalMaterialValue = 0;
  const otherSteps = []; //非售卖赤金、基建合成的步骤

  for (const step of path) {
    const item = itemMap.get(step.id);
    if (item?.type === "trade") {
      totalTradeValue += item.item_value * step.count;
    } else if (item?.type === "material") {
      totalMaterialValue += item.item_value * step.count;
    } else {
      otherSteps.push(step);
    }
  }

  const { combo: optimalTradeCombo } = getOptimalGreedyCombo(totalTradeValue, tradeDenoms, caches.trade);
  const { combo: optimalMaterialCombo } = getOptimalGreedyCombo(Math.abs(totalMaterialValue), materialDenoms, caches.material);

  const pathMap = new Map();

  for (const step of otherSteps) {
    pathMap.set(step.id, (pathMap.get(step.id) || 0) + step.count);
  }

  if (optimalTradeCombo.length > 0) {
    for (const step of optimalTradeCombo) {
      pathMap.set(step.id, (pathMap.get(step.id) || 0) + step.count);
    }
  }
  if (optimalMaterialCombo.length > 0) {
    for (const step of optimalMaterialCombo) {
      pathMap.set(step.id, (pathMap.get(step.id) || 0) + step.count);
    }
  }

  return Array.from(pathMap.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => a.id - b.id);
}

function savePath(ctx, sum, path) {
  const { dp, maxPaths, target, itemMap, upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit, caches } = ctx;

  // 先检查用户限制（廉价操作），再做 normalizePath（昂贵操作）
  let upgrade0Count = 0,
    upgrade1Count = 0,
    upgrade2Count = 0,
    totalSanity = 0;

  for (const step of path) {
    const item = itemMap.get(step.id);
    if (!item) continue;
    if (item.type === "upgrade_only_0") upgrade0Count += step.count;
    if (item.type === "upgrade_only_1") upgrade1Count += step.count;
    if (item.type === "upgrade_only_2") upgrade2Count += step.count;
    if (item.consume > 0) totalSanity += step.count * item.consume;
  }

  if (
    upgrade0Count > upgrade0Limit ||
    upgrade1Count > upgrade1Limit ||
    upgrade2Count > upgrade2Limit ||
    totalSanity > sanityLimit
  ) {
    return false;
  }

  const normalizedPath = normalizePath(path, itemMap, caches);
  const normalizedPathKey = normalizedPath
    .map((s) => `${s.id}x${s.count}`)
    .join("_");

  let actualNormalizedSum = 0;

  for (const step of normalizedPath) {
    const item = itemMap.get(step.id);
    if (item?.item_value) {
      actualNormalizedSum += item.item_value * step.count;
    }
  }
  if (actualNormalizedSum !== sum) {
    return false;
  }

  // 获取或初始化state
  if (!dp.has(sum)) {
    dp.set(sum, { paths: [], keys: new Set() });
  }

  const state = dp.get(sum);
  const existingPaths = state.paths;
  const existingKeys = state.keys;

  // 检查是否重合
  if (existingKeys.has(normalizedPathKey)) {
    return false;
  }

  // target 值多保留路径，增加最终多样性
  const effectiveMaxPaths = (sum === target) ? MAX_PATHS_FOR_TARGET : maxPaths;

  // 决定是否savepath
  const currentNormalizedPathLength = normalizedPath.length;
  let pathWasAddedOrReplaced = false;

  if (existingPaths.length < effectiveMaxPaths) {
    // 列表未满
    existingPaths.push(normalizedPath);
    existingKeys.add(normalizedPathKey);
    existingPaths.sort((a, b) => a.length - b.length); // 按种类数排序
    pathWasAddedOrReplaced = true;
  } else {
    // 列表已满
    const longestExistingPath = existingPaths[existingPaths.length - 1]; 
    const longestExistingPathLength = longestExistingPath.length;

    if (currentNormalizedPathLength < longestExistingPathLength) {
      // 新路径种类: 直接替换 
      const removedPathKey = longestExistingPath
        .map((s) => `${s.id}x${s.count}`)
        .join("_");
      existingKeys.delete(removedPathKey);
      existingPaths.pop();
      existingPaths.push(normalizedPath);
      existingKeys.add(normalizedPathKey);
      existingPaths.sort((a, b) => a.length - b.length); // 保持种类数排序
      pathWasAddedOrReplaced = true;
    } else if (currentNormalizedPathLength === longestExistingPathLength) {
      // 新路径种类 最长路径相同: 比较总物品数 
      const newTotalCount = normalizedPath.reduce(
        (sum, step) => sum + step.count, 0
      );
      const longestExistingTotalCount = longestExistingPath.reduce(
        (sum, step) => sum + step.count, 0
      );

      if (newTotalCount < longestExistingTotalCount) {
        // 只有新路径总数更少时才替换
        const removedPathKey = longestExistingPath
          .map((s) => `${s.id}x${s.count}`)
          .join("_");
        existingKeys.delete(removedPathKey);
        existingPaths.pop();
        existingPaths.push(normalizedPath);
        existingKeys.add(normalizedPathKey);
        // 重新排序以防万一 (虽然理论上长度不变，但替换可能影响顺序)
        existingPaths.sort((a, b) => a.length - b.length);
        pathWasAddedOrReplaced = true;
      }
    }
  }

  // 检查是否找到精确解（以实际存储上限为准）
  if (pathWasAddedOrReplaced && sum === target) {
    const targetState = dp.get(target);
    const targetPaths = targetState?.paths;
    if (targetPaths && targetPaths.length >= MAX_PATHS_FOR_TARGET) {
      return true;
    }
  }
  return false;
}

//检查路径是否满足物品使用次数限制
function isPathValid(path, itemMap) {
  const idCountMap = new Map();
  for (const step of path) {
    const currentCount = idCountMap.get(step.id) || 0;
    idCountMap.set(step.id, currentCount + step.count);
    const maxCount = getMaxCountForId(step.id, itemMap);
    if (idCountMap.get(step.id) > maxCount) return false;
  }
  return true;
}

//合并并排序路序
function mergeAndSortPath(oldPath, newSteps) {
  const pathMap = new Map();
  for (const step of oldPath) {
    pathMap.set(step.id, (pathMap.get(step.id) || 0) + step.count);
  }

  const stepsArray = Array.isArray(newSteps) ? newSteps : [newSteps];
  for (const step of stepsArray) {
    pathMap.set(step.id, (pathMap.get(step.id) || 0) + step.count);
  }

  return Array.from(pathMap.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => a.id - b.id);
}


function finalizeResult(dp, target, maxPaths, itemMap) {
  const targetState = dp.get(target);
  const result = targetState ? targetState.paths : [];
  const uniquePaths = new Set();

  //路径去重
  const finalResult = result
    .map((path) => {
      if (!Array.isArray(path)) return null;
      const nonStageKey = path
        .filter((step) => {
          const t = itemMap.get(step.id)?.type;
          return t !== "3_star" && t !== "2_star";
        })
        .map((s) => `${s.id}x${s.count}`)
        .join("_");
      if (uniquePaths.has(nonStageKey)) return null;
      uniquePaths.add(nonStageKey);
      return path;
    })
    .filter(Boolean)
    .sort((a, b) => {
      // 优先 1: 比较路径中步骤的种类数量，种类少的排前面
      const lengthDiff = a.length - b.length;
      if (lengthDiff !== 0) {
        return lengthDiff;
      }

      // 优先 2: 种类数相同比较总物品数，总数少的排前面
      const totalCountA = a.reduce((sum, step) => sum + step.count, 0);
      const totalCountB = b.reduce((sum, step) => sum + step.count, 0);
      const countDiff = totalCountA - totalCountB;
      if (countDiff !== 0) {
        return countDiff;
      }

      // 优先 3: 都相同，按 ID 排序
      return a.length > 0 && b.length > 0 ? a[0].id - b[0].id : 0;
    })
    .slice(0, maxPaths * 3);

  // 轻量多样性选择：按策略类型签名限制同类路径数量
  const MAX_PER_SIG = 4;
  const sigCounts = new Map();
  const diverse = [];
  const overflow = [];
  for (const path of finalResult) {
    let sig = 0;
    for (const step of path) {
      const item = itemMap.get(step.id);
      if (!item) continue;
      if (item.consume > 0) sig |= 1;
      else if (item.type === "trade") sig |= 2;
      else if (item.type === "material") sig |= 4;
      else if (item.type?.startsWith("upgrade")) sig |= 8;
    }
    const cnt = sigCounts.get(sig) || 0;
    if (cnt < MAX_PER_SIG) {
      sigCounts.set(sig, cnt + 1);
      diverse.push(path);
    } else {
      overflow.push(path);
    }
    if (diverse.length >= maxPaths) break;
  }
  if (diverse.length < maxPaths) {
    diverse.push(...overflow.slice(0, maxPaths - diverse.length));
  }

  // 对每个路径进行内部步骤重排
  const reorderedFinalResult = diverse.map((path) => {
    if (!Array.isArray(path)) return path;

    const positiveSteps = [];
    const negativeSteps = [];

    for (const step of path) {
      const item = itemMap.get(step.id);
      if (item && item.item_value > 0) {
        positiveSteps.push(step);
      } else {
        negativeSteps.push(step);
      }
    }
    // 合并数组，正值在前，负值在后
    return [...positiveSteps, ...negativeSteps];
  });

  return reorderedFinalResult;
}

//主函数：寻找满足目标值的路径 
export const findPaths = (target, items = classifyData, userLimits = {}) => {
  if (typeof target !== "number" || !Array.isArray(items)) {
    return [];
  }

  const caches = { trade: new Map(), material: new Map(), stage: new Map() };
  const itemMap = new Map(items.map(i => [i.id, i]));
  const pruneThreshold = Math.min(Math.max(Math.abs(target), 1000), 3000);
  let enoughPaths = false;
  const upgrade0Limit = userLimits.upgrade0Limit ?? 10;
  const upgrade1Limit = userLimits.upgrade1Limit ?? 10;
  const upgrade2Limit = userLimits.upgrade2Limit ?? 10;
  const sanityLimit = userLimits.sanityLimit ?? Infinity;
  const stageItems = items
    .filter(
      (item) => item.type === "3_star" || item.type === "2_star"
    )
    .sort((a, b) => b.item_value - a.item_value);
  const dp = new Map([[0, { paths: [[]], keys: new Set([""]) }]]);
  const validItems = items.filter(
    (item) =>
      typeof item?.item_value === "number" &&
      item.item_value !== 0
  );
  const sortedItems = [...validItems].sort(
    (a, b) => Math.abs(b.item_value) - Math.abs(a.item_value)
  );

  const ctx = { dp, maxPaths: MAX_PATHS_PER_SUM, target, itemMap,
    upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit, caches };

  // 第一阶段：单步路径（不提前终止，收集所有单步解作为 Phase 2 基础）
  for (const item of sortedItems) {
    const itemValue = item.item_value;
    const maxCount = getMaxCountForId(item.id, itemMap);
    let count = 0;
    while (
      count < maxCount &&
      Math.abs(itemValue * (count + 1) - target) <= Math.abs(target) + Math.abs(itemValue)*0.5 ) {
      count++;
      const newSum = itemValue * count;
      const newPath = getOptimalFragment(item, count, stageItems, itemMap, caches);
      if (!newPath) continue;
      savePath(ctx, newSum, newPath);
    }
  }

  // Phase 1 结束后检查是否已找够
  const targetStateAfterP1 = dp.get(target);
  if (targetStateAfterP1 && targetStateAfterP1.paths.length >= MAX_PATHS_FOR_TARGET) {
    enoughPaths = true;
  }

  // 第二阶段：多步路径
  for (let step = 2; step <= MAX_STEPS && !enoughPaths; step++) {
    // 动态剪枝：step 越大，离 target 应越近
    const remainingBudget = MAX_STEPS - step + 1;
    const dynamicThreshold = Math.ceil(pruneThreshold * remainingBudget / MAX_STEPS);

    const currentStatesEntries = Array.from(dp.entries());
    for (const [currentSum, state] of currentStatesEntries) {
      const paths = state.paths;
      if (Math.abs(currentSum - target) > dynamicThreshold) continue;

      const remaining = target - currentSum;

      // 优先尝试精确匹配：找能一步到位的物品
      let exactMatchTried = false;
      for (const item of sortedItems) {
        const iv = item.item_value;
        if (iv === 0) continue;
        const exactCount = remaining / iv;
        if (exactCount > 0 && Number.isInteger(exactCount) && exactCount <= getMaxCountForId(item.id, itemMap)) {
          exactMatchTried = true;
          for (const oldPath of paths) {
            const newPathFragment = getOptimalFragment(item, exactCount, stageItems, itemMap, caches);
            if (!newPathFragment) continue;
            const potentialNewPath = mergeAndSortPath(oldPath, newPathFragment);
            if (isPathValid(potentialNewPath, itemMap)) {
              if (savePath(ctx, target, potentialNewPath)) {
                enoughPaths = true;
              }
              if (enoughPaths) break;
            }
          }
          if (enoughPaths) break;
        }
      }
      if (enoughPaths) break;

      // 常规遍历所有物品
      for (const item of sortedItems) {
        const itemValue = item.item_value;
        const maxCount = getMaxCountForId(item.id, itemMap);
        let count = 0;
        while (
          count < maxCount &&
          Math.abs(currentSum + itemValue * (count + 1) - target) <= Math.abs(target) + Math.abs(itemValue)) {
          count++;
          const newSum = currentSum + itemValue * count;
          // 跳过精确匹配已处理的情况
          if (exactMatchTried && newSum === target) continue;
          for (const oldPath of paths) {
            const newPathFragment = getOptimalFragment(item, count, stageItems, itemMap, caches);
            if (!newPathFragment) continue;
            const potentialNewPath = mergeAndSortPath(oldPath, newPathFragment);
            if (isPathValid(potentialNewPath, itemMap)) {
              if (savePath(ctx, newSum, potentialNewPath)){
                enoughPaths = true;
              }
              if (enoughPaths) break;
            }
          }
          if (enoughPaths) break;
        }
        if (enoughPaths) break;
      }
      if (enoughPaths) break;
    }
  }

  return finalizeResult(dp, target, TARGET_PATH_COUNT, itemMap);
};

// 导出内部函数供单元测试使用
export const _test = {
  getOptimalGreedyCombo,
  getOptimalStageCombo,
  getOptimalFragment,
  normalizePath,
  savePath,
  isPathValid,
  mergeAndSortPath,
  finalizeResult,
  getMaxCountForId,
  tradeDenoms,
  materialDenoms,
  MAX_STEPS,
  MAX_PATHS_PER_SUM,
  MAX_PATHS_FOR_TARGET,
  TARGET_PATH_COUNT,
};