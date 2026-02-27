/**
 * 基准测试 Worker — 由 _benchmark.mjs 通过子进程调用
 * 用法: node _bench_worker.mjs <version_file> <target> <runs> [limitsJSON]
 * version_file 为相对于 backend/ 的文件名，如 DPnew.js
 */
import { classifyData } from "./DataService.js";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const [,, versionFile, targetStr, runsStr, limitsJSON] = process.argv;
const target = Number(targetStr);
const runs = Number(runsStr) || 3;
const userLimits = limitsJSON ? JSON.parse(limitsJSON) : {};

// 动态 import 指定版本的 findPaths（用 pathToFileURL 处理 Windows 路径）
const fullPath = path.resolve(__dirname, versionFile);
const mod = await import(pathToFileURL(fullPath).href);
const findPaths = mod.findPaths;

const timings = [];
let lastResult = [];

for (let i = 0; i < runs; i++) {
  const start = performance.now();
  lastResult = findPaths(target, classifyData, userLimits);
  const elapsed = performance.now() - start;
  timings.push(elapsed);
}

// 质量指标
const pathCount = lastResult.length;
let minTypes = Infinity, totalTypes = 0, totalItems = 0;

for (const path of lastResult) {
  const types = path.length;
  const items = path.reduce((s, step) => s + step.count, 0);
  if (types < minTypes) minTypes = types;
  totalTypes += types;
  totalItems += items;
}

const avgTypes = pathCount > 0 ? (totalTypes / pathCount).toFixed(2) : "—";
const avgItems = pathCount > 0 ? (totalItems / pathCount).toFixed(2) : "—";
if (minTypes === Infinity) minTypes = "—";

// 取中位数耗时
timings.sort((a, b) => a - b);
const median = timings[Math.floor(timings.length / 2)];

// 输出 JSON 供主进程解析
console.log(JSON.stringify({
  time: Math.round(median),
  pathCount,
  minTypes,
  avgTypes,
  avgItems,
}));
