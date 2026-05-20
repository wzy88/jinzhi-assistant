# 津智助理部署说明

## 1. 推荐域名

使用子域名：

```text
jinzhi.22dhmv.top
```

原因：

- 主域名 `22dhmv.top` 可保留给个人主页或项目合集。
- 子域名便于后续扩展其他比赛项目。
- 对外传播更清晰。

## 2. 本地运行

```bash
npm install
npm run dev
```

本地访问：

```text
http://127.0.0.1:5173/
```

## 3. 本地构建检查

```bash
npm run lint
npm run build
```

两条命令都通过后再部署。

## 4. Vercel 部署

### 4.1 创建项目

1. 将项目上传到 GitHub。
2. 在 Vercel 新建项目。
3. 选择仓库 `jinzhi-assistant`。
4. Framework Preset 选择 Vite。

### 4.2 构建配置

```text
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 4.3 环境变量

可选。没有环境变量也能使用本地规则引擎演示。

```text
DASHSCOPE_API_KEY=你的 DashScope Key
DASHSCOPE_MODEL=qwen-plus
```

## 5. 绑定域名

### 5.1 Vercel 添加域名

在 Vercel 项目中添加：

```text
jinzhi.22dhmv.top
```

Vercel 会给出一个 CNAME 目标，通常类似：

```text
cname.vercel-dns.com
```

或项目专属域名。

### 5.2 DNSPod 添加解析

在 DNSPod / 腾讯云 DNS 控制台添加：

```text
主机记录：jinzhi
记录类型：CNAME
记录值：Vercel 给出的 CNAME
线路类型：默认
TTL：600
```

等待 DNS 生效后访问：

```text
https://jinzhi.22dhmv.top
```

## 6. 发布前检查清单

- 页面标题为“津智助理 - 社区网格 AI 工作台”
- 首页可以打开
- 顶部账号区可以退出并重新演示登录
- 个人资料保存后显示“已保存”
- 点击“示例 2”后，工单分析能变为环境卫生
- 点击“智能分析并入库”后，处理记录增加
- 点击“判断正确”后，复核准确率更新
- 点击“生成通知”后，通知内容正常刷新
- 点击“复制周报”后，可复制周报草稿
- 手机浏览无横向滚动
- API Key 没有出现在前端代码中
- Vercel 环境变量已配置或确认使用规则引擎兜底

## 7. 比赛演示建议

现场演示流程：

1. 打开 `https://jinzhi.22dhmv.top`。
2. 输入一条消防通道占用诉求。
3. 点击“智能分析”。
4. 展示高优先级、建议部门、处理步骤。
5. 输入通知主题。
6. 展示正式版、居民群版、短信版。
7. 切到看板，展示试点数据和后续证据链。
