import { classifyData } from "../src/DataService.js";

// 全局函数：获取物品最大使用次数
const getMaxCountForId = (id, items) => {
  const item = items.find((i) => i.id === id);
  if (item?.type === "upgrade") return 1;
  if ([1, 2, 3, 4, 5, 6, 7, 8, 21, 22, 23, 24, 25, 26, 51, 52].includes(id))
    return 1;
  if (id >= 150 && id <= 180) return 5;
  if (id >= 181 && id <= 209) return 3;
  if (id === 106) return 5;
  return 10;
};

// 定义特定物品 ID
const stageIds = [
  87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 107, 108, 109, 110, 111, 112,
  113, 114, 210, 211,
];
const tradeGoldIds = [117, 118, 119];
const materialIds = [100, 101, 102, 103];

// 优化组合函数（放宽限制）
const getOptimalTradeGoldCombo = (subTarget) => {
  if (subTarget < 0) return { steps: Infinity, combo: [] };
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
  return { steps, combo, remaining }; // 返回剩余值
};

const getOptimalMaterialCombo = (subTarget) => {
  if (subTarget > 0) return { steps: Infinity, combo: [] };
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
  return { steps, combo, remaining: -remaining }; // 返回负剩余值
};

const getOptimalStageCombo = (subTarget, availableItems) => {
  if (subTarget < 0) return { steps: Infinity, combo: [] };
  let remaining = subTarget;
  let steps = 0;
  let combo = [];
  const stageValues = availableItems
    .filter((item) => stageIds.includes(item.id))
    .map((item) => ({ id: item.id, value: item.item_value }))
    .sort((a, b) => b.value - a.value);
  for (const { id, value } of stageValues) {
    const count = Math.floor(remaining / value);
    if (count > 0) {
      combo.push({ id, count });
      remaining -= count * value;
      steps += count;
    }
  }
  return { steps, combo, remaining };
};

// 主函数：寻找路径
export const findPaths = (target, items = classifyData, epsilon = 1e-6) => {
  const startTime = performance.now();
  console.log("计算目标差值:", target);
  console.log("接收物品数:", items.length);
  console.log("前5个物品样本:", JSON.stringify(items.slice(0, 5), null, 2));

  if (typeof target !== "number" || !Array.isArray(items)) {
    console.error("输入无效: target =", target, "items =", items);
    return [];
  }

  const MAX_STEPS = 6;
  const MAX_PATHS_PER_SUM = 10;
  const TARGET_PATH_COUNT = 10;
  const MAX_STATES = 1000;

  const dp = new Map([[0, { paths: [[]], keys: new Set() }]]);
  const validItems = items.filter(
    (item) =>
      typeof item?.item_value === "number" &&
      Math.abs(item.item_value) > epsilon
  );
  console.log("有效物品数:", validItems.length);
  const sortedItems = [...validItems].sort((a, b) => {
    const diffA = Math.abs(target - a.item_value);
    const diffB = Math.abs(target - b.item_value);
    return diffA - diffB || Math.abs(b.item_value) - Math.abs(a.item_value);
  });

  let foundEnoughPaths = false;

  // 第一阶段：单步路径
  for (const item of sortedItems) {
    const itemValue = item.item_value;
    const maxCount = getMaxCountForId(item.id, items);
    let count = 0;
    while (
      count < maxCount &&
      Math.abs(itemValue * (count + 1) - target) <= Math.abs(target)
    ) {
      count++;
      const newSum = itemValue * count;
      let newPath;
      if (tradeGoldIds.includes(item.id)) {
        const { combo } = getOptimalTradeGoldCombo(newSum);
        if (combo.length > 0) newPath = combo;
        else continue;
      } else if (materialIds.includes(item.id)) {
        const { combo } = getOptimalMaterialCombo(newSum);
        if (combo.length > 0) newPath = combo;
        else continue;
      } else if (stageIds.includes(item.id)) {
        const { combo } = getOptimalStageCombo(newSum, items);
        if (combo.length > 0) newPath = combo;
        else continue;
      } else {
        newPath = [{ id: item.id, count }];
      }
      savePath(dp, newSum, newPath, MAX_PATHS_PER_SUM, target, epsilon);
      if (dp.get(target)?.paths.length >= TARGET_PATH_COUNT) {
        foundEnoughPaths = true;
        break;
      }
    }
    if (foundEnoughPaths) break;
  }
  console.log("第一阶段完成后 dp 大小:", dp.size);

  // 第二阶段：多步路径
  if (!foundEnoughPaths) {
    for (let step = 2; step <= MAX_STEPS && !foundEnoughPaths; step++) {
      const currentStates = Array.from(dp.entries());
      console.log(`开始第 ${step} 步，状态数: ${currentStates.length}`);
      for (const [currentSum, { paths }] of currentStates) {
        if (
          Math.abs(currentSum - target) > Math.max(50, Math.abs(target) * 2)
        ) {
          continue;
        }
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
                savePath(
                  dp,
                  newSum,
                  newPath,
                  MAX_PATHS_PER_SUM,
                  target,
                  epsilon
                );
                if (dp.get(target)?.paths.length >= TARGET_PATH_COUNT) {
                  foundEnoughPaths = true;
                  break;
                }
              }
            }
            if (foundEnoughPaths) break;
          }
          if (foundEnoughPaths) break;
        }
        if (foundEnoughPaths) break;
      }
      trimDp(dp, target);
    }
  }

  const result = finalizeResult(dp, target, MAX_PATHS_PER_SUM, items);
  console.log("总计算耗时:", performance.now() - startTime, "ms");
  return result;
};

// 辅助函数
function mergeAndSortPath(oldPath, newStep) {
  const pathMap = new Map();
  for (const step of oldPath) {
    pathMap.set(step.id, (pathMap.get(step.id) || 0) + step.count);
  }
  pathMap.set(newStep.id, (pathMap.get(newStep.id) || 0) + newStep.count);
  return Array.from(pathMap.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => a.id - b.id);
}

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

function savePath(dp, sum, path, maxPaths, target, epsilon) {
  const pathKey = path.map((s) => `${s.id}x${s.count}`).join("_");
  if (!dp.has(sum)) dp.set(sum, { paths: [], keys: new Set() });
  const { paths, keys } = dp.get(sum);
  if (paths.length < maxPaths && !keys.has(pathKey)) {
    paths.push(path);
    keys.add(pathKey);
    if (Math.abs(sum - target) <= epsilon) {
      console.log(`发现精确解! sum=${sum}, 路径: ${pathKey}`);
    }
    return true;
  }
  return false;
}

function trimDp(dp, target) {
  const MAX_STATES = 1000;
  if (dp.size <= MAX_STATES) return;
  const sortedStates = Array.from(dp.entries()).sort(
    (a, b) => Math.abs(a[0] - target) - Math.abs(b[0] - target)
  );
  dp.clear();
  for (const [sum, data] of sortedStates.slice(0, MAX_STATES)) {
    dp.set(sum, data);
  }
  console.log(`修剪 dp，保留 ${MAX_STATES} 个状态`);
}

function finalizeResult(dp, target, maxPaths, items) {
  let result = dp.get(target)?.paths || [];
  if (result.length === 0) {
    console.log(`未找到精确匹配 ${target} 的路径，尝试返回接近路径`);
    const sums = Array.from(dp.keys()).sort(
      (a, b) => Math.abs(a - target) - Math.abs(b - target)
    );
    for (const sum of sums) {
      if (sum === target) continue;
      const extraPaths = dp.get(sum)?.paths || [];
      result = [...result, ...extraPaths];
      if (result.length >= maxPaths) break;
    }
  }

  const uniquePaths = new Set();
  const finalResult = result
    .map((path) => {
      const key = path.map((s) => `${s.id}x${s.count}`).join("_");
      const totalValue = path.reduce((sum, step) => {
        const item = items.find((i) => i.id === step.id);
        return sum + (item?.item_value || 0) * step.count;
      }, 0);
      console.log(`路径: ${key}, 总值: ${totalValue}`);
      if (totalValue !== target)
        console.warn(`路径总值 ${totalValue} 不等于目标 ${target}`);
      if (uniquePaths.has(key)) return null;
      uniquePaths.add(key);
      return path;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const totalCountA = a.reduce((sum, step) => sum + step.count, 0);
      const totalCountB = b.reduce((sum, step) => sum + step.count, 0);
      return (
        totalCountA - totalCountB || a.length - b.length || a[0].id - b[0].id
      );
    })
    .slice(0, maxPaths);

  console.log("最终返回结果:", JSON.stringify(finalResult, null, 2));
  return finalResult;
}
