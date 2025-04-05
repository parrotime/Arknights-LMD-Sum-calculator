import { classifyData } from "../src/DataService.js";

const stageIds = [87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 107, 108, 109, 110, 111, 112, 113, 114, 210, 211];
const tradeGoldIds = [117, 118, 119];
const materialIds = [100, 101, 102, 103];

const getMaxCountForId = (id, items) => {
  const item = items.find((i) => i.id === id);
  if (item?.type === "upgrade") return 1;
  if ([1, 2, 3, 4, 5, 6, 7, 8, 21, 22, 23, 24, 25, 26, 51, 52].includes(id)) return 1;
  if (id >= 150 && id <= 180) return 5;
  if (id >= 181 && id <= 209) return 3;
  if (id === 106) return 5;
  return 10;
};

const getOptimalTradeGoldCombo = (subTarget) => {
  if (subTarget < 0) return { steps: Infinity, combo: [] };
  let remaining = subTarget;
  let steps = 0;
  let combo = [];
  const count2000 = Math.floor(remaining / 2000);
  if (count2000 > 0) { combo.push({ id: 119, count: count2000 }); remaining -= count2000 * 2000; steps += count2000; }
  const count1500 = Math.floor(remaining / 1500);
  if (count1500 > 0) { combo.push({ id: 118, count: count1500 }); remaining -= count1500 * 1500; steps += count1500; }
  const count1000 = Math.floor(remaining / 1000);
  if (count1000 > 0) { combo.push({ id: 117, count: count1000 }); remaining -= count1000 * 1000; steps += count1000; }
  return remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
};

const getOptimalMaterialCombo = (subTarget) => {
  if (subTarget > 0) return { steps: Infinity, combo: [] };
  let remaining = Math.abs(subTarget);
  let steps = 0;
  let combo = [];
  const count400 = Math.floor(remaining / 400);
  if (count400 > 0) { combo.push({ id: 103, count: count400 }); remaining -= count400 * 400; steps += count400; }
  const count300 = Math.floor(remaining / 300);
  if (count300 > 0) { combo.push({ id: 102, count: count300 }); remaining -= count300 * 300; steps += count300; }
  const count200 = Math.floor(remaining / 200);
  if (count200 > 0) { combo.push({ id: 101, count: count200 }); remaining -= count200 * 200; steps += count200; }
  const count100 = Math.floor(remaining / 100);
  if (count100 > 0) { combo.push({ id: 100, count: count100 }); remaining -= count100 * 100; steps += count100; }
  return remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
};

const getOptimalStageCombo = (subTarget, availableItems) => {
  if (subTarget < 0) return { steps: Infinity, combo: [] };
  let remaining = subTarget;
  let steps = 0;
  let combo = [];
  const stageValues = availableItems
    .filter(item => stageIds.includes(item.id))
    .map(item => ({ id: item.id, value: item.item_value }))
    .sort((a, b) => b.value - a.value);
  for (const { id, value } of stageValues) {
    const count = Math.floor(remaining / value);
    if (count > 0) { combo.push({ id, count }); remaining -= count * value; steps += count; }
  }
  return remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
};

function mergeAndSortPath(oldPath, newStep) {
  const path = [...oldPath, newStep];
  path.sort((a, b) => a.id - b.id);
  const merged = [];
  for (const step of path) {
    if (merged.length > 0 && merged[merged.length - 1].id === step.id) {
      merged[merged.length - 1].count += step.count;
    } else {
      merged.push({ ...step });
    }
  }
  return merged;
}

function isPathValid(path, items) {
  const idCountMap = new Map();
  for (const step of path) {
    idCountMap.set(step.id, (idCountMap.get(step.id) || 0) + step.count);
    const maxCount = getMaxCountForId(step.id, items);
    if (idCountMap.get(step.id) > maxCount) return false;
  }
  return true;
}

function savePath(dp, sum, path, maxPaths, target, epsilon) {
  const pathKey = path.map(s => `${s.id}x${s.count}`).join("_");
  if (!dp.has(sum)) dp.set(sum, []);
  const existingPaths = dp.get(sum);
  if (
    existingPaths.length < maxPaths &&
    !existingPaths.some(p => p.map(s => `${s.id}x${s.count}`).join("_") === pathKey)
  ) {
    existingPaths.push(path);
    //console.log(`保存路径: ${sum} -> ${pathKey}`);
    if (Math.abs(sum - target) <= epsilon) {
      console.log(`发现精确解! sum=${sum}, 路径: ${pathKey}`);
    }
    return true;
  }
  return false;
}

function finalizeResult(dp, target, maxPaths, items) {
  let result = dp.get(target) || [];
  if (result.length < maxPaths) {
    const sums = Array.from(dp.keys()).sort((a, b) => Math.abs(a - target) - Math.abs(b - target));
    for (const sum of sums) {
      if (sum === target) continue;
      const extraPaths = dp.get(sum) || [];
      result = [...result, ...extraPaths];
      if (result.length >= maxPaths) break;
    }
  }
  const uniquePaths = new Set();
  const finalResult = result
    .map(path => {
      const key = path.map(s => `${s.id}x${s.count}`).join("_");
      if (uniquePaths.has(key)) return null;
      uniquePaths.add(key);
      return path;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const totalCountA = a.reduce((sum, step) => sum + step.count, 0);
      const totalCountB = b.reduce((sum, step) => sum + step.count, 0);
      return totalCountA - totalCountB || a.length - b.length || a[0].id - b[0].id;
    })
    .slice(0, maxPaths);
  console.log("最终返回结果:", JSON.stringify(finalResult, null, 2));
  return finalResult;
}

export function findPaths(target, items = classifyData, epsilon = 1e-6) {
  console.log("后端接收目标差值:", target);
  console.log("后端接收物品数:", items.length);
  console.log("前5个物品样本:", JSON.stringify(items.slice(0, 5), null, 2));

  if (typeof target !== "number" || !Array.isArray(items)) {
    console.error("输入无效: target =", target, "items =", items);
    return [];
  }

  const MAX_STEPS = 6;
  const MAX_PATHS_PER_SUM = 10;
  const TARGET_PATH_COUNT = 10;

  const dp = new Map([[0, [[]]]]);
  const validItems = items.filter(item => typeof item?.item_value === "number" && item.item_value !== 0);
  console.log("有效物品数:", validItems.length);
  console.log("有效物品样本:", JSON.stringify(validItems.slice(0, 5), null, 2));

  const sortedItems = [...validItems].sort((a, b) => Math.abs(b.item_value) - Math.abs(a.item_value));

  for (const item of sortedItems) {
    const itemValue = item.item_value;
    const maxCount = getMaxCountForId(item.id, items);
    let count = 0;
    while (count < maxCount) {
      count++;
      const newSum = itemValue * count;
      let newPath;
      if (tradeGoldIds.includes(item.id)) {
        const { combo } = getOptimalTradeGoldCombo(newSum);
        if (combo.length > 0) newPath = combo; else continue;
      } else if (materialIds.includes(item.id)) {
        const { combo } = getOptimalMaterialCombo(newSum);
        if (combo.length > 0) newPath = combo; else continue;
      } else if (stageIds.includes(item.id)) {
        const { combo } = getOptimalStageCombo(newSum, items);
        if (combo.length > 0) newPath = combo; else continue;
      } else {
        newPath = [{ id: item.id, count }];
      }
      savePath(dp, newSum, newPath, MAX_PATHS_PER_SUM, target, epsilon);
    }
  }

  const startTime = performance.now();
  for (let step = 2; step <= MAX_STEPS; step++) {
    const currentStates = Array.from(dp.entries());

    for (const [currentSum, paths] of currentStates) {
      if (Math.abs(currentSum - target) > 3000) continue; // 剪枝：跳过偏离目标过多的状态

      for (const item of sortedItems) {
        const itemValue = item.item_value;
        const maxCount = getMaxCountForId(item.id, items);
        let count = 0;

        while (
          count < maxCount &&
          Math.abs(currentSum + itemValue * (count + 1) - target) <=
            Math.abs(target) + Math.abs(itemValue)
        ) {
          count++;
          const newSum = currentSum + itemValue * count;

          for (const oldPath of paths) {
            let newPath;
            if (tradeGoldIds.includes(item.id)) {
              const tradeSum = itemValue * count;
              const { combo } = getOptimalTradeGoldCombo(tradeSum);
              if (combo.length === 0) continue;
              newPath = [...oldPath, ...combo];
            } else if (materialIds.includes(item.id)) {
              const materialSum = itemValue * count;
              const { combo } = getOptimalMaterialCombo(materialSum);
              if (combo.length === 0) continue;
              newPath = [...oldPath, ...combo];
            } else if (stageIds.includes(item.id)) {
              const stageSum = itemValue * count;
              const { combo } = getOptimalStageCombo(stageSum, items);
              if (combo.length === 0) continue;
              newPath = [...oldPath, ...combo];
            } else {
              newPath = mergeAndSortPath(oldPath, { id: item.id, count });
            }

            if (isPathValid(newPath, items)) {
              savePath(dp, newSum, newPath, MAX_PATHS_PER_SUM, target, epsilon);
            }
          }
        }
      }
    }
    const targetPaths = dp.get(target) || [];
    if (targetPaths.length >= TARGET_PATH_COUNT) break;
  }
  console.log("计算耗时:", performance.now() - startTime, "ms");
  return finalizeResult(dp, target, MAX_PATHS_PER_SUM, items);
}