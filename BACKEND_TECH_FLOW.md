# 后端技术栈与流程速览

本文用于快速回顾当前后端的组成、请求链路和核心计算流程。

## 1. 技术栈

- 运行时：Node.js，ESM 模块，`package.json` 中设置了 `"type": "module"`。
- Web 框架：Express 4，主入口为 `backend/server.js`。
- 安全与中间件：
  - `helmet`：设置常见安全响应头。
  - `cors`：控制前端访问来源。
  - `compression`：对较大的响应启用 gzip。
  - `express.json({ limit: "100kb" })`：解析 JSON 请求体并限制大小。
- 限流：`express-rate-limit`，仅在非测试环境对 `/find-paths` 生效。
- 缓存：`node-cache`，服务端内存缓存，默认 TTL 为 1 小时。
- 并行计算：Node `worker_threads`，通过 worker pool 把计算任务从主线程移出。
- 日志：`pino`，开发环境使用 `pino-pretty` 美化输出。
- 配置：`dotenv` 读取 `backend/.env`。
- 进程管理：`ecosystem.config.cjs` 提供 PM2 配置。
- 测试：Node 内置测试框架 `node --test`。

## 2. 主要文件

- `backend/server.js`：Express 服务、限流、缓存、参数校验、worker pool、接口定义。
- `backend/calcWorker.js`：worker 线程入口，接收任务并调用算法。
- `backend/DPnew.js`：核心路径计算算法。
- `backend/DataService.js`：读取并导出 `data/gameItems.json`。
- `data/gameItems.json`：物品基础数据，包括 id、名称、类型、数值、理智消耗等。
- `backend/DPnew.test.js`：算法单元测试。
- `backend/server.test.js`：接口、缓存、超时等后端集成测试。

## 3. 启动与测试

后端目录为 `backend`。

```bash
npm install
npm start
```

开发模式：

```bash
npm run dev
```

测试：

```bash
npm test
```

默认端口为 `3002`，可通过环境变量 `PORT` 修改。

## 4. 请求入口

核心接口：

```http
POST /find-paths
```

前端通过 `src/components/Transmission.ts` 发送请求，请求体大致为：

```json
{
  "target": 100,
  "settings": {
    "allow3Star": true,
    "allow2Star": true,
    "allowMaterial": true
  },
  "userLimits": {
    "upgrade0Limit": 10,
    "upgrade1Limit": 10,
    "upgrade2Limit": 10,
    "sanityLimit": 200
  },
  "rawGoal": 123456
}
```

返回体大致为：

```json
{
  "success": true,
  "paths": [[{ "id": 100, "count": 1 }]],
  "duration": 12,
  "cache": "miss"
}
```

## 5. 后端请求流程

1. Express 接收 `POST /find-paths`。
2. 非测试环境先经过接口限流，每分钟最多 15 次。
3. 校验 `target`：
   - 必须是 number。
   - 范围必须在 `-5000` 到 `5000`。
4. 校验 `settings` 必须是对象。
5. 根据 `settings` 调用 `filterItems()`，从 `classifyData` 中过滤可用物品。
6. 合并并校验 `userLimits`：
   - 干员升级类限制最大为 10。
   - 理智限制最大为 200。
7. 生成缓存 key：
   - `target`
   - `settings`
   - 最终限制参数
8. 如果服务端缓存命中，直接返回缓存路径。
9. 如果未命中，把任务交给 worker pool。
10. worker 调用 `findPaths(target, items, finalLimits)`。
11. 主线程拿到结果后写入缓存并返回给前端。

## 6. Worker Pool 流程

`server.js` 中的 `WorkerPool` 负责管理多个 worker。

- 默认 worker 数：`WORKER_POOL_SIZE`，未配置时为 2。
- 最大排队长度：`MAX_QUEUE`，未配置时为 10。
- 单次计算超时：`CALC_TIMEOUT`，未配置时为 15000ms。

执行过程：

1. 服务启动时创建 worker 列表。
2. 每个请求被包装成 task，放入队列。
3. `_processQueue()` 在有空闲 worker 时派发任务。
4. worker 完成后通过 `postMessage` 返回结果。
5. 如果 worker 超时，主线程会终止该 worker，并新建一个替换。
6. 如果 worker 报错，也会被替换，避免后续任务卡死。

## 7. 核心算法概览

核心函数是 `backend/DPnew.js` 中的：

```js
findPaths(target, items, userLimits)
```

算法目标：找到若干条路径，使每条路径中物品的 `item_value * count` 总和等于 `target`。

关键逻辑：

- `getMaxCountForId()`：限制不同类型物品的最大使用次数。
- `getOptimalGreedyCombo()`：对赤金订单、材料合成等固定面额做贪心组合。
- `getOptimalStageCombo()`：对理智关卡类物品做有界背包 DP。
- `normalizePath()`：规范化路径，把可替代的组合合并成更优组合。
- `savePath()`：校验用户限制、去重、保存更短或更优的路径。
- `finalizeResult()`：最终去重、排序、做多样性筛选，并调整展示顺序。

算法分两阶段：

1. 单步路径阶段：先尝试每种物品单独凑出可用路径。
2. 多步路径阶段：在已有状态上扩展更多组合，最多扩展到 `MAX_STEPS = 6`。

最终返回最多 `TARGET_PATH_COUNT = 10` 条推荐路径。

## 8. 缓存策略

服务端使用 `node-cache`。

- 缓存 key 由 `target + settings + limits` 组成。
- 只缓存非空路径结果。
- TTL 默认为 3600 秒。
- 命中缓存时返回：

```json
{
  "cache": "hit",
  "duration": 0
}
```

前端也有本地缓存，后端缓存和前端缓存互不依赖。

## 9. 错误处理

常见状态码：

- `400`：请求参数非法。
- `429`：请求过于频繁。
- `503`：队列过长或服务繁忙。
- `504`：计算超时。
- `500`：未预期的服务端错误。

后端对计算超时有保护：超时后会返回 `504`，并替换对应 worker。

## 10. 维护注意点

- 修改物品类型或数据字段时，要同时检查：
  - `data/gameItems.json`
  - `backend/server.js` 的 `filterItems()`
  - `backend/DPnew.js` 的类型判断和限制逻辑
  - 前端 `settings` 字段
- 修改用户限制时，要同时检查前端 `buildLimits()` 和后端 `userLimits` 校验。
- 修改算法返回结构时，要同步更新前端 `PathRenderer` 和相关测试。
- 后端测试当前主要覆盖算法、接口校验、缓存和超时，改动核心算法后建议至少运行 `cd backend && npm test`。
