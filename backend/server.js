import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), ".env") });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import NodeCache from "node-cache";
import { Worker } from "worker_threads";
import pino from "pino";
import { classifyData } from "./DataService.js";
import rateLimit from "express-rate-limit";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  ...(process.env.NODE_ENV !== "production" && {
    transport: { target: "pino-pretty" },
  }),
});

const workerPath = join(dirname(fileURLToPath(import.meta.url)), "calcWorker.js");

const runCalculation = (target, items, limits, timeout = 15000) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: { target, items, limits },
    });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("Calculation timed out after 15 seconds"));
    }, timeout);
    worker.on("message", (result) => {
      clearTimeout(timer);
      resolve(result);
    });
    worker.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

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
      isUpgradeAllowed
    );
  });
};

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 分钟窗口
  max: 15, 
  message: {
    error: "您所在的IP地址在短时间内发出过多计算请求，请休息一下再试~",
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
app.set("trust proxy", "loopback");

const port = process.env.PORT || 3002;

if (process.env.NODE_ENV !== "test") {
  app.use("/find-paths", apiLimiter);
}

const cache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 600,
  useClones: false,
});


app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "https://ark-lmd.top",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
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

    logger.info({ rawGoal, target, itemCount: items.length, limits }, "Calculation request");

    const finalLimits = {};
    for (const key in limits) {
      finalLimits[key] = limits[key] === null ? Infinity : limits[key];
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
            "Calculation timed out. Please try simplifying the request or contact support.",
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
if (process.argv[1] === __filename) {
  app.listen(port, () => {
    logger.info({ port }, "Backend server started");
  });
}

export { app, cache, runCalculation };
