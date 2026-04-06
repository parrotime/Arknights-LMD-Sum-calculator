import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), ".env") });

import express from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import NodeCache from "node-cache";
import { Worker } from "worker_threads";
import pino from "pino";
import { classifyData } from "./DataService.js";
import rateLimit from "express-rate-limit";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  timestamp: () => {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    const date = `${beijingTime.getFullYear()}/${String(beijingTime.getMonth() + 1).padStart(2, '0')}/${String(beijingTime.getDate()).padStart(2, '0')}`;
    const time = `${String(beijingTime.getHours()).padStart(2, '0')}:${String(beijingTime.getMinutes()).padStart(2, '0')}:${String(beijingTime.getSeconds()).padStart(2, '0')}`;
    return `,"time":"${date} ${time}"`;
  },
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: false
      }
    },
  }),
});

// ---- Worker Pool ----
const workerPath = join(dirname(fileURLToPath(import.meta.url)), "calcWorker.js");
const POOL_SIZE = parseInt(process.env.WORKER_POOL_SIZE) || 2;
const MAX_QUEUE = parseInt(process.env.MAX_QUEUE) || 10;

class WorkerPool {
  constructor(size) {
    this.workers = [];
    this.queue = [];       // 等待中的任务
    this.taskId = 0;
    this.pendingTasks = new Map(); // taskId -> { resolve, reject, timer }
    this.activeCount = 0;

    for (let i = 0; i < size; i++) {
      this._addWorker();
    }
  }

  _addWorker() {
    const worker = new Worker(workerPath);
    worker.on("message", ({ taskId, result, error }) => {
      const task = this.pendingTasks.get(taskId);
      if (!task) return;
      clearTimeout(task.timer);
      this.pendingTasks.delete(taskId);
      this.activeCount--;
      if (error) {
        task.reject(new Error(error));
      } else {
        task.resolve(result);
      }
      this._processQueue();
    });
    worker.on("error", (err) => {
      // worker 崩溃，拒绝所有该 worker 上的任务，然后重建
      logger.error({ err: err.message }, "Worker crashed, replacing");
      const idx = this.workers.indexOf(worker);
      if (idx !== -1) this.workers.splice(idx, 1);
      this._addWorker();
    });
    this.workers.push(worker);
  }

  run(target, items, limits, timeout = 15000) {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= MAX_QUEUE) {
        return reject(new Error("服务器繁忙，请稍后再试"));
      }
      const taskId = ++this.taskId;
      const task = { taskId, target, items, limits, timeout, resolve, reject };
      this.queue.push(task);
      this._processQueue();
    });
  }

  _processQueue() {
    while (this.queue.length > 0 && this.activeCount < this.workers.length) {
      const task = this.queue.shift();
      this.activeCount++;
      const worker = this.workers[this.activeCount - 1] || this.workers[0];

      const timer = setTimeout(() => {
        this.pendingTasks.delete(task.taskId);
        this.activeCount--;
        task.reject(new Error("Calculation timed out after 15 seconds"));
        // 超时后终止并替换该 worker
        const idx = this.workers.indexOf(worker);
        worker.terminate();
        if (idx !== -1) this.workers.splice(idx, 1);
        this._addWorker();
        this._processQueue();
      }, task.timeout);

      this.pendingTasks.set(task.taskId, {
        resolve: task.resolve,
        reject: task.reject,
        timer,
      });

      worker.postMessage({
        taskId: task.taskId,
        target: task.target,
        items: task.items,
        limits: task.limits,
      });
    }
  }

  get queueLength() {
    return this.queue.length;
  }

  async shutdown() {
    // 拒绝队列中等待的任务
    for (const task of this.queue) {
      task.reject(new Error("Server shutting down"));
    }
    this.queue = [];
    // 等待正在执行的任务完成（最多等 5 秒）
    if (this.pendingTasks.size > 0) {
      await Promise.race([
        new Promise((resolve) => {
          const check = setInterval(() => {
            if (this.pendingTasks.size === 0) { clearInterval(check); resolve(); }
          }, 100);
        }),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
    }
    // 终止所有 worker
    for (const w of this.workers) w.terminate();
    this.workers = [];
  }
}

const pool = new WorkerPool(POOL_SIZE);

const runCalculation = (target, items, limits, timeout = 15000) =>
  pool.run(target, items, limits, timeout);

// 根据前端 settings 过滤物品列表
const filterItems = (settings) => {
  return classifyData.filter((item) => {
    const t = item.type?.toLowerCase() || "";
    const isUpgradeAllowed = settings.allowUpgradeOnlyFor1 ? t !== "upgrade" : true;
    return (
      (settings.allow3Star || t !== "3_star") &&
      (settings.allow2Star || t !== "2_star") &&
      (settings.allowMaterial || t !== "material") &&
      (settings.allowStore20 || t !== "store_20") &&
      (settings.allowStore10 || t !== "store_10") &&
      (settings.allowStore70 || t !== "store_70") &&
      (settings.allowStore2000 || t !== "store_2000") &&
      (settings.allowStore5000 || t !== "store_5000") &&
      (settings.allowCE || t !== "ce") &&
      (settings.allowExt25 || t !== "ext_25") &&
      (settings.allowTrade || t !== "trade") &&
      (settings.allowUpgradeOnly0 || t !== "upgrade_only_0") &&
      (settings.allowUpgradeOnly1 || t !== "upgrade_only_1") &&
      (settings.allowUpgradeOnly2 || t !== "upgrade_only_2") &&
      (settings.allowOrundumsGreen || item.id !== 220) &&
      (settings.allowOrundumsDevice || item.id !== 221) &&
      isUpgradeAllowed
    );
  });
};

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 分钟窗口
  max: 15, 
  message: {
    error: "您所在的IP地址计算请求过于频繁，请休息一下再试~",
  },
  standardHeaders: true, 
  legacyHeaders: false, 
  keyGenerator: (req) => {
    return req.ip;
  },
  handler: (req, res, next, options) => {
    logger.warn({ ip: options.keyGenerator(req), path: req.path }, "Rate limit exceeded");
    res.status(options.statusCode).json(options.message);
  },
});

const app = express();
app.use(helmet());
app.use(compression({ threshold: 512 })); // 响应 > 512B 时启用 gzip
app.set("trust proxy", "loopback");

const port = process.env.PORT || 3002;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "https://ark-lmd.top",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

if (process.env.NODE_ENV !== "test") {
  app.use("/find-paths", apiLimiter);
}

const cache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 600,
  useClones: false,
});
app.use(express.json({ limit: "100kb" }));

// 测试路由
app.get("/", (req, res) => {
  res.send("Hello from the backend!");
});

// 计算路径的路由
app.post("/find-paths", async (req, res) => {
  try {
    const { target, settings, userLimits, rawGoal } = req.body;

    // --- 1. 输入验证 ---
    if (typeof target !== "number" || target < -5000 || target > 5000) {
      return res.status(400).json({
        error: "Invalid input: target must be a number between -5000 and 5000",
      });
    }

    // 检查 settings
    if (!settings || typeof settings !== "object") {
      return res.status(400).json({
        error: "Invalid input: settings must be an object",
      });
    }

    // 后端根据 settings 自行过滤物品
    const items = filterItems(settings);

    // 检查 userLimits
    const defaultLimits = { upgrade0Limit: Infinity, upgrade1Limit: Infinity, upgrade2Limit: Infinity, sanityLimit: Infinity,
    };
    const limits = { ...defaultLimits, ...userLimits }; 

    const checkLimit = (limit, name) => {
      if (limit === null) return true;

      const maxVal = name === "sanityLimit" ? 200 : 10;
      return (
        limit === Infinity ||
        (typeof limit === "number" &&
          Number.isInteger(limit) &&
          limit >= 0 &&
          limit <= maxVal)
      );
    };

    if (
      !limits ||
      typeof limits !== "object" ||
      !checkLimit(limits.upgrade0Limit, "upgrade0Limit") ||
      !checkLimit(limits.upgrade1Limit, "upgrade1Limit") ||
      !checkLimit(limits.upgrade2Limit, "upgrade2Limit") ||
      !checkLimit(limits.sanityLimit, "sanityLimit")
    ) {
      const safeLimits = {};
      for (const key in limits) {
        safeLimits[key] = limits[key] === Infinity ? null : limits[key];
      }
      return res.status(400).json({
        error:
          "Invalid input: userLimits error",
      });
    }

    logger.info({ ip: req.ip, rawGoal, target, itemCount: items.length, limits }, "Calculation request");

    const hardCaps = { upgrade0Limit: 10, upgrade1Limit: 10, upgrade2Limit: 10, sanityLimit: 200 };
    const finalLimits = {};
    for (const key in limits) {
      finalLimits[key] = (limits[key] === null || limits[key] === Infinity)
        ? hardCaps[key] ?? 10
        : limits[key];
    }
    // --- 2. 服务器端缓存（简化 key：target + settings + limits）---
    const serializableFinalLimits = {};
    for (const key in finalLimits) {
      serializableFinalLimits[key] =
        finalLimits[key] === Infinity ? "__INFINITY__" : finalLimits[key];
    }
    const cacheKey = `paths:${target}:${JSON.stringify(settings)}:${JSON.stringify(serializableFinalLimits)}`;

    const cachedPaths = cache.get(cacheKey);
    if (cachedPaths !== undefined) {
      const duration = 0; // 从缓存获取，耗时认为是0
      return res.json({
        success: true,
        paths: cachedPaths,
        duration,
        cache: "hit", 
      });
    }

    const startTime = Date.now();
    let paths;
    try {
      const calcTimeout = parseInt(process.env.CALC_TIMEOUT) || 15000;
      paths = await runCalculation(target, items, finalLimits, calcTimeout);
    } catch (error) {
      if (error.message.includes("timed out")) {
        return res.status(504).json({
          error:
            "计算超时，请尝试简化设置后重试。",
        });
      }
      if (error.message.includes("服务器繁忙")) {
        return res.status(503).json({
          error: "服务器繁忙，当前排队请求过多，请稍后再试。",
        });
      }
      throw error;
    }
    const duration = Date.now() - startTime;

    if (paths && paths.length > 0) {
      cache.set(cacheKey, paths); // 使用默认 TTL (1小时)
      logger.info({ cacheKey: cacheKey.substring(0, 50) }, "Result cached");
    } else {
      logger.info("Empty paths, not caching");
    }

    // 向前端发送结果
    res.json({
      success: true,
      paths: paths || [], 
      duration,
      cache: "miss", 
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error occurred during path finding." });
  }
});

// --- Start Server ---
const __filename = fileURLToPath(import.meta.url);
let server;
if (process.argv[1] === __filename) {
  server = app.listen(port, () => {
    logger.info({ port }, "Backend server started");
  });

  // 优雅关闭：PM2 发送 SIGINT，等当前请求处理完再退出
  const gracefulShutdown = async (signal) => {
    logger.info({ signal }, "Received shutdown signal, closing gracefully...");
    // 停止接受新连接
    server.close(async () => {
      logger.info("HTTP server closed");
      await pool.shutdown();
      logger.info("Worker pool shut down");
      process.exit(0);
    });
    // 兜底：最多等 10 秒强制退出
    setTimeout(() => {
      logger.warn("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);
}

export { app, cache, runCalculation, pool };
