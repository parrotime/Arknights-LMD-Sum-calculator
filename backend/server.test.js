import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { app, cache } = await import("./server.js");

let server;
let baseUrl;

const post = (path, body) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// 默认合法请求体
const validBody = {
  target: 100,
  settings: {
    allow3Star: true, allow2Star: true, allowMaterial: true,
    allowStore20: true, allowStore10: true, allowStore70: true,
    allowStore2000: true, allowStore5000: true, allowCE: true,
    allowExt25: true, allowTrade: true,
    allowUpgradeOnly0: true, allowUpgradeOnly1: true, allowUpgradeOnly2: true,
    allowUpgradeOnlyFor1: false,
  },
  userLimits: {},
};

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => cache.flushAll());

// ============================================================
// 1. 正常请求
// ============================================================
describe("/find-paths 正常请求", () => {
  it("返回 200 且 success=true", async () => {
    const res = await post("/find-paths", validBody);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.paths));
  });

  it("返回的 paths 非空且每条路径总和正确", async () => {
    const res = await post("/find-paths", validBody);
    const data = await res.json();
    assert.ok(data.paths.length > 0, "应返回至少1条路径");
  });

  it("响应包含 duration 和 cache 字段", async () => {
    const res = await post("/find-paths", validBody);
    const data = await res.json();
    assert.equal(typeof data.duration, "number");
    assert.ok(["hit", "miss"].includes(data.cache));
  });

  it("负数 target=-200 也能正常返回", async () => {
    const res = await post("/find-paths", { ...validBody, target: -200 });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.paths.length > 0);
  });
});

// ============================================================
// 2. 输入校验
// ============================================================
describe("/find-paths 输入校验", () => {
  it("缺少 target → 400", async () => {
    const res = await post("/find-paths", { settings: validBody.settings });
    assert.equal(res.status, 400);
  });

  it("target 非数字 → 400", async () => {
    const res = await post("/find-paths", { ...validBody, target: "abc" });
    assert.equal(res.status, 400);
  });

  it("target 超出范围 (>5000) → 400", async () => {
    const res = await post("/find-paths", { ...validBody, target: 5001 });
    assert.equal(res.status, 400);
  });

  it("target 超出范围 (<-5000) → 400", async () => {
    const res = await post("/find-paths", { ...validBody, target: -5001 });
    assert.equal(res.status, 400);
  });

  it("缺少 settings → 400", async () => {
    const res = await post("/find-paths", { target: 100 });
    assert.equal(res.status, 400);
  });

  it("settings 非对象 → 400", async () => {
    const res = await post("/find-paths", { target: 100, settings: "bad" });
    assert.equal(res.status, 400);
  });

  it("userLimits 中 upgrade0Limit 超出范围 → 400", async () => {
    const res = await post("/find-paths", {
      ...validBody,
      userLimits: { upgrade0Limit: 99 },
    });
    assert.equal(res.status, 400);
  });

  it("userLimits 中 sanityLimit 超出范围 → 400", async () => {
    const res = await post("/find-paths", {
      ...validBody,
      userLimits: { sanityLimit: 999 },
    });
    assert.equal(res.status, 400);
  });
});

// ============================================================
// 3. 缓存命中/未命中
// ============================================================
describe("/find-paths 缓存", () => {
  it("首次请求 cache=miss", async () => {
    const res = await post("/find-paths", validBody);
    const data = await res.json();
    assert.equal(data.cache, "miss");
  });

  it("相同请求第二次 cache=hit, duration=0", async () => {
    await post("/find-paths", validBody);
    const res2 = await post("/find-paths", validBody);
    const data = await res2.json();
    assert.equal(data.cache, "hit");
    assert.equal(data.duration, 0);
  });

  it("不同 target 不命中缓存", async () => {
    await post("/find-paths", validBody);
    const res2 = await post("/find-paths", { ...validBody, target: 200 });
    const data = await res2.json();
    assert.equal(data.cache, "miss");
  });

  it("不同 userLimits 不命中缓存", async () => {
    await post("/find-paths", validBody);
    const res2 = await post("/find-paths", {
      ...validBody,
      userLimits: { sanityLimit: 0 },
    });
    const data = await res2.json();
    assert.equal(data.cache, "miss");
  });
});

// ============================================================
// 4. 超时处理
// ============================================================
describe("/find-paths 超时处理", () => {
  it("worker 超时返回 504", async () => {
    const original = process.env.CALC_TIMEOUT;
    process.env.CALC_TIMEOUT = "1"; // 1ms，必然超时
    try {
      const res = await post("/find-paths", validBody);
      assert.equal(res.status, 504);
      const data = await res.json();
      assert.ok(data.error.includes("timed out"));
    } finally {
      process.env.CALC_TIMEOUT = original;
    }
  });
});
