# 明日方舟龙门币凑数路径计算器（2.0版本制作中）

这里是《明日方舟》龙门币凑数路径计算器网页，是我学习 React 和 Node.js 的一个简单的练习项目，没什么技术含量。最初想法是看到公招不再消耗龙门币之后，网上似乎没有相关的计算器，所以在亲爱的D老师和G老师的指导下硬造出来的，所以你会看到有很浓烈的AI味，菜鸟求轻喷orz

## 在线使用（网页端移动端都适配）

访问 [龙门币凑数路径计算器](https://ark-lmd.top/) 

## 食用说明

1. 打开计算主页。
2. 在左侧输入当前龙门币数量、目标龙门币数量（范围：0 - 99,999,999，差值限制：-5000 ~ 5000）以及允许升级的干员数量（0 ~ 10）和允许使用的理智数量（0 ~ 200）。
3. 在右侧设置区域调整计算规则（例如禁用某些物品）。
4. 点击“立即计算”按钮，查看生成的路径。
5. 点击“上一路径”和“下一路径”按钮可以切换不同方案。
6. 访问“注意事项”、“数据部分”和“关于”页面可以了解更多信息。

## 本地部署

### 注意事项

安装版本参考
- Node.js (v22.13.0)
- npm (v10.9.2)

并且需要修改./backend/server.js和./src/components/Transmission.js中的部分内容（看注释）

### 安装步骤

```bash
git clone https://github.com/parrotime/Arknights-LMD-Sum-calculator.git
npm install
npm start
```
打开浏览器访问 `http://localhost:3000`


```bash
cd backend
npm install
node server.js
```
后端在 `http://localhost:3002` 运行

## 维护页状态开关

维护页入口：

```text
/#/maintenance
```

前端维护页会请求 Go 后端公开接口：

```text
GET /maintenance-status
```

对应后端代码位置：

```text
go-backend/internal/api/handler.go
go-backend/internal/config/config.go
go-backend/cmd/server/main.go
```

前端页面代码位置：

```text
src/pages/Maintenance.jsx
src/assets/styles/Maintenance.module.css
```

### 本地开发时开启维护状态

在启动 Go 后端前设置环境变量：

```powershell
cd go-backend
$env:PORT="3003"
$env:NODE_ENV="test"
$env:MAINTENANCE_ENABLED="true"
$env:MAINTENANCE_END_AT="2026-05-24T08:00:00+08:00"
$env:MAINTENANCE_MESSAGE="网页维护中..."
$env:MAINTENANCE_SUBTITLE="计算功能暂时无法使用，如有凑龙门币数字的需要，请查看下方表格"
go run ./cmd/server
```

前端开发环境使用 `.env.development` 中的：

```text
VITE_API_URL=http://localhost:3003
```

所以访问 `http://localhost:3000/#/maintenance` 时会读取本地 Go 后端状态。

### 本地开发时关闭维护状态

关闭维护只需要不设置或改为：

```powershell
$env:MAINTENANCE_ENABLED="false"
```

然后重启 Go 后端。

### 生产环境开启维护状态

生产环境推荐修改 systemd 配置：

```text
go-backend/deploy/ark-lmd-go.service
```

把维护相关环境变量改成：

```ini
Environment=MAINTENANCE_ENABLED=true
Environment=MAINTENANCE_END_AT=2026-05-24T08:00:00+08:00
Environment=MAINTENANCE_MESSAGE=网页维护中...
Environment=MAINTENANCE_SUBTITLE=计算功能暂时无法使用，如有凑龙门币数字的需要，请查看下方表格
```

上传/修改服务器上的 service 文件后执行：

```bash
sudo systemctl daemon-reload
sudo systemctl restart ark-lmd-go
sudo systemctl status ark-lmd-go
```

验证接口：

```bash
curl https://ark-lmd.top/maintenance-status
```

如果返回中包含：

```json
{"enabled":true}
```

则维护页会显示倒计时。倒计时使用后端返回的 `serverTime` 和 `endAt` 计算，用户本机时间不准也不会影响显示。

### 生产环境关闭维护状态

把 service 文件改回：

```ini
Environment=MAINTENANCE_ENABLED=false
```

然后重启：

```bash
sudo systemctl daemon-reload
sudo systemctl restart ark-lmd-go
```

再次验证：

```bash
curl https://ark-lmd.top/maintenance-status
```

返回中 `enabled` 为 `false` 时，维护页会显示 `STANDBY / 维护未启用`。

### 注意

`MAINTENANCE_END_AT` 建议使用带时区的 RFC3339 时间，例如：

```text
2026-05-24T08:00:00+08:00
```

如果 `MAINTENANCE_ENABLED=true` 但没有设置 `MAINTENANCE_END_AT`，页面会显示“维护已启用，暂未设置恢复时间”，不会显示倒计时。


## 声明

本项目仅用于学习交流使用。网页所涉及的游戏《明日方舟》相关的名称、数据、素材等均为其各自所有者的资产，仅供识别。

## 参考资料

- [干员升级经验及龙门币消耗成本统计](https://ngabbs.com/read.php?tid=16847042)
- [另一位作者制作的计算器](https://bbs.nga.cn/read.php?tid=21247901)

