# Requested Stitch Screens

Project: Project Background Analysis
Project ID: 504319949322941960

These files were downloaded with `curl -L` from the hosted Stitch URLs returned by `get_screen`.

| # | Screen | Stitch ID | Local image | Local code |
| --- | --- | --- | --- | --- |
| 1 | 通知生成详情（汉化版） - 津智助理 | 3dcda43d2b9c4ff88c71b889813fb188 | `01-notice-detail-cn.png` | `01-notice-detail-cn.html` |
| 2 | 个人中心（汉化版） - 津智助理 | 1198303f8f714a8bb473b3f66e4e24bd | `02-profile-cn.png` | `02-profile-cn.html` |
| 3 | AI 海报细节编辑器（汉化版） - 津智助理 | 93b470d2f26941e2ba984f3629de09f8 | `03-poster-editor-cn.png` | `03-poster-editor-cn.html` |
| 4 | AI 创意工具箱 - 津智助理 | b588a4bdb406418f824666913b2b7d78 | `04-ai-toolbox.png` | `04-ai-toolbox.html` |
| 5 | AI 创意工具箱（汉化版） - 津智助理 | 376d229bc7514112b1ef56cc1fab8a5d | `05-ai-toolbox-cn.png` | `05-ai-toolbox-cn.html` |
| 6 | 通知生成详情 - 津智助理 | dacde1293dbd4cc295e7a12d6cf60531 | `06-notice-detail.png` | `06-notice-detail.html` |
| 7 | 个人中心 - 津智助理 | cd5bcf49b5a34eb8ad63873128ef2b00 | `07-profile.png` | `07-profile.html` |
| 8 | 试点看板（汉化版） - 津智助理 | 4540d9b5f83442d9a4d9fc0ac090a5a7 | `08-pilot-dashboard-cn.png` | `08-pilot-dashboard-cn.html` |
| 9 | 工单智能详情（汉化版） - 津智助理 | 57837a66cba947259736bd718de71eb3 | `09-ticket-detail-cn.png` | `09-ticket-detail-cn.html` |
| 10 | 试点看板 - 津智助理 | 8bec1196b60f486c829fedca897aafec | `10-pilot-dashboard.png` | `10-pilot-dashboard.html` |
| 11 | 工单预处理中心（汉化版） - 津智助理 | 21a053fe6a514bc99f706a3b2d570b9f | `11-ticket-center-cn.png` | `11-ticket-center-cn.html` |
| 12 | 工单智能详情 - 津智助理 | 4eb2ad8f31fe4a50b2bbe16aae6e824b | `12-ticket-detail.png` | `12-ticket-detail.html` |
| 13 | AI 海报细节编辑器 - 津智助理 | d1c8ac30a0804a22be00762fdcb73185 | `13-poster-editor.png` | `13-poster-editor.html` |
| 14 | 工单预处理中心 - 津智助理 | 36cdc90d619947c9aa05e222d585ccd6 | `14-ticket-center.png` | `14-ticket-center.html` |
| 15 | 津智助理 Logo | 98576803c888479c8e5319786ce59437 | `15-logo.png` | `15-logo.svg` |

## Used In App

- The Logo SVG was copied into `public/jinzhi-logo.svg` and used in the login/sidebar brand.
- The detail/screen patterns were used as references to complete missing secondary flows in the current React app:
  - 工单高级筛选
  - 研判分析详情
  - 热点专题分析报告
  - 工单调度建议详情 link-through

The existing React/Vite framework remains the source of truth; downloaded Stitch HTML is kept only as reference material.
