import { classifyData, getItemById } from "../DataService";

export const findPaths = (target, items = classifyData, epsilon = 1e-6) => {
  console.log("计算目标差值:", target);

  // 输入验证
  if (typeof target !== "number" || !Array.isArray(items)) {
    return [];
  }

  // 常量定义
  const MAX_STEPS = 15; //限制最大步数
  const MAX_PATHS_PER_SUM = 10; //单个步骤最大使用次数
  const MAX_ITEM_USE_COUNT = 10; //单个物品最大使用次数
  const TARGET_PATH_COUNT = 10;

  // 定义限制单次使用次数为1的物品 ID
  const restrictedIds = [
    1, 2, 3, 4, 5, 6, 7, 8, 21, 22, 23, 24, 25, 26, 51, 52,
  ];

  // 定义特定 ID 范围的次数限制
  const getMaxCountForId = (id) => {
    const item = items.find((i) => i.id === id);
    if (item?.type === "upgrade") return 1; // 作战记录类物品限制为 1
    if (restrictedIds.includes(id)) return 1; // 原有限制为 1 次的 ID
    if (id >= 150 && id <= 180) return 5; // ID 150-180 限制为 5 次
    if (id >= 181 && id <= 209) return 3; // ID 181-209 限制为 3 次
    return MAX_ITEM_USE_COUNT; // 默认最大次数
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
    const maxCount = getMaxCountForId(item.id); // 使用新函数动态获取最大次数
    let count = 0;

    while (
      count < maxCount &&
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
        const maxCount = getMaxCountForId(item.id);
        let count = 0;

        while (
          count < maxCount &&
          Math.abs(currentSum + itemValue * (count + 1) - target) <=
            Math.abs(target) + Math.abs(itemValue)
        ) {
          count++;
          const newSum = currentSum + itemValue * count;

          for (const oldPath of paths) {
            const newPath = mergeAndSortPath(oldPath, { id: item.id, count });
            if (isPathValid(newPath)) {
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
function isPathValid(path) {
  const idCountMap = new Map();

  // 统计路径中每个 ID 的总使用次数
  for (const step of path) {
    const currentCount = idCountMap.get(step.id) || 0;
    idCountMap.set(step.id, currentCount + step.count);
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
  const mergedPath = Array.from(pathMap.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => a.id - b.id);

  return mergedPath;
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
