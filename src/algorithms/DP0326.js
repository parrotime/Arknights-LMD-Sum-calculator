import { classifyData } from "../DataService";
//import Worker from "./worker.js"; // 使用 worker-loader
import {
  getMaxCountForId,
  getOptimalTradeGoldCombo,
  getOptimalMaterialCombo,
  getOptimalStageCombo,
  //mergeAndSortPath,
  isPathValid,
} from "./utils.js";
// 全局函数：获取物品最大使用次数

const stageIds = [
  87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 107, 108, 109, 110, 111, 112,
  113, 114, 210, 211,
]; // 理智消耗关卡

export const findPaths = async (
  target,
  items = classifyData,
  epsilon = 1e-6
) => {
  console.log("计算目标差值:", target);
  console.log("原始 items 数据:", items);
  // 输入验证
  if (typeof target !== "number" || !Array.isArray(items)) {
    console.log("输入验证失败: target =", target, "items =", items);
    return [];
  }

  // 常量定义
  const MAX_STEPS = 6; // 限制最大步数
  const MAX_PATHS_PER_SUM = 10; // 单个步骤最大使用次数
  const TARGET_PATH_COUNT = 10;

  const tradeGoldIds = [117, 118, 119]; // 售卖 2、3、4 个赤金 (1000, 1500, 2000)
  const materialIds = [100, 101, 102, 103]; // 基建合成 (-100, -200, -300, -400)

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

    console.log(
      `Item: ${item.id}, itemValue: ${itemValue}, maxCount: ${maxCount}`
    );

    let count = 0;

    while (
      count < maxCount &&
      Math.abs(itemValue * (count + 1) - target) <= Math.abs(target)
    ) {
      count++;
      const newSum = itemValue * count;
      //if (Math.abs(newSum) > Math.abs(target) * 2) break; // 避免生成过大的 sum
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
        const { combo } = getOptimalStageCombo(newSum, items, stageIds);
        if (combo.length > 0) newPath = combo;
        else continue;
      } else {
        newPath = [{ id: item.id, count }];
      }

      if (!savePath(dp, newSum, newPath, MAX_PATHS_PER_SUM, target, epsilon)) {
        console.log(
          `保存路径失败: sum=${newSum}, path=${JSON.stringify(newPath)}`
        );
      }
    }
  }

  console.log("第一阶段完成后 dp:", Array.from(dp.entries()));

  // 第二阶段：多步路径

  const startTime = performance.now();

  /*
  const workerCount = 2; // 使用 CPU 核心数

  
  const workers = Array.from(
    { length: workerCount },
    () => new Worker()
  );
  const promises = [];*/

  for (let step = 2; step <= MAX_STEPS; step++) {
    const currentStates = Array.from(dp.entries());

    if (
      dp.size === 1 &&
      dp.has(0) &&
      dp.get(0).length === 1 &&
      dp.get(0)[0].length === 0
    ) {
      console.log("第一阶段未生成任何路径，直接返回");
      return finalizeResult(dp, target, MAX_PATHS_PER_SUM, items);
    }

    if (!Array.isArray(currentStates)) {
      console.error("currentStates 不是数组:", currentStates);
      continue;
    }

    if (currentStates.length === 0) {
      console.log("Step:", step, "currentStates 为空，跳过此步");
      continue;
    }

    const results = [];
    for (const [currentSum, paths] of currentStates) {
      if (Math.abs(currentSum - target) > 3000) continue;

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

          // 剪枝：如果 newSum 偏离 target 过多，跳过
          //if (Math.abs(newSum - target) > Math.abs(target) * 2) continue;
          if (
            Math.abs(newSum - target) >
            Math.abs(target) + Math.abs(itemValue)
          )
            continue;

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
              const { combo } = getOptimalStageCombo(stageSum, items, stageIds);
              if (combo.length === 0) continue;
              newPath = [...oldPath, ...combo];
            } else {
              newPath = mergeAndSortPath(oldPath, { id: item.id, count });
            }

            if (isPathValid(newPath, items)) {
              //console.log("生成路径:", newSum, newPath);
              results.push({ sum: newSum, paths: [newPath] });
            }
          }
        }
      }
    }

    // 合并结果到 dp
    results.forEach(({ sum, paths }) => {
      if (!dp.has(sum)) dp.set(sum, []);
      const existingPaths = dp.get(sum);
      paths.forEach((path) => {
        if (isPathValid(path, items)) {
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

    const targetPaths = dp.get(target) || [];
    if (targetPaths.length >= TARGET_PATH_COUNT) {
      break;
    }
  }

  console.log("并行计算耗时:", performance.now() - startTime, "ms");

  /*

    const chunkSize = Math.ceil(currentStates.length / workerCount);
    const chunks = [];

    // 添加调试日志
    //console.log("Step:", step, "currentStates:", JSON.stringify(currentStates));

    // 将 currentStates 分片
    for (let i = 0; i < currentStates.length; i += chunkSize) {
      const chunk = currentStates.slice(i, i + chunkSize);
      if (!Array.isArray(chunk)) {
        console.error("生成 chunk 失败:", chunk);
        continue;
      }
      chunks.push(chunk);
    }

    console.log("Step:", step, "状态数量:", currentStates.length, "分片数量:", chunks.length);
    console.log("chunks:", JSON.stringify(chunks));



  // 检查 chunks 中的 undefined
    const invalidChunks = chunks.filter(chunk => !Array.isArray(chunk));
    if (invalidChunks.length > 0) {
      console.error("发现无效 chunk:", invalidChunks);
      continue; // 跳过这一步
    }

    if (chunks.length === 0) {
      console.log("chunks 为空，跳过 Worker 计算");
      continue;
    }




    //promises.length = 0; // 清空上一轮 promises
    // 创建 Worker 并分配任务
    chunks.forEach((chunk, idx) => {
      const worker = workers[idx % workerCount];
      //workers.push(worker);

  /*if (!Array.isArray(chunk)) {
    console.error(`Worker ${idx} 收到无效 chunk:`, chunk);
    return;
  }
  if (chunk.length === 0) {
    console.log(`Worker ${idx} 收到空 chunk，跳过`);
    return;
  }
  // 确保 chunk 中的每个元素是 [sum, paths] 格式
  const isValidChunk = chunk.every(
    ([sum, paths]) => typeof sum === "number" && Array.isArray(paths)
  );
  if (!isValidChunk) {
    console.error(`Worker ${idx} 收到格式错误的 chunk:`, chunk);
    return;
  }

      const promise = new Promise((resolve) => {
        worker.onmessage = (e) => {
          if (e.data.debug) console.log(e.data.debug); // 处理调试信息
          else resolve(e.data.results); // 处理结果
        };
      });
      promises.push(promise);

      // 确保 chunk 是数组
      if (!Array.isArray(chunk)) {
        console.error(`Worker ${idx} 收到无效 chunk:`, chunk);
        return;
      }

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
*/

  return finalizeResult(dp, target, MAX_PATHS_PER_SUM, items);
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
    //console.log(`保存路径: ${sum} -> ${pathKey}`);

    if (Math.abs(sum - target) <= epsilon) {
      console.log(`发现精确解! sum=${sum}, 路径: ${pathKey}`);
    }
    return true;
  }
  return false;
}

// 辅助函数：整理并返回最终结果
function finalizeResult(dp, target, maxPaths, items) {
  let result = dp.get(target) || [];

  //const result = dp.get(target) || [];
  const uniquePaths = new Set();

  // 定义理智关卡的价值映射
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

    // 计算理智关卡的总价值
    let totalStageValue = 0;
    for (const step of stageSteps) {
      totalStageValue += (stageValueMap.get(step.id) || 0) * step.count;
    }

    // 使用 getOptimalStageCombo 重新计算最优理智路径
    const { combo } = getOptimalStageCombo(totalStageValue, items, stageIds);
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
      // 优先按路径长度排序（步骤数最少）
      const lengthDiff = a.length - b.length;
      if (lengthDiff !== 0) return lengthDiff;
      // 如果长度相同，按总使用次数排序

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

function mergeAndSortPath(oldPath, newStep) {
  const path = [...oldPath, newStep];
  // 按 id 排序
  path.sort((a, b) => a.id - b.id);
  // 合并相同 id 的步骤
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
