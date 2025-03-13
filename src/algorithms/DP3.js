//版本2，计算速度更快，但是有重复路径

import { classifyData, getItemById } from "../DataService";

export const findPaths = (target, items = classifyData, epsilon = 1e-6) => {
  console.log("计算目标差值:", target);

  // 输入验证
  if (typeof target !== "number" || !Array.isArray(items)) {
    return [];
  }

  // 常量定义
  const MAX_STEPS = 6;
  const MAX_PATHS_PER_SUM = 10; // 每个和的最大路径数
  const MAX_ITEM_USE_COUNT = 3; // 单项最大使用次数
  const TARGET_PATH_COUNT = 10; // 新增：目标返回的路径数量上限

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

  // 优化点：按绝对值从大到小排序物品，优先尝试大值物品
  const sortedItems = [...validItems].sort(
    (a, b) => Math.abs(b.item_value) - Math.abs(a.item_value)
  );

  // 第一阶段：单步路径
  for (const item of sortedItems) {
    const itemValue = item.item_value;
    let count = 0;

    while (
      count < MAX_ITEM_USE_COUNT &&
      Math.abs(itemValue * (count + 1) - target) <=
        Math.max(Math.abs(target), Math.abs(itemValue) * MAX_STEPS)
    ) {
      count++;
      const newSum = itemValue * count;
      const newPath = [{ id: item.id, count }];
      savePath(dp, newSum, newPath, MAX_PATHS_PER_SUM, target, epsilon);
    }
  }

  // 第二阶段：多步路径
  for (let step = 2; step <= MAX_STEPS; step++) {
    const currentStates = Array.from(dp.entries());

    for (const [currentSum, paths] of currentStates) {
      for (const item of sortedItems) {
        const itemValue = item.item_value;
        let count = 0;

        while (
          count < MAX_ITEM_USE_COUNT &&
          Math.abs(currentSum + itemValue * (count + 1) - target) <=
            Math.abs(target) + Math.abs(itemValue)
        ) {
          count++;
          const newSum = currentSum + itemValue * count;

          for (const oldPath of paths) {
            const newPath = [...oldPath, { id: item.id, count }];
            savePath(dp, newSum, newPath, MAX_PATHS_PER_SUM, target, epsilon);
          }
        }
      }
    }

    // 检查是否已找到足够的目标路径
    const targetPaths = dp.get(target) || [];
    if (targetPaths.length >= TARGET_PATH_COUNT) {
      break; // 找到足够路径后跳出循环，避免过度计算
    }
  }

  return finalizeResult(dp, target, TARGET_PATH_COUNT);
};

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
    .slice(0, maxPaths); // 限制返回路径数量

  console.log("最终返回结果:", finalResult);
  return finalResult;
}
