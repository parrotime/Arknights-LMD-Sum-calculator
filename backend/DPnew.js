import { classifyData } from "../ark-lmd-top/DataService.js";

const tradeGoldCache = new Map();
const materialCache = new Map();
const stageCache = new Map();

const stageIds = [
  87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 107, 108, 109, 110, 111, 112,
  113, 114, 210, 211,
];
const tradeGoldIds = [117, 118, 119];
const materialIds = [100, 101, 102, 103];

const MAX_STEPS = 6;
const MAX_PATHS_PER_SUM = 10;
const TARGET_PATH_COUNT = 10;

// 获取物品最大使用次数 
const getMaxCountForId = (id, items) => {
  const item = items.find((i) => i.id === id);
  if (item?.type === "upgrade") return 1;
  if ([1, 2, 3, 4, 5, 6, 7, 8, 21, 22, 23, 24, 25, 26, 51, 52].includes(id))
    return 1;
  if (id >= 150 && id <= 180) return 5;
  if (id >= 181 && id <= 209) return 3;
  return 10;
};


//计算“售卖赤金”最优组合
const getOptimalTradeGoldCombo = (subTarget) => {
  if (subTarget < 0) return { steps: Infinity, combo: [] };
  if (tradeGoldCache.has(subTarget)) return tradeGoldCache.get(subTarget);
  let remaining = subTarget;
  let steps = 0;
  let combo = [];
  const count2000 = Math.floor(remaining / 2000);
  if (count2000 > 0) {
    combo.push({ id: 119, count: count2000 });
    remaining -= count2000 * 2000;
    steps += count2000;
  }
  const count1500 = Math.floor(remaining / 1500);
  if (count1500 > 0) {
    combo.push({ id: 118, count: count1500 });
    remaining -= count1500 * 1500;
    steps += count1500;
  }
  const count1000 = Math.floor(remaining / 1000);
  if (count1000 > 0) {
    combo.push({ id: 117, count: count1000 });
    remaining -= count1000 * 1000;
    steps += count1000;
  }
  const result =
    remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
  tradeGoldCache.set(subTarget, result);
  return result;
};


//计算“基建合成”最优组合
const getOptimalMaterialCombo = (subTarget) => {
  if (subTarget > 0) return { steps: Infinity, combo: [] };
  if (materialCache.has(subTarget)) return materialCache.get(subTarget);
  let remaining = Math.abs(subTarget);
  let steps = 0;
  let combo = [];
  const count400 = Math.floor(remaining / 400);
  if (count400 > 0) {
    combo.push({ id: 103, count: count400 });
    remaining -= count400 * 400;
    steps += count400;
  }
  const count300 = Math.floor(remaining / 300);
  if (count300 > 0) {
    combo.push({ id: 102, count: count300 });
    remaining -= count300 * 300;
    steps += count300;
  }
  const count200 = Math.floor(remaining / 200);
  if (count200 > 0) {
    combo.push({ id: 101, count: count200 });
    remaining -= count200 * 200;
    steps += count200;
  }
  const count100 = Math.floor(remaining / 100);
  if (count100 > 0) {
    combo.push({ id: 100, count: count100 });
    remaining -= count100 * 100;
    steps += count100;
  }
  const result =
    remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
  materialCache.set(subTarget, result);
  return result;
};


//优化：计算“消耗理智”最优组合 (Unchanged)
const getOptimalStageCombo = (subTarget, stageItems, items, epsilon) => {
  if (subTarget <= 0) return { steps: 0, combo: [] };
  if (stageCache.has(subTarget)) return stageCache.get(subTarget);
  let remaining = subTarget;
  let steps = 0;
  let combo = [];
  for (const item of stageItems) {
    const maxCount = Math.min(
      getMaxCountForId(item.id, items),
      Math.floor(remaining / item.item_value)
    );
    if (maxCount > 0) {
      combo.push({ id: item.id, count: maxCount });
      remaining -= maxCount * item.item_value;
      steps += maxCount;
      if (remaining <= epsilon) break;
    }
  }
  const result =
    remaining <= epsilon ? { steps, combo } : { steps: Infinity, combo: [] };
  stageCache.set(subTarget, result);
  return result;
};


// 路径规范化 - 只选择最优的步骤组合
function normalizePath(path, items) {
  let totalTradeValue = 0;
  let totalMaterialValue = 0;
  const otherSteps = []; //非售卖赤金、基建合成的步骤

  for (const step of path) {
    if (tradeGoldIds.includes(step.id)) {
      const item = items.find((i) => i.id === step.id);
      if (item?.item_value) {
        totalTradeValue += item.item_value * step.count;
      }
    } else if (materialIds.includes(step.id)) {
      const item = items.find((i) => i.id === step.id);
      if (item?.item_value) {
        totalMaterialValue += item.item_value * step.count;
      }
    } else {
      otherSteps.push(step);
    }
  }

  const { combo: optimalTradeCombo } = getOptimalTradeGoldCombo(totalTradeValue);
  const { combo: optimalMaterialCombo } = getOptimalMaterialCombo(totalMaterialValue);

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

/**
 * 保存路径并检查限制, 优化列表满时的替换逻辑)
 * @param {Map} dp
 * @param {number} sum
 * @param {Array} path  原始路径
 * @param {number} maxPaths  
 * @param {number} target
 * @param {number} epsilon
 * @param {Array} items 
 * @param {number} upgrade0Limit
 * @param {number} upgrade1Limit
 * @param {number} upgrade2Limit
 * @param {number} sanityLimit
 * @param {number} targetPathCount 
 * @returns {boolean} 
 */
function savePath(dp, sum, path, maxPaths, target, epsilon, items, 
  upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit, targetPathCount) {
  
  const normalizedPath = normalizePath(path, items);
  const normalizedPathKey = normalizedPath
    .map((s) => `${s.id}x${s.count}`)
    .join("_");

  let actualNormalizedSum = 0; //用于计算LMD总和

  for (const step of normalizedPath) {
    const item = items.find((i) => i.id === step.id);
    if (item?.item_value) {
      actualNormalizedSum += item.item_value * step.count;
    } else {
      console.warn(
        `Item value not found for ID ${step.id} in normalized path!`
      );
    }
  }

  // 比较原始计算的 sum 和规范化路径的实际 sum
  if (Math.abs(actualNormalizedSum - sum) > epsilon * 100) {
    return false; // 如果确定是错误，阻止存储
  }

  //console.log('Saving attempt: sum=',sum);
  //console.log('pathkey=',{normalizedPathKey});
  //console.log('length=',normalizedPath.length);

  // 计算原始路径的消耗
  let upgrade0Count = 0,
    upgrade1Count = 0,
    upgrade2Count = 0,
    totalSanity = 0;

  for (const step of path) {
    const item = items.find((i) => i.id === step.id);
    if (!item) continue;
    if (item.type === "upgrade_only_0") upgrade0Count += step.count;
    if (item.type === "upgrade_only_1") upgrade1Count += step.count;
    if (item.type === "upgrade_only_2") upgrade2Count += step.count;
    if (item.consume > 0) totalSanity += step.count * item.consume;
  }

  // 检查用户限制 
  if (
    upgrade0Count > upgrade0Limit ||
    upgrade1Count > upgrade1Limit ||
    upgrade2Count > upgrade2Limit ||
    totalSanity > sanityLimit
  ) {
    return false;
  }

  // 获取或初始化state
  if (!dp.has(sum)) {
    dp.set(sum, { paths: [], keys: new Set() });
  }

  const state = dp.get(sum);
  const existingPaths = state.paths;
  const existingKeys = state.keys;

  // 检查是否重复
  if (existingKeys.has(normalizedPathKey)) {
    return false;
  }

  // 决定是否savepath
  const currentNormalizedPathLength = normalizedPath.length;
  let pathWasAddedOrReplaced = false;

  if (existingPaths.length < maxPaths) {
    // 列表未满
    existingPaths.push(normalizedPath);
    existingKeys.add(normalizedPathKey);
    existingPaths.sort((a, b) => a.length - b.length); // 按种类数排序
    pathWasAddedOrReplaced = true;
  } else {
    // 列表已满
    const longestExistingPath = existingPaths[existingPaths.length - 1]; // 获取最长路径对象
    const longestExistingPathLength = longestExistingPath.length;

    if (currentNormalizedPathLength < longestExistingPathLength) {
      // 新路径种类更少: 直接替换 
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
      // 新路径种类数 与 最长路径 相同: 比较总物品数 
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

  // 检查是否找到精确解
  if (pathWasAddedOrReplaced && Math.abs(sum - target) <= epsilon) {
    const targetState = dp.get(target);
    const targetPaths = targetState?.paths;
    if (targetPaths && targetPaths.length >= targetPathCount) {
      console.log(
        `发现精确解! sum=${sum}, 规范化路径: ${normalizedPathKey}. 目标 ${target} 的路径数已达 ${targetPaths.length} (>=${targetPathCount})`
      );
      return true;
    } else {
      console.log(
        `发现精确解! sum=${sum}, 规范化路径: ${normalizedPathKey}. (目标 ${target} 的路径数: ${targetPaths?.length ?? 0}/${targetPathCount})`
      );
    }
  }

  return false;
}


//检查路径是否满足物品使用次数限制 
function isPathValid(path, items) {
  const idCountMap = new Map();
  for (const step of path) {
    const currentCount = idCountMap.get(step.id) || 0;
    idCountMap.set(step.id, currentCount + step.count);
    const maxCount = getMaxCountForId(step.id, items);
    if (idCountMap.get(step.id) > maxCount) return false;
  }
  return true;
}


//合并并排序路径
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

/**
 * 整理并返回最终结果
 * @param {Map} dp
 * @param {number} target
 * @param {number} maxPaths 
 * @param {Array} stageIds 
 */
function finalizeResult(dp, target, maxPaths, stageIds) {
  const startTime = Date.now();
  const targetState = dp.get(target);
  const result = targetState ? targetState.paths : [];
  const uniquePaths = new Set();

  //路径去重
  const finalResult = result
    .map((path) => {
      const nonStageKey = path
        .filter((step) => !stageIds.includes(step.id))
        .map((s) => `${s.id}x${s.count}`)
        .join("_");
      if (uniquePaths.has(nonStageKey)) return null;
      uniquePaths.add(nonStageKey);
      return path;
    })
    .filter(Boolean)
    .sort((a, b) => {
      // 优先级 1: 比较路径中步骤的种类数量，种类少的排前面
      const lengthDiff = a.length - b.length;
      if (lengthDiff !== 0) {
        return lengthDiff; 
      }

      // 优先级 2: 种类数相同比较总物品数，总数少的排前面
      const totalCountA = a.reduce((sum, step) => sum + step.count, 0);
      const totalCountB = b.reduce((sum, step) => sum + step.count, 0);
      const countDiff = totalCountA - totalCountB;
      if (countDiff !== 0) {
        return countDiff; 
      }

      // 优先级 3: 都相同，按 ID 排序 
      return a.length > 0 && b.length > 0 ? a[0].id - b[0].id : 0;
    })
    .slice(0, maxPaths);

  console.log("最终返回结果:", finalResult);
  console.log("耗时:", Date.now() - startTime);
  return finalResult;
}


//主函数：寻找满足目标值的路径 
export const findPaths = (target, items = classifyData, userLimits = {}, epsilon = 1e-6) => {
  console.log("计算目标差值:", target);
  console.log("AAAAA 输入参数:", target, items, userLimits, epsilon);
  // 输入验证 
  if (typeof target !== "number" || !Array.isArray(items)) {
    return [];
  }

  let enoughPaths = false;
  const upgrade0Limit = userLimits.upgrade0Limit ?? 10;
  const upgrade1Limit = userLimits.upgrade1Limit ?? 10;
  const upgrade2Limit = userLimits.upgrade2Limit ?? 10;
  const sanityLimit = userLimits.sanityLimit ?? Infinity;
  const stageItems = items
    .filter((item) => stageIds.includes(item.id) && item.type === "3_star")
    .sort((a, b) => b.item_value - a.item_value);
  const dp = new Map([[0, { paths: [[]], keys: new Set([""]) }]]);
  const validItems = items.filter(
    (item) =>
      typeof item?.item_value === "number" &&
      Math.abs(item.item_value) > epsilon
  );
  console.log(
    "有效物品:",
    validItems.map((i) => `${i.item_name}(${i.item_value})`)
  );
  const sortedItems = [...validItems].sort(
    (a, b) => Math.abs(b.item_value) - Math.abs(a.item_value)
  );

  // 第一阶段：单步路径 
  for (const item of sortedItems) {
    const itemValue = item.item_value;
    const maxCount = getMaxCountForId(item.id, items);
    let count = 0;
    while (
      count < maxCount &&
      //Math.abs(itemValue * (count + 1) - target) <= Math.abs(target)
      Math.abs(itemValue * (count + 1) - target) <= Math.abs(target) + Math.abs(itemValue) ) {
      count++;
      const newSum = itemValue * count;
      let newPath = [{ id: item.id, count }];
      if (tradeGoldIds.includes(item.id)) {
        const { combo } = getOptimalTradeGoldCombo(newSum);
        if (combo.length > 0) newPath = combo;
        else continue;
      } else if (materialIds.includes(item.id)) {
        const { combo } = getOptimalMaterialCombo(newSum);
        if (combo.length > 0) newPath = combo;
        else continue;
      } else if (stageIds.includes(item.id)) {
        const { combo } = getOptimalStageCombo(newSum, stageItems, items, epsilon);
        if (combo.length > 0) newPath = combo;
        else continue;
      }
      if (savePath(dp, newSum, newPath, MAX_PATHS_PER_SUM, target, epsilon, items,
          upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit, TARGET_PATH_COUNT)){
        enoughPaths = true;
      }
      if (enoughPaths) break;
    }
    if (enoughPaths) break;
  }

  // 第二阶段：多步路径
  for (let step = 2; step <= MAX_STEPS && !enoughPaths; step++) {
    const currentStatesEntries = Array.from(dp.entries());
    for (const [currentSum, state] of currentStatesEntries) {
      const paths = state.paths;
      if (Math.abs(currentSum - target) > 3000) continue;
      for (const item of sortedItems) {
        const itemValue = item.item_value;
        const maxCount = getMaxCountForId(item.id, items);
        let count = 0;
        while (
          count < maxCount &&
          Math.abs(currentSum + itemValue * (count + 1) - target) <= Math.abs(target) + Math.abs(itemValue)) {
          count++;
          const newSum = currentSum + itemValue * count;
          for (const oldPath of paths) {
            let newPathFragment;
            let useOptimalCombo = false;
            if (tradeGoldIds.includes(item.id)) {
              const tradeSum = itemValue * count;
              const { combo } = getOptimalTradeGoldCombo(tradeSum);
              if (combo.length === 0) continue;
              newPathFragment = combo;
              useOptimalCombo = true;
            } else if (materialIds.includes(item.id)) {
              const materialSum = itemValue * count;
              const { combo } = getOptimalMaterialCombo(materialSum);
              if (combo.length === 0) continue;
              newPathFragment = combo;
              useOptimalCombo = true;
            } else if (stageIds.includes(item.id)) {
              const stageSum = itemValue * count;
              const { combo } = getOptimalStageCombo(stageSum, stageItems, items, epsilon);
              if (combo.length === 0) continue;
              newPathFragment = combo;
              useOptimalCombo = true;
            } else {
              newPathFragment = [{ id: item.id, count }];
            }
            const potentialNewPath = mergeAndSortPath(oldPath, newPathFragment);
            if (isPathValid(potentialNewPath, items)) {
              if (savePath(dp, newSum, potentialNewPath, MAX_PATHS_PER_SUM, target, epsilon, items,
                  upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit, TARGET_PATH_COUNT)){
                enoughPaths = true;
              }
              if (enoughPaths) break;
            }
          }
          //if (enoughPaths) break;
        }
        //if (enoughPaths) break;
      }
      //if (enoughPaths) break;
    }
  }

  return finalizeResult(dp, target, TARGET_PATH_COUNT, stageIds);
};

