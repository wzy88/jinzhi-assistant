# 津智助理技术设计文档

## 1. 技术目标

项目优先满足三个目标：

1. 可快速上线到公网，便于发链接给社区、老师和评委体验。
2. API Key 不暴露在前端，具备基本安全边界。
3. 无模型密钥或模型失败时仍可演示核心功能。

## 2. 技术栈

- 前端：React + TypeScript + Vite
- UI：原生 CSS + lucide-react 图标
- API：Vercel Serverless Functions
- 模型：通义千问 DashScope 兼容 OpenAI Chat Completions 接口
- 兜底：本地规则引擎
- 部署：Vercel
- 域名：`jinzhi.22dhmv.top`

## 3. 目录结构

```text
jinzhi-assistant/
  api/
    analyze.js            # 服务端：工单分析 API，Vercel Serverless Function
    notice.js             # 服务端：通知生成 API，Vercel Serverless Function
  data/
    sample_tickets.csv    # 模拟脱敏样例
  docs/
    PRD.md
    TECH_DESIGN.md
    DEPLOYMENT.md
    COMPETITION_PLAN.md
    opc/                  # OPC 全链路项目材料
  src/
    App.tsx               # 前端主工作台
    App.css               # 产品样式
    index.css             # 全局样式
    main.tsx              # React 入口
  index.html
  package.json
  README.md
```

详细代码与服务端架构见 `docs/opc/CODE_AND_SERVER_ARCHITECTURE.md`。

## 4. 前端模块

### 4.1 App.tsx

负责整体页面和交互状态：

- 工单文本输入
- 示例工单切换
- 工单分析结果展示
- 通知主题输入
- 多版本通知展示
- 演示数据看板
- 工单处理记录
- 人工复核状态
- 工单处理状态
- CSV/TXT 批量导入
- 周报草稿生成
- 通知和周报复制
- 演示登录状态
- 个人资料编辑
- 认证状态模拟
- 用户偏好设置

### 4.2 App.css

负责产品级界面样式：

- 顶部导航
- 工作台布局
- 指标卡片
- 表单控件
- 分析结果面板
- 看板图表
- 移动端响应式布局

### 4.3 index.css

负责全局设计变量：

- 颜色 token
- 字体
- focus 状态
- 基础可访问性样式

## 5. API 设计

### 5.1 POST /api/analyze

请求：

```json
{
  "text": "12号楼消防通道被占用，物业一直没处理。"
}
```

响应：

```json
{
  "category": "消防安全",
  "urgency": "高",
  "emotion": "焦虑 / 愤怒",
  "department": "物业服务中心 + 社区安全专员",
  "summary": "居民反映存在消防通道或用电安全隐患，需要优先核实现场情况并及时处置。",
  "nextSteps": [
    "生成巡查任务并记录楼栋位置",
    "通知物业现场核查并保留照片",
    "必要时联动消防或综合执法部门"
  ],
  "confidence": 0.88
}
```

处理逻辑：

1. 校验请求方法和输入文本。
2. 若存在 `DASHSCOPE_API_KEY`，调用通义千问。
3. 要求模型只返回 JSON。
4. 解析并标准化模型输出。
5. 如果模型不可用，回退到规则引擎。

### 5.2 POST /api/notice

请求：

```json
{
  "prompt": "周末小区消防通道专项清理提醒",
  "analysis": {
    "category": "消防安全"
  }
}
```

响应：

```json
{
  "formal": "正式通知文本",
  "friendly": "居民群通知文本",
  "sms": "短信文本"
}
```

处理逻辑：

1. 校验请求方法和主题文本。
2. 若存在 `DASHSCOPE_API_KEY`，调用通义千问。
3. 要求模型输出正式版、居民群版、短信版。
4. 如果模型不可用，回退到模板生成。

## 6. 模型提示词原则

### 工单分析

系统提示词要求：

- 角色为社区网格员工单预处理助手。
- 只输出 JSON。
- 固定字段。
- `urgency` 只能是高、中、低。
- `confidence` 为 0-1 数字。

### 通知生成

系统提示词要求：

- 角色为社区通知文案助手。
- 只输出 JSON。
- 字段为 `formal`、`friendly`、`sms`。
- 短信不超过 70 字。

## 7. 安全设计

### API Key

- 只存在 Vercel 环境变量。
- 前端不包含 Key。
- 本地演示没有 Key 也能运行。

### 账号体系

- 初赛版本为演示级账号体系。
- 登录态、个人资料和设置保存在浏览器 `localStorage`。
- 不接入短信验证码、真实实名认证和服务端用户库。
- 后续试点版本建议接入 Supabase Auth、Clerk 或自建 Auth 服务。

### 输入限制

- 工单文本最多截取 2000 字。
- 通知主题最多截取 500 字。
- 服务端不执行用户输入内容。

### 输出限制

- 模型输出经过 JSON 解析和字段标准化。
- 紧急程度限定为固定枚举。
- 处理步骤最多 3 条。

## 8. 可用性设计

- 无需登录即可体验演示版。
- 页面核心操作集中在一个工作台。
- 所有主要按钮高度不低于 44px。
- 表单有可见 label。
- 移动端采用单列布局。
- 大模型不可用时用户仍然得到结果。

## 9. 后续技术扩展

### 复赛阶段

- 增加服务端持久化。
- 接入真实账号系统和权限管理。
- 增加工单批量复核。
- 增加真实数据 / 演示数据切换。
- 增加试点反馈表单。
- 如复赛命题需要，增加普通话语音转文字入口。

### 决赛阶段

- 接入 Supabase 保存试点工单。
- 增加反馈表单。
- 增加导出 PDF 试点报告。
- 增加社区/物业账号登录。
- 接入语音转文字和天津方言适配。

### 服务端演进

当前初赛版本使用 Vercel Serverless Functions，服务端代码在 `api/` 目录。这个形态适合快速部署和演示，但不适合长期保存真实试点数据。

试点版建议接入：

- Supabase Postgres：保存脱敏工单、复核结果和反馈。
- Supabase Auth / Clerk：提供简易账号和机构隔离。
- 对象存储：保存导入文件或后续音频文件。

决赛交付版再考虑独立 Node.js 后端、审计日志、模型网关和报表导出服务。

### 语音与天津方言

当前版本不声称已支持天津方言识别。合理路线是：

1. 初赛：聚焦文本工单预处理。
2. 复赛：增加普通话 ASR，转写后由人工确认再分析。
3. 决赛：收集天津本地口语样例，建立高频词表和人工校正闭环。

详细方案见 `docs/opc/VOICE_DIALECT_PLAN.md`。
