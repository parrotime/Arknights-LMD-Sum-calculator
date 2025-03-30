import { classifyData } from "../DataService";
import {
  getMaxCountForId,
  getOptimalStageCombo,
} from "./utils.js";
// 全局函数：获取物品最大使用次�?

const stageIds = [
  87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 107, 108, 109, 110, 111, 112,
  113, 114, 210, 211,
]; // 理智消耗关�?

// eslint-disable-next-line no-unused-vars
export const findPaths = async (target, items = classifyData) => {
  console.log("计算目标差值:", target);
  console.log("原始 items 数据:", items);
  try {
    const response = await fetch("http://localhost:3001/find-paths", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, items }),
    });
    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);
    const data = await response.json();
    if (!data.success) {
      console.error("后端计算失败:", data.error);
      return [];
    }
    console.log("后端计算耗时:", data.duration, "ms");
    console.log("最终返回结果:", JSON.stringify(data.paths, null, 2));
    return data.paths;
  } catch (error) {
    console.error("调用后端接口失败:", error);
    return [];
  }
};

/*
  // 直接用 DP0324Correct.js 的逻辑
  const MAX_STEPS = 6;
  const MAX_PATHS_PER_SUM = 10;
  const TARGET_PATH_COUNT = 10;
  const dp = new Map([[0, [[]]]]);
  const validItems = items.filter(
    (item) => typeof item?.item_value === "number" && item.item_value !== 0
  );
  const sortedItems = [...validItems].sort(
    (a, b) => Math.abs(b.item_value) - Math.abs(a.item_value)
  );

  // 第一阶段（单步路径）
  for (const item of sortedItems) {
    const itemValue = item.item_value;
    const maxCount = getMaxCountForId(item.id, items);
    let count = 0;
    while (count < maxCount) {
      count++;
      const newSum = itemValue * count;
      const newPath = [{ id: item.id, count }];
      savePath(dp, newSum, newPath, MAX_PATHS_PER_SUM, target, 1e-6);
    }
  }

  // 第二阶段（多步路径）
  for (let step = 2; step <= MAX_STEPS; step++) {
    const currentStates = Array.from(dp.entries());
    for (const [currentSum, paths] of currentStates) {
      if (Math.abs(currentSum - target) > 3000) continue; // 剪枝
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
            const newPath = mergeAndSortPath(oldPath, { id: item.id, count });
            if (isPathValid(newPath, items)) {
              savePath(dp, newSum, newPath, MAX_PATHS_PER_SUM, target, 1e-6);
            }
          }
        }
      }
    }
    const targetPaths = dp.get(target) || [];
    if (targetPaths.length >= TARGET_PATH_COUNT) break;
  }

  return finalizeResult(dp, target, MAX_PATHS_PER_SUM, items);
};

*/


// 辅助函数：保存路径并检查精确解
// eslint-disable-next-line no-unused-vars
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
    //console.log(`保存路径: ${sum} -> ${pathKey}`);

    if (Math.abs(sum - target) <= epsilon) {
      console.log(`发现精确�?! sum=${sum}, 路径: ${pathKey}`);
    }
    return true;
  }else {
    if (existingPaths.length >= maxPaths) {
      console.log(
        `保存路径失败: sum=${sum}, path=${JSON.stringify(
          path
        )}, 原因: 已达到最大路径数�? (${maxPaths})`
      );
    } else {
      console.log(
        `保存路径失败: sum=${sum}, path=${JSON.stringify(
          path
        )}, 原因: 路径重复, pathKey=${pathKey}`
      );
    }
    return false;
  }
}

// 辅助函数：整理并返回最终结�?
// eslint-disable-next-line no-unused-vars
function finalizeResult(dp, target, maxPaths, items) {
  let result = dp.get(target) || [];

  //const result = dp.get(target) || [];
  const uniquePaths = new Set();

  // 定义理智关卡的价值映�?
  const stageValueMap = new Map([
    [110, 432],
    [114, 360],
    [109, 360],
    [113, 300],
    [108, 300],
    [112, 250],
    [92, 252],
    [98, 210],
    [107, 240],
    [111, 200],
    [91, 216],
    [97, 180],
    [90, 180],
    [96, 150],
    [210, 144],
    [211, 120],
    [89, 120],
    [95, 100],
    [88, 108],
    [94, 90],
    [87, 72],
    [93, 60],
  ]);

  const optimizedPaths = result.map((path) => {
    const stageSteps = path.filter((step) => stageValueMap.has(step.id));
    const nonStageSteps = path.filter((step) => !stageValueMap.has(step.id));

    if (stageSteps.length === 0) return path;

    // 计算理智关卡的总价�?
    let totalStageValue = 0;
    for (const step of stageSteps) {
      totalStageValue += (stageValueMap.get(step.id) || 0) * step.count;
    }

    // 使用 getOptimalStageCombo 重新计算最优理智路�?
    const { combo } = getOptimalStageCombo(totalStageValue, items, stageIds);
    if (combo.length === 0) return path; // 如果无法优化，返回原路径

    // 检查使用次数限�?
    const idCountMap = new Map();
    for (const step of [...nonStageSteps, ...combo]) {
      idCountMap.set(step.id, (idCountMap.get(step.id) || 0) + step.count);
      const maxCount = getMaxCountForId(step.id, items);
      if (idCountMap.get(step.id) > maxCount) return path; // 如果超限，返回原路径
    }

    // 合并优化后的理智路径和非理智路径
    return [...nonStageSteps, ...combo];
  });

  const finalResult = optimizedPaths
    .map((path) => {
      const key = path.map((s) => `${s.id}x${s.count}`).join("_");
      if (uniquePaths.has(key)) return null;
      uniquePaths.add(key);
      return path;
    })
    .filter(Boolean)
    .sort((a, b) => {
      // 优先按路径长度排序（步骤数最少）
      const lengthDiff = a.length - b.length;
      if (lengthDiff !== 0) return lengthDiff;
      // 如果长度相同，按总使用次数排�?

      const totalCountA = a.reduce((sum, step) => sum + step.count, 0);
      const totalCountB = b.reduce((sum, step) => sum + step.count, 0);
      return (
        totalCountA - totalCountB || a.length - b.length || a[0].id - b[0].id
      );
    })
    .slice(0, maxPaths);

  console.log("最终返回结�?:", finalResult);
  return finalResult;
}


// eslint-disable-next-line no-unused-vars
function mergeAndSortPath(oldPath, newStep) {
  const path = [...oldPath, newStep];
  // �? id 排序
  path.sort((a, b) => a.id - b.id);
  // 合并相同 id 的步�?
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

