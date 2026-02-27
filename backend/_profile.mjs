// 临时性能探针：测量 findPaths 各阶段耗时
import { classifyData } from "./DataService.js";

// Monkey-patch savePath by wrapping findPaths internals
// Instead, we'll instrument at a higher level by modifying a copy

const target = 100;
const items = classifyData;
const itemMap = new Map(items.map(i => [i.id, i]));

// Count savePath-equivalent calls
const MAX_STEPS = 6;
const getMaxCountForId = (id) => {
  const item = itemMap.get(id);
  if (!item) return 10;
  const t = item.type;
  if (t === "upgrade") return 1;
  if (t === "upgrade_only_1") return 5;
  if (t === "upgrade_only_2") return 3;
  return 10;
};

const validItems = items.filter(i => typeof i?.item_value === "number" && i.item_value !== 0);
const sortedItems = [...validItems].sort((a, b) => Math.abs(b.item_value) - Math.abs(a.item_value));

const absTarget = Math.abs(target);
const pruneThreshold = Math.min(Math.max(absTarget, 1000), 3000);
const phase1Bound = absTarget + pruneThreshold;

// Count Phase 1 iterations
let p1Iterations = 0;
let p1SaveCalls = 0;
for (const item of sortedItems) {
  const iv = item.item_value;
  const maxCount = getMaxCountForId(item.id);
  for (let count = 1; count <= maxCount; count++) {
    const newSum = iv * count;
    p1Iterations++;
    if (Math.abs(newSum) > phase1Bound) break;
    if (Math.abs(newSum - target) > phase1Bound) continue;
    p1SaveCalls++;
  }
}

console.log("Phase 1:");
console.log("  Total iterations:", p1Iterations);
console.log("  savePath calls:", p1SaveCalls);
console.log("  sortedItems count:", sortedItems.length);

// Now actually run findPaths and measure
const { findPaths } = await import("./DPnew.js");

const t0 = performance.now();
const result = findPaths(target);
const t1 = performance.now();
console.log("\nTotal time:", Math.round(t1 - t0), "ms");
console.log("Paths found:", result.length);
