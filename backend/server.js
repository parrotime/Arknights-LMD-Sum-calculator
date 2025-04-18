import express from "express";
import cors from "cors";
import NodeCache from "node-cache"; 
import { findPaths } from "./DPnew.js";
import rateLimit from "express-rate-limit"; 

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 分钟窗口
  max: 15, 
  message: {
    error: "Too many requests from this IP, please try again after a minute",
  },
  standardHeaders: true, 
  legacyHeaders: false, 
  keyGenerator: (req) => {
    const ip = req.ip; 
    console.log("Rate limit check for IP:", ip); 
    return ip;
  },
  handler: (req, res, next, options) => {
    console.warn(`Rate limit exceeded for IP: ${options.keyGenerator(req)} on path: ${ req.path}`);
    res.status(options.statusCode).json(options.message);
  },
});

const app = express();
app.set("trust proxy", "loopback");

const port = 3002;

app.use("/find-paths", apiLimiter); 

const cache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 600,
  useClones: false,
});


app.use(
  cors({
    origin: "https://ark-lmd.top", 
    methods: ["GET", "POST", "PUT", "DELETE"], 
    allowedHeaders: ["Content-Type", "Authorization"], 
  })
);
app.use(express.json({ limit: "1mb" })); // 稍微增加请求体大小限制

app.use("/find-paths", apiLimiter); 

// 测试路由
app.get("/", (req, res) => {
  res.send("Hello from the backend!");
});

// 计算路径的路由
app.post("/find-paths", async (req, res) => {
  try {
    const { target, items, userLimits } = req.body;

    // --- 1. 输入验证 ---
    if (typeof target !== "number" || target < -5000 || target > 5000) {
      console.warn("Invalid target value:", target);
      return res.status(400).json({
        error: "Invalid input: target must be a number between -5000 and 5000",
      });
    }

    // 检查 items
    if (!Array.isArray(items) || items.length === 0 || items.length > 300) {
      console.warn(
        "Invalid items array:",
        items ? `Length: ${items.length}` : "Not an array"
      );
      return res.status(400).json({
        error:
          "Invalid input: items must be a non-empty array with a reasonable size (<= 300)",
      });
    }

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
      console.warn("Invalid userLimits:", userLimits);
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
      "后端接收请求 (Validated): target =", target,
      "items length =", items.length,
      "limits =", limits
    );

    const finalLimits = {};
    for (const key in limits) {
      finalLimits[key] = limits[key] === null ? Infinity : limits[key];
    }
    console.log("后端将用于计算的 limits (null 已转 Infinity):", finalLimits); 

    // --- 2. 服务器端缓存 ---
    let cacheKey;
    try {
      const serializableFinalLimits = {};
      for (const key in finalLimits) {
        serializableFinalLimits[key] =
          finalLimits[key] === Infinity ? "__INFINITY__" : finalLimits[key]; 
      }
      cacheKey = `paths:${target}:${JSON.stringify(items)}:${JSON.stringify(
        serializableFinalLimits
      )}`;
      console.log(
        "Generated Cache Key (using finalLimits):",
        cacheKey.substring(0, 50) + "..."
      );
    } catch (e) {
      console.error("Error generating cache key:", e);
      return res
        .status(500)
        .json({ error: "Internal server error: Could not generate cache key" });
    }

    const cachedPaths = cache.get(cacheKey);
    if (cachedPaths !== undefined) {
      console.log("Cache hit for key:", cacheKey.substring(0, 30) + "..."); 
      const duration = 0; // 从缓存获取，耗时认为是0
      return res.json({
        success: true,
        paths: cachedPaths,
        duration,
        cache: "hit", 
      });
    }

    console.log("Cache miss for key:", cacheKey.substring(0, 30) + "...");

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
        console.error("Calculation timed out for target:", target);
        return res.status(504).json({
          error:
            "Calculation timed out. Please try simplifying the request or contact support.",
        });
      }
      throw error;
    }
    const duration = Date.now() - startTime;
    console.log("后端计算完成, 耗时:", duration, "ms");

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
    console.error("Error in /find-paths:", error);
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
