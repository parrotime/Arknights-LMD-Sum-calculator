import { classifyData } from "../DataService";

// 全局函数：获取物品最大使用次数（添加缓存）
const maxCountCache = new Map();
const getMaxCountForId = (id, items) => {
  if (maxCountCache.has(id)) return maxCountCache.get(id);
  const item = items.find((i) => i.id === id);
  let maxCount;
  if (item?.type === "upgrade") maxCount = 1;
  else if (
    [1, 2, 3, 4, 5, 6, 7, 8, 21, 22, 23, 24, 25, 26, 51, 52].includes(id)
  )
    maxCount = 1;
  else if (id >= 150 && id <= 180) maxCount = 5;
  else if (id >= 181 && id <= 209) maxCount = 3;
  else maxCount = 10;
  maxCountCache.set(id, maxCount);
  return maxCount;
};

// 全局缓存
const tradeGoldCache = new Map();
const materialCache = new Map();
const stageCache = new Map();

// 预计算有效物品和排序（全局化）
const validItems = classifyData.filter(
  (item) =>
    typeof item?.item_value === "number" && Math.abs(item.item_value) > 1e-6
);
const sortedItems = [...validItems].sort(
  (a, b) => Math.abs(b.item_value) - Math.abs(a.item_value)
);

export const findPaths = async (
  target,
  items = classifyData,
  epsilon = 1e-6
) => {
  console.log("计算目标差值:", target);

  if (typeof target !== "number" || !Array.isArray(items)) {
    return [];
  }

  const MAX_STEPS = 6;
  const MAX_PATHS_PER_SUM = 10;
  const TARGET_PATH_COUNT = 10;
  const NUM_WORKERS = 4; // 并行 Worker 数量

  const tradeGoldIds = [117, 118, 119];
  const materialIds = [100, 101, 102, 103];
  const stageIds = [
    87, 88, 89, 90, 91, 92, 107, 108, 109, 110, 210, 93, 94, 95, 96, 97, 98,
    111, 112, 113, 114, 211,
  ];

  const pruneThreshold = Math.max(3000, Math.abs(target) * 2);

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

  const getOptimalStageCombo = (subTarget) => {
    if (subTarget < 0) return { steps: Infinity, combo: [] };
    if (stageCache.has(subTarget)) return stageCache.get(subTarget);
    let remaining = subTarget;
    let steps = 0;
    let combo = [];
    const stageValues = [
      { id: 110, value: 432 },
      { id: 114, value: 360 },
      { id: 109, value: 360 },
      { id: 113, value: 300 },
      { id: 108, value: 300 },
      { id: 112, value: 250 },
      { id: 92, value: 252 },
      { id: 98, value: 210 },
      { id: 107, value: 240 },
      { id: 111, value: 200 },
      { id: 91, value: 216 },
      { id: 97, value: 180 },
      { id: 90, value: 180 },
      { id: 96, value: 150 },
      { id: 210, value: 144 },
      { id: 211, value: 120 },
      { id: 89, value: 120 },
      { id: 95, value: 100 },
      { id: 88, value: 108 },
      { id: 94, value: 90 },
      { id: 87, value: 72 },
      { id: 93, value: 60 },
    ];
    for (const { id, value } of stageValues) {
      const count = Math.floor(remaining / value);
      if (count > 0) {
        combo.push({ id, count });
        remaining -= count * value;
        steps += count;
      }
    }
    const result =
      remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
    stageCache.set(subTarget, result);
    return result;
  };

  const dp = new Map([[0, [[]]]]);

  // 第一阶段：单步路径（保持单线程）
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
      let newPath = [{ id: item.id, count }];

      if (tradeGoldIds.includes(item.id)) {
        const { combo } = getOptimalTradeGoldCombo(newSum);
        if (combo.length > 0) newPath = combo;
      } else if (materialIds.includes(item.id)) {
        const { combo } = getOptimalMaterialCombo(newSum);
        if (combo.length > 0) newPath = combo;
      } else if (stageIds.includes(item.id)) {
        const { combo } = getOptimalStageCombo(newSum);
        if (combo.length > 0) newPath = combo;
      }

      savePath(dp, newSum, newPath, MAX_PATHS_PER_SUM, target, epsilon);
    }
  }

  // 第二阶段：多步路径（并行计算）
  for (let step = 2; step <= MAX_STEPS; step++) {
    const currentStates = Array.from(dp.entries());
    const targetPaths = dp.get(target) || [];
    if (targetPaths.length >= TARGET_PATH_COUNT) break;

    // 分割任务给 Workers
    const chunkSize = Math.ceil(currentStates.length / NUM_WORKERS);
    const tasks = [];
    for (let i = 0; i < NUM_WORKERS; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, currentStates.length);
      tasks.push(currentStates.slice(start, end));
    }

    // 创建并运行 Workers
    const workers = tasks.map((task) => {
      return new Promise((resolve) => {
        const worker = new Worker(new URL("./worker.js", import.meta.url));
        worker.postMessage({
          task,
          sortedItems,
          target,
          pruneThreshold,
          tradeGoldIds,
          materialIds,
          stageIds,
          items,
        });
        worker.onmessage = (e) => {
          resolve(e.data);
          worker.terminate();
        };
      });
    });

    // 等待所有 Worker 完成并合并结果
    const results = await Promise.all(workers);
    for (const { sum, paths } of results.flat()) {
      for (const path of paths) {
        savePath(dp, sum, path, MAX_PATHS_PER_SUM, target, epsilon);
      }
    }
  }

  return finalizeResult(dp, target, TARGET_PATH_COUNT);
};

// 未修改函数（直接沿用）
// eslint-disable-next-line no-unused-vars
function mergeAndSortPath(oldPath, newStep) {
  const pathMap = new Map(oldPath.map((step) => [step.id, step.count]));
  pathMap.set(newStep.id, (pathMap.get(newStep.id) || 0) + newStep.count);
  return Array.from(pathMap.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => a.id - b.id);
}

function savePath(dp, sum, path, maxPaths, target, epsilon) {
  const pathHash = path.reduce((acc, s) => acc + s.id * 31 + s.count, 0);
  if (!dp.has(sum)) dp.set(sum, new Map());
  const existingPaths = dp.get(sum);

  if (existingPaths.size < maxPaths && !existingPaths.has(pathHash)) {
    existingPaths.set(pathHash, path);
    if (Math.abs(sum - target) <= epsilon) {
      console.log(`发现精确解! sum=${sum}, 路径:`, path);
    }
    return true;
  }
  return false;
}

// eslint-disable-next-line no-unused-vars
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

function finalizeResult(dp, target, maxPaths) {
  const result = dp.get(target) ? Array.from(dp.get(target).values()) : [];
  const uniquePaths = new Set();

  const finalResult = result
    .map((path) => {
      const key = path.reduce((acc, s) => acc + s.id * 31 + s.count, 0);
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

  console.log("最终返回结果:", finalResult);
  return finalResult;
}
