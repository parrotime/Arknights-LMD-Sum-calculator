import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findPaths, _test } from "./DPnew.js";
import { classifyData } from "./DataService.js";

const {
  getOptimalGreedyCombo,
  getOptimalStageCombo,
  savePath,
  isPathValid,
  mergeAndSortPath,
  tradeDenoms,
  materialDenoms,
  MAX_PATHS_PER_SUM,
  TARGET_PATH_COUNT,
} = _test;

// 构建 itemMap 供测试使用
const itemMap = new Map(classifyData.map((i) => [i.id, i]));

// 辅助：计算路径的龙门币总和
const pathSum = (path) =>
  path.reduce((sum, step) => {
    const item = itemMap.get(step.id);
    return sum + (item ? item.item_value * step.count : 0);
  }, 0);

// 辅助：创建 savePath 所需的 ctx
const makeCtx = (target, overrides = {}) => ({
  dp: new Map([[0, { paths: [[]], keys: new Set([""]) }]]),
  maxPaths: MAX_PATHS_PER_SUM,
  target,
  itemMap,
  upgrade0Limit: 10,
  upgrade1Limit: 10,
  upgrade2Limit: 10,
  sanityLimit: Infinity,
  targetPathCount: TARGET_PATH_COUNT,
  caches: { trade: new Map(), material: new Map(), stage: new Map() },
  ...overrides,
});

// ============================================================
// 1. 贪心组合器 getOptimalGreedyCombo
// ============================================================
describe("getOptimalGreedyCombo", () => {
  it("target=0 返回空组合", () => {
    const r = getOptimalGreedyCombo(0, tradeDenoms, new Map());
    assert.equal(r.steps, 0);
    assert.deepEqual(r.combo, []);
  });

  it("负数 target 返回 Infinity", () => {
    const r = getOptimalGreedyCombo(-100, tradeDenoms, new Map());
    assert.equal(r.steps, Infinity);
  });

  it("trade: 3500 = 2000 + 1500", () => {
    const r = getOptimalGreedyCombo(3500, tradeDenoms, new Map());
    assert.equal(r.steps, 2);
    const total = r.combo.reduce((s, c) => {
      const d = tradeDenoms.find((x) => x.id === c.id);
      return s + d.value * c.count;
    }, 0);
    assert.equal(total, 3500);
  });

  it("trade: 无法凑出 1（最小面额1000）", () => {
    const r = getOptimalGreedyCombo(1, tradeDenoms, new Map());
    assert.equal(r.steps, Infinity);
  });

  it("material: 700 = 400 + 300", () => {
    const r = getOptimalGreedyCombo(700, materialDenoms, new Map());
    assert.equal(r.steps, 2);
    const total = r.combo.reduce((s, c) => {
      const d = materialDenoms.find((x) => x.id === c.id);
      return s + d.value * c.count;
    }, 0);
    assert.equal(total, 700);
  });

  it("material: 100 = 100×1", () => {
    const r = getOptimalGreedyCombo(100, materialDenoms, new Map());
    assert.equal(r.steps, 1);
    assert.equal(r.combo[0].count, 1);
  });

  it("缓存命中返回相同结果", () => {
    const cache = new Map();
    const r1 = getOptimalGreedyCombo(2000, tradeDenoms, cache);
    const r2 = getOptimalGreedyCombo(2000, tradeDenoms, cache);
    assert.deepEqual(r1, r2);
    assert.equal(cache.size, 1);
  });
});

// ============================================================
// 2. DP 组合器 getOptimalStageCombo
// ============================================================
describe("getOptimalStageCombo", () => {
  // 筛选出理智关卡物品
  const stageItems = classifyData.filter(
    (i) => i.type === "3_star" || i.type === "2_star"
  );

  it("target<=0 返回空组合", () => {
    const r = getOptimalStageCombo(0, stageItems, itemMap, new Map());
    assert.equal(r.steps, 0);
    assert.deepEqual(r.combo, []);
  });

  it("能凑出 72（三星6理智关卡×1）", () => {
    const r = getOptimalStageCombo(72, stageItems, itemMap, new Map());
    assert.notEqual(r.steps, Infinity);
    const total = r.combo.reduce((s, c) => {
      const item = itemMap.get(c.id);
      return s + item.item_value * c.count;
    }, 0);
    assert.equal(total, 72);
  });

  it("能凑出 144（72×2）", () => {
    const r = getOptimalStageCombo(144, stageItems, itemMap, new Map());
    assert.notEqual(r.steps, Infinity);
    const total = r.combo.reduce((s, c) => {
      const item = itemMap.get(c.id);
      return s + item.item_value * c.count;
    }, 0);
    assert.equal(total, 144);
  });

  it("缓存命中返回相同结果", () => {
    const cache = new Map();
    const r1 = getOptimalStageCombo(72, stageItems, itemMap, cache);
    const r2 = getOptimalStageCombo(72, stageItems, itemMap, cache);
    assert.deepEqual(r1, r2);
  });
});

// ============================================================
// 3. savePath 去重和限制逻辑
// ============================================================
describe("savePath", () => {
  it("拒绝重复路径（相同 normalizedPathKey）", () => {
    const ctx = makeCtx(-61);
    const path = [{ id: 1, count: 1 }];
    savePath(ctx, -61, path);
    const result = savePath(ctx, -61, path);
    assert.equal(result, false);
    assert.equal(ctx.dp.get(-61).paths.length, 1);
  });

  it("拒绝超出 upgrade0Limit 的路径", () => {
    const ctx = makeCtx(-61, { upgrade0Limit: 0 });
    const path = [{ id: 120, count: 1 }];
    const result = savePath(ctx, -61, path);
    assert.equal(result, false);
  });

  it("拒绝超出 upgrade1Limit 的路径", () => {
    const ctx = makeCtx(-81, { upgrade1Limit: 0 });
    const path = [{ id: 150, count: 1 }];
    const result = savePath(ctx, -81, path);
    assert.equal(result, false);
  });

  it("拒绝超出 sanityLimit 的路径", () => {
    const ctx = makeCtx(72, { sanityLimit: 5 });
    const path = [{ id: 87, count: 1 }];
    const result = savePath(ctx, 72, path);
    assert.equal(result, false);
  });

  it("接受合法路径并存入 dp", () => {
    const ctx = makeCtx(-61);
    const path = [{ id: 1, count: 1 }];
    savePath(ctx, -61, path);
    assert.ok(ctx.dp.has(-61));
    assert.equal(ctx.dp.get(-61).paths.length, 1);
  });
});

// ============================================================
// 4. isPathValid 和 mergeAndSortPath
// ============================================================
describe("isPathValid", () => {
  it("合法路径返回 true", () => {
    // id=1 type=upgrade, maxCount=1
    assert.ok(isPathValid([{ id: 1, count: 1 }], itemMap));
  });

  it("超出物品最大使用次数返回 false", () => {
    // upgrade 类型 maxCount=1，用2次应该失败
    assert.equal(isPathValid([{ id: 1, count: 2 }], itemMap), false);
  });

  it("空路径返回 true", () => {
    assert.ok(isPathValid([], itemMap));
  });
});

describe("mergeAndSortPath", () => {
  it("合并两个路径并按 id 排序", () => {
    const old = [{ id: 3, count: 1 }];
    const add = [{ id: 1, count: 2 }];
    const merged = mergeAndSortPath(old, add);
    assert.equal(merged[0].id, 1);
    assert.equal(merged[1].id, 3);
  });

  it("相同 id 的 count 累加", () => {
    const old = [{ id: 1, count: 1 }];
    const add = [{ id: 1, count: 2 }];
    const merged = mergeAndSortPath(old, add);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].count, 3);
  });
});

// ============================================================
// 5. findPaths 集成测试 — 边界值
// ============================================================
describe("findPaths 边界值", () => {
  it("非法输入：target 非数字返回空数组", () => {
    assert.deepEqual(findPaths("abc"), []);
  });

  it("非法输入：items 非数组返回空数组", () => {
    assert.deepEqual(findPaths(100, "not-array"), []);
  });

  it("target=1（最小正差值）返回有效路径", () => {
    const paths = findPaths(1);
    // 可能找不到精确解（1太小），但不应崩溃
    assert.ok(Array.isArray(paths));
  });

  it("target=-1（最小负差值）返回有效路径", () => {
    const paths = findPaths(-1);
    assert.ok(Array.isArray(paths));
  });

  it("target=5000（最大正边界）返回路径且总和正确", () => {
    const paths = findPaths(5000);
    assert.ok(paths.length > 0, "应找到至少1条路径");
    for (const p of paths) {
      assert.equal(pathSum(p), 5000, `路径总和应为5000`);
    }
  });

  it("target=-5000（最大负边界）返回路径且总和正确", () => {
    const paths = findPaths(-5000);
    assert.ok(paths.length > 0, "应找到至少1条路径");
    for (const p of paths) {
      assert.equal(pathSum(p), -5000, `路径总和应为-5000`);
    }
  });
});

// ============================================================
// 6. findPaths 已知输入验证
// ============================================================
describe("findPaths 已知输入", () => {
  it("target=100 返回路径且每条路径总和=100", () => {
    const paths = findPaths(100);
    assert.ok(paths.length > 0);
    for (const p of paths) {
      assert.equal(pathSum(p), 100);
    }
  });

  it("target=-200 返回路径且每条路径总和=-200", () => {
    const paths = findPaths(-200);
    assert.ok(paths.length > 0);
    for (const p of paths) {
      assert.equal(pathSum(p), -200);
    }
  });

  it("target=1000（贸易站面额）返回路径", () => {
    const paths = findPaths(1000);
    assert.ok(paths.length > 0);
    for (const p of paths) {
      assert.equal(pathSum(p), 1000);
    }
  });

  it("返回路径数量不超过 TARGET_PATH_COUNT", () => {
    const paths = findPaths(500);
    assert.ok(paths.length <= TARGET_PATH_COUNT);
  });

  it("返回路径无重复（normalizedPathKey 唯一）", () => {
    const paths = findPaths(300);
    const keys = paths.map((p) =>
      [...p].sort((a, b) => a.id - b.id).map((s) => `${s.id}x${s.count}`).join("_")
    );
    const unique = new Set(keys);
    assert.equal(keys.length, unique.size, "不应有重复路径");
  });
});

// ============================================================
// 7. findPaths 限制逻辑
// ============================================================
describe("findPaths 用户限制", () => {
  it("sanityLimit=0 时返回的路径不消耗理智", () => {
    const paths = findPaths(100, classifyData, { sanityLimit: 0 });
    for (const p of paths) {
      const sanity = p.reduce((s, step) => {
        const item = itemMap.get(step.id);
        return s + (item?.consume || 0) * step.count;
      }, 0);
      assert.equal(sanity, 0, "不应消耗理智");
    }
  });

  it("upgrade0Limit=0 时返回的路径不含 upgrade_only_0", () => {
    const paths = findPaths(-200, classifyData, { upgrade0Limit: 0 });
    for (const p of paths) {
      for (const step of p) {
        const item = itemMap.get(step.id);
        assert.notEqual(item?.type, "upgrade_only_0");
      }
    }
  });
});