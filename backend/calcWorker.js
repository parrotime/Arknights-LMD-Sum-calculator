import { parentPort } from "worker_threads";
import { findPaths } from "./DPnew.js";

// 消息通信模式：接收任务，计算完成后回传结果
parentPort.on("message", ({ taskId, target, items, limits }) => {
  try {
    const result = findPaths(target, items, limits);
    parentPort.postMessage({ taskId, result, error: null });
  } catch (err) {
    parentPort.postMessage({ taskId, result: null, error: err.message });
  }
});
