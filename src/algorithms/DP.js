import { classifyData } from "../DataService";

// 全局函数：获取物品最大使用次数
const getMaxCountForId = (id, items) => {
  const item = items.find((i) => i.id === id);
  if (item?.type === "upgrade") return 1;
  if ([1, 2, 3, 4, 5, 6, 7, 8, 21, 22, 23, 24, 25, 26, 51, 52].includes(id))
    return 1;
  if (id >= 150 && id <= 180) return 5;
  if (id >= 181 && id <= 209) return 3;
  if (id === 106) return 5;
  return 10; // MAX_ITEM_USE_COUNT
};


const stageIds = [
    87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 107, 108, 109, 110, 111,
    112, 113, 114, 210, 211,
  ]; // 理智消耗关卡

export const findPaths = async(target, items = classifyData, epsilon = 1e-6) => {
  console.log("计算目标差值:", target);

  // 输入验证
  if (typeof target !== "number" || !Array.isArray(items)) {
    return [];
  }

  // 常量定义
  const MAX_STEPS = 6; // 限制最大步数
  const MAX_PATHS_PER_SUM = 10; // 单个步骤最大使用次数
  const TARGET_PATH_COUNT = 10;

  const tradeGoldIds = [117, 118, 119]; // 售卖 2、3、4 个赤金 (1000, 1500, 2000)
  const materialIds = [100, 101, 102, 103]; // 基建合成 (-100, -200, -300, -400)
  

  // 优化：计算“售卖赤金”最优组合（使用贪心法）
  const getOptimalTradeGoldCombo = (subTarget) => {
    if (subTarget < 0) return { steps: Infinity, combo: [] };
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

    return remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
  };

  // 计算“基建合成”最优组合（处理负值）
  const getOptimalMaterialCombo = (subTarget) => {
    if (subTarget > 0) return { steps: Infinity, combo: [] }; // 目标为正，无法用负值合成
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

    return remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
  };

  // 新增：计算“理智消耗关卡”最优组合（处理正值）
  const getOptimalStageCombo = (subTarget, availableItems) => {
    if (subTarget < 0) return { steps: Infinity, combo: [] }; // 目标为负，无法用正值组合
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

    return remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
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

  // 按绝对值从大到小排序物品
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
    }
  }

    // 第二阶段：多步路径
  const startTime = performance.now();
  const workerCount = navigator.hardwareConcurrency || 4; // 使用 CPU 核心数
  const workers = [];
  const promises = [];

  for (let step = 2; step <= MAX_STEPS; step++) {
    const currentStates = Array.from(dp.entries());
    const chunkSize = Math.ceil(currentStates.length / workerCount);
    const chunks = [];

    // 将 currentStates 分片
    for (let i = 0; i < currentStates.length; i += chunkSize) {
      chunks.push(currentStates.slice(i, i + chunkSize));
    }

    console.log("当前状态数量:", currentStates.length, "分片数量:", chunks.length);

    // 创建 Worker 并分配任务
    chunks.forEach((chunk) => {
      const worker = new Worker(new URL('./worker.js', import.meta.url));
      workers.push(worker);

      const promise = new Promise((resolve) => {
        worker.onmessage = (e) => {
          resolve(e.data); // 接收 worker 返回的结果
          worker.terminate(); // 任务完成后销毁 worker
        };
      });
      promises.push(promise);

      worker.postMessage({
        task: chunk,
        sortedItems,
        target,
        pruneThreshold: 3000,
        tradeGoldIds,
        materialIds,
        stageIds,
        items,
      });
    });

    // 等待所有 worker 完成
    const workerResults = await Promise.all(promises);

    // 合并结果到 dp
    workerResults.forEach((result) => {
      result.forEach(({ sum, paths }) => {
        if (!dp.has(sum)) dp.set(sum, []);
        const existingPaths = dp.get(sum);
        paths.forEach((path) => {
          if(isPathValid(path, items)){
            //const normalizedPath = mergeAndSortPath([], path[0]); // 假设 path 是单步数组
            const pathKey = path.map((s) => `${s.id}x${s.count}`).join("_");
            if (
              existingPaths.length < MAX_PATHS_PER_SUM &&
              !existingPaths.some(
                (p) => p.map((s) => `${s.id}x${s.count}`).join("_") === pathKey
              )
            ) {
              existingPaths.push(path);
            }
          }
        });
      });
    });

    const targetPaths = dp.get(target) || [];
    if (targetPaths.length >= TARGET_PATH_COUNT) {
      break;
    }
  }

  //const workerResults = await Promise.all(promises);
  console.log("并行计算耗时:", performance.now() - startTime, "ms");
  // 清理 workers
  workers.forEach((worker) => worker.terminate());

  return finalizeResult(dp, target, MAX_PATHS_PER_SUM, items);
};

// 辅助函数：检查路径是否满足所有次数限制
function isPathValid(path, items) {
  const idCountMap = new Map();

  // 统计路径中每个 ID 的总使用次数
  for (const step of path) {
    const currentCount = idCountMap.get(step.id) || 0;
    idCountMap.set(step.id, currentCount + step.count);
    const maxCount = getMaxCountForId(step.id, items);
    if (idCountMap.get(step.id) > maxCount) return false;
  }
  return true;
}

// 辅助函数：合并并排序路径，确保相同组合唯一
// eslint-disable-next-line no-unused-vars
function mergeAndSortPath(oldPath, newStep) {
  const pathMap = new Map();

  // 将旧路径中的步骤按 id 合并计数
  for (const step of oldPath) {
    pathMap.set(step.id, (pathMap.get(step.id) || 0) + step.count);
  }

  // 添加新步骤
  pathMap.set(newStep.id, (pathMap.get(newStep.id) || 0) + newStep.count);

  // 转换为标准路径格式并按 id 排序
  return Array.from(pathMap.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => a.id - b.id);
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
function finalizeResult(dp, target, maxPaths, items) {
  const result = dp.get(target) || [];
  const uniquePaths = new Set();

// 定义理智关卡的价值映射
  const stageValueMap = new Map([
    [110, 432], [114, 360], [109, 360], [113, 300], [108, 300], [112, 250],
    [92, 252], [98, 210], [107, 240], [111, 200], [91, 216], [97, 180],
    [90, 180], [96, 150], [210, 144], [211, 120], [89, 120], [95, 100],
    [88, 108], [94, 90], [87, 72], [93, 60]
  ]);

  const optimizedPaths = result.map((path) => {
    const stageSteps = path.filter((step) => stageValueMap.has(step.id));
    const nonStageSteps = path.filter((step) => !stageValueMap.has(step.id));

    if (stageSteps.length === 0) return path;

    // 计算理智关卡的总价值
    let totalStageValue = 0;
    for (const step of stageSteps) {
      totalStageValue += (stageValueMap.get(step.id) || 0) * step.count;
    }

    // 使用 getOptimalStageCombo 重新计算最优理智路径
    const { combo } = getOptimalStageCombo(totalStageValue, items);
    if (combo.length === 0) return path; // 如果无法优化，返回原路径

    // 检查使用次数限制
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

// 将 getOptimalStageCombo 移到外部，以便在 finalizeResult 中复用
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

  return remaining === 0 ? { steps, combo } : { steps: Infinity, combo: [] };
};