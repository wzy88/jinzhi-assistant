# 津智助理

面向社区网格员的 AI 工单预处理与通知生成网页。项目为 AIGC 应用创新大赛初赛/复赛演示准备，支持部署后绑定 `jinzhi.22dhmv.top`。

## 本地运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm run lint
npm run build
npm run test:e2e
```

## 功能

- 居民诉求分类：类别、紧急程度、情绪、建议部门
- 通知生成：正式版、居民群版、短信版
- 处理记录：状态流转、人工复核、准确率统计
- 批量导入：支持 `.csv` / `.txt` 样例工单
- 周报生成：基于当前记录生成社区工单周报草稿
- 个人中心：演示登录、资料编辑、认证状态、体验设置
- 试点看板：工单数、高优先级、复核准确率、高频问题
- Vercel API：`/api/analyze` 和 `/api/notice`

前端会优先调用 Vercel API；本地开发或 API 不可用时自动退回浏览器内规则引擎，保证演示不断流。

## OPC 项目包

本项目按 OPC 参赛要求补充了从立项到交付使用的完整项目材料：

- [OPC 项目包总览](./docs/opc/README.md)
- [项目立项书](./docs/opc/OPC_PROJECT_BRIEF.md)
- [用户研究计划](./docs/opc/USER_RESEARCH.md)
- [需求规格说明](./docs/opc/REQUIREMENTS.md)
- [90 天路线图](./docs/opc/ROADMAP_90_DAYS.md)
- [设计规格](./docs/opc/DESIGN_SPEC.md)
- [交互流程](./docs/opc/INTERACTION_FLOW.md)
- [测试计划](./docs/opc/TEST_PLAN.md)
- [社区交付手册](./docs/opc/DELIVERY_PLAYBOOK.md)
- [商业模式](./docs/opc/BUSINESS_MODEL.md)
- [OPC 工作流复盘](./docs/opc/OPC_WORKFLOW_REVIEW.md)

样例数据位于 [data/sample_tickets.csv](./data/sample_tickets.csv)，当前为 30 条模拟脱敏样例，用于演示导入、人工复核和准确率评测流程。

## 项目文档

- [PRD](./docs/PRD.md)
- [技术设计文档](./docs/TECH_DESIGN.md)
- [UI/UX 设计讨论稿](./docs/UI_UX_DESIGN.md)
- [部署说明](./docs/DEPLOYMENT.md)
- [比赛执行计划](./docs/COMPETITION_PLAN.md)

## 大模型配置

不配置密钥时，接口会自动使用本地规则引擎，方便演示。

本地开发可在 `.env.local` 中配置 DeepSeek：

```bash
MODEL_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的 DeepSeek Key
DEEPSEEK_MODEL=deepseek-chat
```

部署到 Vercel 后也需要配置同名环境变量。

如需切回阿里云百炼 DashScope，可配置：

```bash
MODEL_PROVIDER=dashscope
DASHSCOPE_API_KEY=你的通义千问 DashScope Key
DASHSCOPE_MODEL=qwen-plus
```

## 域名建议

建议使用子域名：

```text
jinzhi.22dhmv.top
```

在 DNSPod 添加 CNAME：

```text
主机记录：jinzhi
记录类型：CNAME
记录值：Vercel 提供的域名
```
