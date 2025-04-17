import express from "express";
import cors from "cors";
import NodeCache from "node-cache"; // 引入 node-cache
import { findPaths } from "./DPnew.js";
import rateLimit from "express-rate-limit"; // 引入 express-rate-limit

// --- Rate Limiting Setup ---
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 分钟窗口
  max: 1000, // 每个 IP 在窗口期内最多允许 10 次请求 (比你最初设想的10次稍宽松一点，给用户调整留空间)
  message: {
    error: "Too many requests from this IP, please try again after a minute",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // 优先使用 X-Forwarded-For 头（如果你的服务器前有反向代理如 Nginx 或 阿里云SLB）
    // 否则回退到 req.ip
    //const ip = req.headers['x-forwarded-for'] || req.ip;
    const ip = req.ip; // 直接使用 req.ip 即可，Express 会处理 X-Forwarded-For
    console.log("Rate limit check for IP:", ip); // 调试时可以看是哪个IP在请求
    return ip;
  },
  handler: (req, res, next, options) => {
    console.warn(
      `Rate limit exceeded for IP: ${options.keyGenerator(req)} on path: ${
        req.path
      }`
    );
    res.status(options.statusCode).json(options.message);
  },
});

const app = express();
// --- Trust Proxy Setup ---  <-- 添加这个部分
// 告诉 Express 信任来自本机 Nginx 的 X-Forwarded-* 头信息
app.set("trust proxy", "loopback");

const port = 3002;

// 将速率限制中间件应用到需要保护的路由上
// 你可以只应用到 /find-paths，或者应用到所有API路由
app.use("/find-paths", apiLimiter); // 只对 /find-paths 应用限制

// --- Caching Setup ---
// stdTTL: 缓存项的默认存活时间（3600秒）。
// checkperiod: 定期检查过期缓存项的时间间隔（600秒）。
// useClones: false - 为了性能，直接存储对象引用，而不是克隆。对于不可变数据或只读场景是安全的。
const cache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 600,
  useClones: false,
});

//app.use(cors());
// 允许 http://ark-lmd.top 跨源访问
app.use(
  cors({
    origin: "https://ark-lmd.top", // 允许的前端域名
    methods: ["GET", "POST", "PUT", "DELETE"], // 允许的请求方法
    allowedHeaders: ["Content-Type", "Authorization"], // 允许的请求头
  })
);
app.use(express.json({ limit: "1mb" })); // 稍微增加请求体大小限制，以防items数组较大，但也要设限

// 将速率限制中间件应用到 /api 路径下的 /find-paths
// 注意：因为Nginx代理了/api，所以Express这边收到的路径仍然是 /find-paths
app.use("/find-paths", apiLimiter); // 保持这个路由不变

// 测试路由
app.get("/", (req, res) => {
  res.send("Hello from the backend!");
});

// 计算路径的路由
app.post("/find-paths", async (req, res) => {
  try {
    const { target, items, userLimits } = req.body;

    // --- 1. 严格的输入验证 ---
    // 检查 target
    if (typeof target !== "number" || target < -5000 || target > 5000) {
      // 假设 target 就是差值本身，直接用差值范围
      console.warn("Invalid target value:", target);
      return res.status(400).json({
        error: "Invalid input: target must be a number between -5000 and 5000",
      });
    }

    // 检查 items
    if (!Array.isArray(items) || items.length === 0 || items.length > 300) {
      // 增加长度校验，上限300
      console.warn(
        "Invalid items array:",
        items ? `Length: ${items.length}` : "Not an array"
      );
      return res.status(400).json({
        error:
          "Invalid input: items must be a non-empty array with a reasonable size (<= 300)",
      });
    }
    // (可选) 更深入的检查 items 数组内元素的结构，如果需要的话

    // 检查 userLimits
    const defaultLimits = {
      upgrade0Limit: Infinity,
      upgrade1Limit: Infinity,
      upgrade2Limit: Infinity,
      sanityLimit: Infinity,
    };
    const limits = { ...defaultLimits, ...userLimits }; // 合并默认值和传入值

    const checkLimit = (limit, name) => {
      // 允许 Infinity 或 非负整数 <= 合理上限 ( 200 for sanity, 10 for upgrades)
      // 将 null 视作 Infinity (因为 Infinity 经 JSON 传输会变 null)
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
      // 将 Infinity 转为 null 发送给前端可能更方便JSON传输，这里后端内部处理
      const safeLimits = {};
      for (const key in limits) {
        safeLimits[key] = limits[key] === Infinity ? null : limits[key];
      }
      return res.status(400).json({
        error:
          "Invalid input: userLimits must be an object with valid non-negative integer limits within range, or Infinity (represented as null or omitted for default).",
      });
    }
    // 在后续逻辑中，确保使用处理过的 limits 对象 (Infinity 被正确识别)

    console.log(
      "后端接收请求 (Validated): target =",
      target,
      "items length =",
      items.length,
      "limits =",
      limits
    );

    // *** 新增：转换 null 回 Infinity ***
    const finalLimits = {};
    for (const key in limits) {
      // limits 是合并了默认值和 userLimits 的对象
      finalLimits[key] = limits[key] === null ? Infinity : limits[key];
    }
    console.log("后端将用于计算的 limits (null 已转 Infinity):", finalLimits); // 添加日志确认

    // --- 2. 服务器端缓存 ---
    // 生成缓存键：需要包含所有影响计算结果的输入
    // 注意：直接 stringify 大数组可能效率不高，但对于几百项还好。
    // 确保 items 数组的顺序是稳定的，或者先排序再 stringify（如果顺序不影响结果的话）。
    // 假设顺序影响结果，直接stringify。
    // 为了避免键过长，可以考虑用哈希，但会增加一点点计算量，这里先用 stringify。
    let cacheKey;
    try {
      const serializableFinalLimits = {};
      for (const key in finalLimits) {
        serializableFinalLimits[key] =
          finalLimits[key] === Infinity ? "__INFINITY__" : finalLimits[key]; // 使用特殊标记
      }
      // items 数组也需要稳定序列化
      cacheKey = `paths:${target}:${JSON.stringify(items)}:${JSON.stringify(
        serializableFinalLimits
      )}`;
      console.log(
        "Generated Cache Key (using finalLimits):",
        cacheKey.substring(0, 50) + "..."
      );
    } catch (e) {
      console.error("Error generating cache key:", e);
      // 如果生成key失败，可以选择不使用缓存继续，或者报错
      return res
        .status(500)
        .json({ error: "Internal server error: Could not generate cache key" });
    }

    const cachedPaths = cache.get(cacheKey);
    if (cachedPaths !== undefined) {
      console.log("Cache hit for key:", cacheKey.substring(0, 30) + "..."); // 只打印部分key
      const duration = 0; // 从缓存获取，耗时认为是0
      return res.json({
        success: true,
        paths: cachedPaths,
        duration,
        cache: "hit", // 标记是缓存命中
      });
    }

    console.log("Cache miss for key:", cacheKey.substring(0, 30) + "...");

    // --- 3. 计算与超时控制 ---
    const calculationPromise = findPaths(target, items, finalLimits); // 使用处理过的 limits
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
      // 如果是 findPaths 内部抛出的其他错误
      throw error; // 重新抛出，让外层catch处理
    }
    const duration = Date.now() - startTime;
    console.log("后端计算完成, 耗时:", duration, "ms");
    // console.log("后端计算结果:", JSON.stringify(paths, null, 2)); // 打印完整结果可能过多，调试时按需开启

    // --- 4. 存储到缓存 ---
    if (paths && paths.length > 0) {
      // 只缓存有效结果
      // 注意：确认 findPaths 返回的 paths 结构是否适合直接缓存
      // 如果 paths 很大，考虑是否真的需要缓存所有路径，或者只缓存最优的几条
      cache.set(cacheKey, paths); // 使用默认 TTL (1小时)
      console.log(
        "Result stored in cache for key:",
        cacheKey.substring(0, 50) + "..."
      );
    } else {
      console.log("Calculation resulted in empty/invalid paths, not caching.");
      // 对于空结果，也可以缓存一个特定的空标记（比如空数组[]），
      // 以避免对肯定无解的参数组合反复计算。
      // cache.set(cacheKey, [], 60 * 10); // 缓存空结果10分钟
    }

    // 向前端发送结果
    res.json({
      success: true,
      paths: paths || [], // 确保总是返回数组
      duration,
      cache: "miss", // 标记是计算得到的
    });
  } catch (error) {
    console.error("Error in /find-paths:", error);
    // 避免暴露过多内部错误细节给前端
    res
      .status(500)
      .json({ error: "Internal server error occurred during path finding." });
  }
});

/*
app.listen(port, () => {
  console.log(`Backend server running at http://47.120.73.125:${port}`);
  //console.log(`Backend server running at http://localhost:${port}`);
  
});*/

// --- Start Server ---
app.listen(port, () => {
  console.log(
    `Backend server running behind proxy, listening internally on port ${port}`
  );
  // console.log(`Accessible externally via http://ark-lmd.top/api`); // 可以加个提示
});
