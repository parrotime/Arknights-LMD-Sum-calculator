import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), ".env") });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import NodeCache from "node-cache";
import { findPaths } from "./DPnew.js";
import { classifyData } from "./DataService.js";
import rateLimit from "express-rate-limit";

// 根据前端 settings 过滤物品列表
const filterItems = (settings) => {
  return classifyData.filter((item) => {
    const t = item.type?.toLowerCase() || "";
    const isUpgradeAllowed = settings.enableUpgradeOnlyFor1 ? t !== "upgrade" : true;
    return (
      (!settings.disable3Star || t !== "3_star") &&
      (!settings.disable2Star || t !== "2_star") &&
      (!settings.disableMaterial || t !== "material") &&
      (!settings.disableStore20 || t !== "store_20") &&
      (!settings.disableStore10 || t !== "store_10") &&
      (!settings.disableStore70 || t !== "store_70") &&
      (!settings.disableStore2000 || t !== "store_2000") &&
      (!settings.disableStore5000 || t !== "store_5000") &&
      (!settings.disableCE || t !== "ce") &&
      (!settings.disableExt25 || t !== "ext_25") &&
      (!settings.disableTrade || t !== "trade") &&
      (settings.enableUpgradeOnly0 || t !== "upgrade_only_0") &&
      (settings.enableUpgradeOnly1 || t !== "upgrade_only_1") &&
      (settings.enableUpgradeOnly2 || t !== "upgrade_only_2") &&
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
    console.warn(`Rate limit exceeded for IP: ${options.keyGenerator(req)} on path: ${ req.path}`);
    res.status(options.statusCode).json(options.message);
  },
});

const app = express();
app.use(helmet());
app.set("trust proxy", "loopback");

const port = process.env.PORT || 3002;

app.use("/find-paths", apiLimiter); 

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

    console.log(
      `[${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}]`,
      "Goal(用户想凑) =", rawGoal,
      "Diff(差值): target =", target,
      "items count =", items.length,
      "limits =", limits
    );

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

    const calculationPromise = findPaths(target, items, finalLimits);
    const timeoutPromise = new Promise(
      (_, reject) =>
        setTimeout(
          () => reject(new Error("Calculation timed out after 15 seconds")),
          15000
        ) // 15秒超时
    );

    const startTime = Date.now();
    let paths;
    try {
      paths = await Promise.race([calculationPromise, timeoutPromise]);
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
      console.log(
        "Result stored in cache for key:",
        cacheKey.substring(0, 50) + "..."
      );
    } else {
      console.log("Calculation resulted in empty/invalid paths, not caching.");
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
app.listen(port, () => {
  console.log(
    `Backend server running behind proxy, listening internally on port ${port}`
  );
});
