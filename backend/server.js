import express from "express";
import cors from "cors";
import { findPaths } from "./DPnew.js";

const app = express();
const port = 3001;

app.use(cors()); // 确保这一行存在
app.use(express.json());

// 测试路由
app.get("/", (req, res) => {
  res.send("Hello from the backend!");
});

// 计算路径的路由
app.post("/find-paths", async (req, res) => {
  try {
    const { target, items } = req.body;
    console.log("后端接收目标差值:", target);
    console.log("后端接收物品数:", items.length);
    console.log("前5个物品样本:", JSON.stringify(items.slice(0, 5), null, 2));
    console.log("后端接收请求: target =", target, "items length =", items.length);

    if (typeof target !== "number" || !Array.isArray(items)) {
      return res.status(400).json({
        error: "Invalid input: target must be a number and items must be an array",
      });
    }

<<<<<<< Updated upstream
=======
    console.log("后端接收 userLimits:", userLimits);
>>>>>>> Stashed changes
    const startTime = Date.now();
    const paths = findPaths(target, items);
    const duration = Date.now() - startTime;
    console.log("后端计算结果:", JSON.stringify(paths, null, 2));

    //向前端发送
    res.json({
      success: true,
      paths,
      duration,
    });
  } catch (error) {
    console.error("Error in /find-paths:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
