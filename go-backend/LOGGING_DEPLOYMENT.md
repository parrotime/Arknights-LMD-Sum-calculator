# Go 后端日志与部署方案

## 生产方案

2.0 版本后端使用 Go 二进制 + systemd 管理进程，不再使用 PM2 管理后端服务。Node 只用于前端开发和构建。

生产环境日志目录：

```text
/var/log/ark-lmd/
```

日志文件：

```text
/var/log/ark-lmd/backend-app.log
/var/log/ark-lmd/backend-error.log
/var/log/ark-lmd/calc-events.log
```

## 日志工作流程

1. Nginx 接收公网请求并转发到 Go 后端。
2. Go 的访问日志中间件生成 `request_id`，并记录 HTTP 请求摘要。
3. `/find-paths` 解析请求，读取用户输入、计算配置、限制条件。
4. 命中缓存时直接写入一次业务统计日志。
5. 未命中缓存时进入队列、并发控制和 DP 计算。
6. 成功、超时、队列满、参数错误等结果都会写入对应日志。
7. logrotate 定期轮转 `/var/log/ark-lmd/*.log`，避免日志无限增长。

## 日志口径

`backend-app.log` 记录服务运行与访问日志：

- 服务启动、关闭
- HTTP 请求：`request_id`、IP、method、path、status、耗时、user agent
- 计算请求摘要：目标龙门币值、龙门币差值、模式、参与物品数量、限制条件
- 计算完成：目标龙门币值、龙门币差值、路径数量、耗时、缓存状态

`backend-error.log` 记录故障与保护事件：

- 数据加载失败
- 服务启动失败
- shutdown 失败
- 队列满
- 计算超时
- 计算异常
- 限流触发
- panic recovery

`calc-events.log` 是后续统计用户计算行为的专用 JSONL 文件，每次 `/find-paths` 请求会记录一行。

核心字段：

- `request_id`：请求 ID，用于串联三类日志
- `ip`：用户 IP
- `target_lmd`：用户输入的目标龙门币值，也就是前端传入的 `rawGoal`
- `has_target_lmd`：是否成功解析到目标龙门币值
- `current_lmd`：用户当前龙门币值，计算方式为 `target_lmd - lmd_diff`
- `has_current_lmd`：是否成功计算出用户当前龙门币值
- `lmd_diff`：龙门币差值，也就是 `目标龙门币 - 当前龙门币`
- `target`：兼容旧命名，当前等同于 `lmd_diff`
- `ip_hash`：可选 IP 哈希值，默认关闭；开启后用于后续匿名聚合分析
- `calc_mode`：计算模式，默认 `fast`
- `cache`：`hit` / `miss` / 空字符串
- `duration_ms`：本次请求在 Go 后端内的耗时
- `paths_count`：返回路径数量
- `status`：`success` / `bad_request` / `queue_full` / `timeout` / `error`
- `error_type`：错误分类

示例：

```json
{"time":"2026-05-20T21:30:12.123+08:00","level":"INFO","msg":"calc_finished","event":"calc_finished","request_id":"ab12cd34ef56","ip":"1.2.3.4","ip_hash":"6f1b8f1b6b5e84e2","target_lmd":2500,"has_target_lmd":true,"current_lmd":1000,"has_current_lmd":true,"lmd_diff":1500,"target":1500,"calc_mode":"fast","cache":"miss","duration_ms":183,"paths_count":10,"status":"success","error_type":""}
```

## 关键环境变量

```text
APP_ENV=production
LOG_DIR=/var/log/ark-lmd
LOG_JSON=true
LOG_TO_STDOUT=false
LOG_LEVEL=info
TRUST_PROXY=true
```

可选 IP 哈希：

```text
LOG_IP_HASH=false
LOG_IP_HASH_SALT=<一段随机字符串>
```

`LOG_IP_HASH=true` 时，日志会额外写入 `ip_hash`，但不会移除原始 `ip` 字段。默认关闭，避免增加不必要字段；即使开启，单次 SHA-256 哈希开销也远小于一次 DP 计算。

本地开发默认写入：

```text
go-backend/logs/
```

生产环境默认写入：

```text
/var/log/ark-lmd/
```

## systemd 示例

示例文件：

```text
go-backend/deploy/ark-lmd-go.service
```

部署时需要根据服务器真实目录调整：

- `WorkingDirectory`
- `ExecStart`
- `DATA_FILE`
- `ADMIN_TOKEN`

## logrotate 示例

示例文件：

```text
go-backend/deploy/ark-lmd-logrotate
```

建议部署到：

```text
/etc/logrotate.d/ark-lmd
```

默认策略是每天轮转、保留 30 份、压缩旧日志，避免日志文件再次增长到数百 MB。
