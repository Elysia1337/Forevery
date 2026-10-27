# 部署与运维

## 运行环境

- Node.js >= 20（ESM）；
- 无外部服务依赖；文件存储即可跑；
- 数据库版队列需要 Node 22+ 自带的数据库模块；Node 20 用文件版。
- 模型调用、IM、向量库都由适配器提供。

## 数据目录

```js
configure({
  rawDir: './data/raw',
  settlementsDir: './data/settlements',
  quietFile: './data/quiet.json',
  controlFile: './data/control.json',
  recentDir: './data/recent',
});
```

建议每个用户/租户一个独立根目录，不要把不同人的 raw 混在一起。

## 十分钟快速开始

```bash
npm install
npm run quickstart
```

或直接：

```bash
node examples/quickstart.mjs
```

## 健康检查

```js
import { checkHealth } from 'forevery/health';
const h = checkHealth('./data');
if (!h.ok) console.error(h.checks);
```

检查：raw/settlements/recent 可写、pending 数、dead 队列数。

## 备份

- 备份 `data/` 整个目录；
- 写入是 tmp + rename，备份时不要只拷单个 `.tmp`；
- 恢复后先跑 `checkHealth`，再跑索引重建。

## Docker

这是库，不是服务，默认不提供 Docker 镜像。要容器化时：

- 只把 `data/` 挂成 volume；
- 进程入口是你的适配器，不是本包；
- 健康检查调用 `checkHealth`，不要用固定端口。

## 日志

- 记录 session_id、settlement path、revision、idempotency key；
- 不要记录原文全文到外部日志；
- dead 队列要告警。
