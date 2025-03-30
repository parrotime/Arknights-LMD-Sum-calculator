/* eslint-env worker */
import {
  getMaxCountForId,
  getOptimalTradeGoldCombo,
  getOptimalMaterialCombo,
  getOptimalStageCombo,
  mergeAndSortPath,
  isPathValid,
} from "./utils.js";

self.onmessage = (e) => {
  const {
    task,
    sortedItems,
    target,
    pruneThreshold,
    tradeGoldIds,
    materialIds,
    stageIds,
    items,
  } = e.data;

  // 添加调试日志
  // 直接使用 console.log 调试
  //console.log("Worker 收到 task:", task);
  //console.log("task 类型:", Object.prototype.toString.call(task));

  // 检查 task 是否可迭代
  if (!task || !(Symbol.iterator in Object(task))) {
    self.postMessage({
      debug: `错误: task 不可迭代, task = ${JSON.stringify(task)}`,
    });
    //throw new Error("task is not iterable");
    return;
  }

  // 处理任务
  const results = [];
  const seenPathKeys = new Set(); // 用于去重

  for (const [currentSum, paths] of task) {
    if (Math.abs(currentSum - target) > pruneThreshold) continue;

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
            const { combo } = getOptimalStageCombo(stageSum, items, stageIds);
            if (combo.length === 0) continue;
            newPath = [...oldPath, ...combo];
          } else {
            newPath = mergeAndSortPath(oldPath, { id: item.id, count });
          }

          if (isPathValid(newPath, items)) {
            //console.log("Worker 生成路径:", newSum, newPath);

            const pathKey = newPath.map((s) => `${s.id}x${s.count}`).join("_");
            if (!seenPathKeys.has(pathKey)) {
              seenPathKeys.add(pathKey);
              results.push({ sum: newSum, paths: [newPath] });
            }
            /*self.postMessage({
              debug: `Worker 生成路径: ${newSum} -> ${JSON.stringify(newPath)}`,
            });*/
          }
        }
      }
    }
  }

  self.postMessage(results);
};

// 添加默认导出
export default self; // 导出 Worker 的全局对象
