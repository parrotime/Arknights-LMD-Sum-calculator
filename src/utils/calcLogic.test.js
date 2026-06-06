import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateInput,
  computeDiff,
  buildLimits,
  buildCacheKey,
  getRarityColor,
  computeStepData,
  computeRunningTotals,
} from "./calcLogic.ts";

// ============================================================
// 1. validateInput
// ============================================================
describe("validateInput", () => {
  it("两个输入都为空 → 返回错误", () => {
    assert.ok(validateInput("", "").error);
  });

  it("num1 为空 → 返回错误", () => {
    assert.ok(validateInput("", "1000").error);
  });

  it("num2 为空 → 返回错误", () => {
    assert.ok(validateInput("1000", "").error);
  });

  it("两个输入相同 → 返回错误", () => {
    const r = validateInput("500", "500");
    assert.ok(r.error);
  });

  it("差值超出 5000 → 返回错误", () => {
    const r = validateInput("0", "5001");
    assert.ok(r.error);
  });

  it("差值超出 -5000 → 返回错误", () => {
    const r = validateInput("6000", "0");
    assert.ok(r.error);
  });

  it("合法输入 → 返回 difference 和解析值", () => {
    const r = validateInput("1000", "2000");
    assert.equal(r.error, null);
    assert.equal(r.difference, 1000);
    assert.equal(r.num1Val, 1000);
    assert.equal(r.num2Val, 2000);
  });

  it("负差值也合法（目标 < 当前）", () => {
    const r = validateInput("3000", "1000");
    assert.equal(r.error, null);
    assert.equal(r.difference, -2000);
  });

  it("边界值 差值=5000 合法", () => {
    const r = validateInput("0", "5000");
    assert.equal(r.error, null);
    assert.equal(r.difference, 5000);
  });

  it("边界值 差值=-5000 合法", () => {
    const r = validateInput("5000", "0");
    assert.equal(r.error, null);
    assert.equal(r.difference, -5000);
  });
});

// ============================================================
// 2. computeDiff
// ============================================================
describe("computeDiff", () => {
  it("任一输入为空 → 返回 null", () => {
    assert.equal(computeDiff("", "100"), null);
    assert.equal(computeDiff("100", ""), null);
  });

  it("非数字输入 → 返回 null", () => {
    assert.equal(computeDiff("abc", "100"), null);
  });

  it("正常差值", () => {
    const r = computeDiff("1000", "3000");
    assert.equal(r.value, 2000);
    assert.equal(r.outOfRange, false);
  });

  it("超出范围标记 outOfRange=true", () => {
    const r = computeDiff("0", "6000");
    assert.equal(r.value, 6000);
    assert.equal(r.outOfRange, true);
  });

  it("边界值 5000 不超范围", () => {
    const r = computeDiff("0", "5000");
    assert.equal(r.outOfRange, false);
  });

  it("边界值 5001 超范围", () => {
    const r = computeDiff("0", "5001");
    assert.equal(r.outOfRange, true);
  });
});

// ============================================================
// 3. buildLimits
// ============================================================
describe("buildLimits", () => {
  it("空字符串 → Infinity", () => {
    const r = buildLimits({
      upgrade0Count: "",
      upgrade1Count: "",
      upgrade2Count: "",
      sanityCount: "",
      trade2Count: "",
      trade3Count: "",
      trade4Count: "",
      trade5Count: "",
    });
    assert.equal(r.upgrade0Limit, Infinity);
    assert.equal(r.sanityLimit, Infinity);
    assert.equal(r.trade2Limit, Infinity);
    assert.equal(r.trade5Limit, Infinity);
  });

  it("数字字符串 → 解析为整数", () => {
    const r = buildLimits({
      upgrade0Count: "3",
      upgrade1Count: "5",
      upgrade2Count: "0",
      sanityCount: "100",
      trade2Count: "2",
      trade3Count: "3",
      trade4Count: "4",
      trade5Count: "0",
    });
    assert.equal(r.upgrade0Limit, 3);
    assert.equal(r.upgrade1Limit, 5);
    assert.equal(r.upgrade2Limit, 0);
    assert.equal(r.sanityLimit, 100);
    assert.equal(r.trade2Limit, 2);
    assert.equal(r.trade3Limit, 3);
    assert.equal(r.trade4Limit, 4);
    assert.equal(r.trade5Limit, 0);
  });
});

// ============================================================
// 4. buildCacheKey
// ============================================================
describe("buildCacheKey", () => {
  it("相同输入产生相同 key", () => {
    const s = { a: true, b: false };
    const l = {
      upgrade0Limit: 1,
      upgrade1Limit: 2,
      upgrade2Limit: 3,
      sanityLimit: Infinity,
      trade2Limit: Infinity,
      trade3Limit: Infinity,
      trade4Limit: Infinity,
      trade5Limit: Infinity,
    };
    assert.equal(buildCacheKey(100, s, l), buildCacheKey(100, s, l));
  });

  it("settings 顺序不影响 key（已排序）", () => {
    const s1 = { b: false, a: true };
    const s2 = { a: true, b: false };
    const l = {
      upgrade0Limit: 0,
      upgrade1Limit: 0,
      upgrade2Limit: 0,
      sanityLimit: 0,
      trade2Limit: 0,
      trade3Limit: 0,
      trade4Limit: 0,
      trade5Limit: 0,
    };
    assert.equal(buildCacheKey(50, s1, l), buildCacheKey(50, s2, l));
  });

  it("不同 difference 产生不同 key", () => {
    const s = { a: true };
    const l = {
      upgrade0Limit: 0,
      upgrade1Limit: 0,
      upgrade2Limit: 0,
      sanityLimit: 0,
      trade2Limit: 0,
      trade3Limit: 0,
      trade4Limit: 0,
      trade5Limit: 0,
    };
    assert.notEqual(buildCacheKey(100, s, l), buildCacheKey(200, s, l));
  });

  it("不同 trade 限制产生不同 key", () => {
    const s = { a: true };
    const base = {
      upgrade0Limit: 0,
      upgrade1Limit: 0,
      upgrade2Limit: 0,
      sanityLimit: 0,
      trade2Limit: 0,
      trade3Limit: 0,
      trade4Limit: 0,
      trade5Limit: 0,
    };
    assert.notEqual(
      buildCacheKey(100, s, base),
      buildCacheKey(100, s, { ...base, trade5Limit: 1 })
    );
  });

  it("不同计算模式产生不同 key", () => {
    const s = { a: true };
    const l = {
      upgrade0Limit: 0,
      upgrade1Limit: 0,
      upgrade2Limit: 0,
      sanityLimit: 0,
      trade2Limit: 0,
      trade3Limit: 0,
      trade4Limit: 0,
      trade5Limit: 0,
    };
    assert.notEqual(
      buildCacheKey(100, s, l, "fast"),
      buildCacheKey(100, s, l, "strong")
    );
  });
});

// ============================================================
// 5. getRarityColor
// ============================================================
describe("getRarityColor", () => {
  it("rarity=1 → 绿色", () => {
    assert.equal(getRarityColor(1), "#3f9f68");
  });

  it("rarity=2 → 蓝色", () => {
    assert.equal(getRarityColor(2), "#4f8fd8");
  });

  it("rarity=3 → 紫色", () => {
    assert.equal(getRarityColor(3), "#b277ff");
  });

  it("rarity=5 → 橙色", () => {
    assert.equal(getRarityColor(5), "#f0a33a");
  });

  it("未知 rarity → 默认浅色", () => {
    assert.equal(getRarityColor(99), "#d8e3ec");
    assert.equal(getRarityColor(undefined), "#d8e3ec");
  });
});

// ============================================================
// 6. computeStepData
// ============================================================

// mock 物品查找函数
const mockItems = new Map([
  [1, { id: 1, item_name: "升级A", item_value: -61, rarity: 1, consume: 0 }],
  [2, { id: 2, item_name: "关卡B", item_value: 72, rarity: 3, consume: 6 }],
  [3, { id: 3, item_name: "贸易C", item_value: 1000, rarity: 5, consume: 0 }],
]);
const mockGetItem = (id) => mockItems.get(id) || null;

describe("computeStepData", () => {
  it("空路径 → 空 steps, totalSanity=0", () => {
    const r = computeStepData([], mockGetItem);
    assert.deepEqual(r.steps, []);
    assert.equal(r.totalSanity, 0);
  });

  it("正确计算 stepValue 和 totalSanity", () => {
    const path = [{ id: 2, count: 3 }];
    const r = computeStepData(path, mockGetItem);
    assert.equal(r.steps[0].stepValue, 72 * 3);
    assert.equal(r.totalSanity, 6 * 3);
  });

  it("未知物品 → steps 中对应项为 null", () => {
    const path = [{ id: 999, count: 1 }];
    const r = computeStepData(path, mockGetItem);
    assert.equal(r.steps[0], null);
  });

  it("多步骤累计理智", () => {
    const path = [{ id: 2, count: 2 }, { id: 2, count: 1 }];
    const r = computeStepData(path, mockGetItem);
    assert.equal(r.totalSanity, 6 * 2 + 6 * 1);
  });
});

// ============================================================
// 7. computeRunningTotals
// ============================================================
describe("computeRunningTotals", () => {
  it("空 stepData → 空数组", () => {
    assert.deepEqual(computeRunningTotals([], 1000), []);
  });

  it("单步正值：1000 + 72 = 1072", () => {
    const sd = [{ stepValue: 72 }];
    const r = computeRunningTotals(sd, 1000);
    assert.deepEqual(r, [1072]);
  });

  it("单步负值：1000 + (-61) = 939", () => {
    const sd = [{ stepValue: -61 }];
    const r = computeRunningTotals(sd, 1000);
    assert.deepEqual(r, [939]);
  });

  it("多步累计正确", () => {
    const sd = [{ stepValue: 100 }, { stepValue: -50 }, { stepValue: 200 }];
    const r = computeRunningTotals(sd, 0);
    assert.deepEqual(r, [100, 50, 250]);
  });

  it("null 项视为 0", () => {
    const sd = [{ stepValue: 100 }, null, { stepValue: 200 }];
    const r = computeRunningTotals(sd, 0);
    assert.deepEqual(r, [100, 100, 300]);
  });
});
