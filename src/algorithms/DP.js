import { classifyData, getItemById } from "../DataService";

// 全局函数：获取物品最大使用次数
const getMaxCountForId = (id, items) => {
  const item = items.find((i) => i.id === id);
  if (item?.type === "upgrade") return 1;
  if ([1, 2, 3, 4, 5, 6, 7, 8, 21, 22, 23, 24, 25, 26, 51, 52].includes(id)) return 1;
  if (id >= 150 && id <= 180) return 5;
  if (id >= 181 && id <= 209) return 3;
  return 10; // MAX_ITEM_USE_COUNT
};

// 全局缓存：优化 getOptimalTradeGoldCombo
const tradeGoldCache = new Map();
const materialCache = new Map();

export const findPaths = (target, items = classifyData, epsilon = 1e-6) => {
  console.log("计算目标差值:", target);

  // 输入验证
  if (typeof target !== "number" || !Array.isArray(items)) {
    return [];
  }

  // 常量定义
  const MAX_STEPS = 6; //限制最大步数
  const MAX_PATHS_PER_SUM = 10; //单个步骤最大使用次数
  //const MAX_ITEM_USE_COUNT = 10; //单个物品最大使用次数
  const TARGET_PATH_COUNT = 10;

  const tradeGoldIds = [117, 118, 119]; // 售卖 2、3、4 个赤金 (1000, 1500, 2000)
  const materialIds = [100, 101, 102, 103]; // 基建合成 (-100, -200, -300, -400)

  // 优化：计算“售卖赤金”最优组合（使用贪心法代替暴力枚举）
  const getOptimalTradeGoldCombo = (subTarget) => {
    if (subTarget < 0) return { steps: Infinity, combo: [] };
    if (tradeGoldCache.has(subTarget)) return tradeGoldCache.get(subTarget);
    let remaining = subTarget;
    let steps = 0;
    let combo = [];

    // 贪心
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

  // 新增：计算“基建合成”最优组合（处理负值）
  const getOptimalMaterialCombo = (subTarget) => {
    if (subTarget > 0) return { steps: Infinity, combo: [] }; // 目标为正，无法用负值合成
    if (materialCache.has(subTarget)) return materialCache.get(subTarget);
    let remaining = Math.abs(subTarget); // 转换为正数处理
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

  // 初始化 DP Map 和有效物品
  const dp = new Map([[0, [[]]]]);
  const validItems = items.filter(
    (item) =>
      typeof item?.item_value === "number" &&
      Math.abs(item.item_value) > epsilon
  );

  console.log(
    "有效物品:",
    validItems.map((i) => `${i.item_name}(${i.item_value})`)
  );

  // 优化点：按绝对值从大到小排序物品
  const sortedItems = [...validItems].sort(
    (a, b) => Math.abs(b.item_value) - Math.abs(a.item_value)
  );

  // 第一阶段：单步路径
  for (const item of sortedItems) {
    const itemValue = item.item_value;
    const maxCount = getMaxCountForId(item.id, items); // 使用新函数动态获取最大次数
    let count = 0;

    while (
      count < maxCount &&
      Math.abs(itemValue * (count + 1) - target) <= Math.abs(target) // 收紧条件
    ) {
      count++;
      const newSum = itemValue * count;
      let newPath = [{ id: item.id, count }];

      //赤金和基建
      if (tradeGoldIds.includes(item.id)) {
        const { combo } = getOptimalTradeGoldCombo(newSum);
        if (combo.length > 0) newPath = combo;
      } else if (materialIds.includes(item.id)) {
        const { combo } = getOptimalMaterialCombo(newSum);
        if (combo.length > 0) newPath = combo;
      }

      savePath(dp, newSum, newPath, MAX_PATHS_PER_SUM, target, epsilon);
    }
  }

  // 第二阶段：多步路径
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
            //const newPath = mergeAndSortPath(oldPath, { id: item.id, count });
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
    if (targetPaths.length >= TARGET_PATH_COUNT) {
      break;
    }
  }

  return finalizeResult(dp, target, TARGET_PATH_COUNT);
};

// 新增辅助函数：检查路径是否满足所有次数限制
function isPathValid(path, items) {
  const idCountMap = new Map();

  // 统计路径中每个 ID 的总使用次数
  for (const step of path) {
    const currentCount = idCountMap.get(step.id) || 0;
    idCountMap.set(step.id, currentCount + step.count);
    const maxCount = getMaxCountForId(step.id, items); // 使用全局函数检查限制
    if (idCountMap.get(step.id) > maxCount) return false;
  }
  return true;
}

// 新增辅助函数：合并并排序路径，确保相同组合唯一
function mergeAndSortPath(oldPath, newStep) {
  const pathMap = new Map();

  // 将旧路径中的步骤按 id 合并计数
  for (const step of oldPath) {
    pathMap.set(step.id, (pathMap.get(step.id) || 0) + step.count);
  }

  // 添加新步骤
  pathMap.set(newStep.id, (pathMap.get(newStep.id) || 0) + newStep.count);

  // 转换为标准路径格式并按 id 排序
  //const mergedPath = Array.from(pathMap.entries())
  return Array.from(pathMap.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => a.id - b.id);

  //return mergedPath;
}

// 辅助函数：保存路径并检查精确解
function savePath(dp, sum, path, maxPaths, target, epsilon) {
  const pathKey = path.map((s) => `${s.id}x${s.count}`).join("_");

  if (!dp.has(sum)) dp.set(sum, []);
  const existingPaths = dp.get(sum);

  if (
    existingPaths.length < maxPaths &&
    !existingPaths.some(
      (p) => p.map((s) => `${s.id}x${s.count}`).join("_") === pathKey
    )
  ) {
    existingPaths.push(path);
    console.log(`保存路径: ${sum} -> ${pathKey}`);

    if (Math.abs(sum - target) <= epsilon) {
      console.log(`发现精确解! sum=${sum}, 路径: ${pathKey}`);
    }
    return true;
  }
  return false;
}

// 辅助函数：整理并返回最终结果
function finalizeResult(dp, target, maxPaths) {
  const result = dp.get(target) || [];
  const uniquePaths = new Set();

  const finalResult = result
    .map((path) => {
      const key = path.map((s) => `${s.id}x${s.count}`).join("_");
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
