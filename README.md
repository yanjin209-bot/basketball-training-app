# COURT RISE · 篮球训练与生涯记录

COURT RISE 是一款面向篮球爱好者的个人训练记录应用，包含 Windows 电脑客户端和安卓手机客户端。你可以记录篮球训练、查看个人成长与统计数据，并通过教练功能获取训练建议。

安卓端提供实验性的摄像头投篮统计：固定手机拍摄篮筐和篮球，应用尝试自动识别投篮次数与命中情况。识别在设备本地运行；结果尚未经安卓真机和球场验证，可能漏计或误判。投篮姿势分析尚未接入。

两个客户端复用部分界面和业务逻辑，但各自保存数据，不会自动同步。安卓客户端的功能、构建步骤和限制详见[安卓端说明](android-app/README.md)。

主要功能包括篮球训练计时与记录、生涯等级和任务、能力测试、训练及比赛数据统计、本地和可选在线 AI 教练，以及数据导入、导出和备份。

以下主要介绍 Windows 桌面客户端。

## 功能一览

| 模块 | 内容 |
| --- | --- |
| 生涯大厅 | 原创球员立绘（多层鼠标视差）、OVR、等级 / XP、赛季、今日任务、本周趋势、最近训练、已解锁徽章、快捷入口 |
| 创建球员 | 步骤式 MyPlayer 流程（昵称 / 号码 / 头像 / 身高体重 / 惯用手 / 位置 / 打法 / 能力自评），横向弹性过渡，登场动画 |
| 我的球员 | 收藏级球员卡（3D 倾斜、共享元素展开详情）、资料编辑、历史球员卡对比 |
| 训练中心 | 11 个现实训练项目、目标与步骤、计时器、分组成绩录入、实时命中率与预计 XP、历史记录修改 / 删除 |
| 能力属性 | 六维雷达、15 项标准化测试、球商情境问答（主进程判分）、实战助攻失误比、位置权重 OVR、测试记录 |
| 徽章收藏 | 9 枚原创徽章 × 铜 / 银 / 金 / 传奇四级，进度与达成条件，解锁动画 |
| 生涯数据 | 训练日历、每周趋势、月度统计、命中率趋势、能力变化曲线、3V3 / 5V5 实战记录、个人纪录 |
| AI 教练 | OpenAI / DeepSeek / 任意 OpenAI 兼容接口，近期报告、下周计划、技术问答；无 Key 时自动切换本地规则教练并明确标注 |
| 设置 | 减少动效（跟随系统 / 完整 / 减少）、背景动画开关、AI 配置与连接测试、JSON 导入导出、数据库备份 |

### 成长规则（全部可在 `src/shared/config` 中配置）

- **XP 只来自真实记录**：按训练时长 × 强度、出手 / 命中 / 次数和命中率奖励计算；单次上限 220，**每日训练 XP 上限 400**，避免为刷经验过量训练。
- **修改 / 删除可追溯**：每次写操作后由真实记录整体重算 XP 流水（`xp_transactions` 以 `source + ref_id` 唯一），任务奖励与徽章随之校正，不会重复发放。
- **能力评分只由标准化测试计算**：取每个测试最近一次成绩，按分段曲线换算 0–99；普通训练只给经验。未测试的能力显示自评值并标记“预估”。
- **OVR 按位置加权**：PG / SG / SF / PF / C 各有一套权重（每套之和为 1）。
- **等级称号**：新秀 → 轮换球员（LV6）→ 主力球员（LV12）→ 核心球员（LV20）→ 校园明星（LV30）→ 球场传奇（LV42）。
- **每日任务与恢复日**：每天 3 个任务（同一天结果固定）；连续 3 天训练或前一天负荷（分钟 × RPE）≥ 700 时自动变为恢复日，派发恢复类任务。
- **4 周赛季**：赛季等级、训练次数 / 时长 / 测试目标、能力变化、最佳纪录、获得徽章；赛季结束后进入大厅会弹出结算画面。

---

## 环境要求

- Windows 10 / 11 x64
- [Node.js](https://nodejs.org/) **20 LTS 或 22 LTS**（自带 npm）
- 网络可访问 npm 与 Electron 下载源（国内可用镜像，见下文）

`better-sqlite3` 会优先下载与 Electron 匹配的预编译二进制；如果下载失败才需要本地编译（需安装 Visual Studio Build Tools 的“使用 C++ 的桌面开发”与 Python 3）。

## 一键安装（推荐）

双击项目根目录的 **`install-windows.bat`**：自动检查 / 安装 Node.js（winget）→ 检测网络并按需切换国内镜像 → 安装依赖 → 运行测试 → 打包 → 打开安装向导。过程日志保存在 `setup-log.txt`。

## 手动安装与运行

```powershell
cd court-rise
npm install          # 安装依赖；postinstall 会为 Electron 重建 better-sqlite3
npm run dev          # 开发模式（热更新）
```

国内网络可先设置镜像再安装：

```powershell
npm config set registry https://registry.npmmirror.com
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
npm install
```

## 测试与检查

```powershell
npm run typecheck    # 主进程 + 渲染进程 TypeScript 类型检查
npm test             # 全部单元测试（在 Electron 的 Node 运行时中执行，使用与应用相同的 better-sqlite3 二进制）
npm run test:logic   # 只跑纯逻辑测试（不依赖原生模块）
```

## 打包 Windows 安装程序

```powershell
npm run dist:win     # 输出 release/1.0.0/CourtRise-Setup-1.0.0.exe（NSIS，可选安装目录，创建桌面快捷方式）
npm run dist:dir     # 只生成免安装目录 release/1.0.0/win-unpacked，便于快速验证
```

打包配置见 `electron-builder.yml`：`better-sqlite3` 已加入 `asarUnpack`，打包时会按 Electron ABI 重建原生模块。

## 数据存储

- 数据库：`%APPDATA%\court-rise\court-rise.db`（SQLite，WAL 模式），离线可用。
- 设置页可 **导出 / 导入 JSON**（导入前会二次确认并覆盖）以及 **备份数据库文件**。
- AI API Key 通过 Electron `safeStorage`（Windows DPAPI，与当前 Windows 用户绑定）加密后存入数据库，**不会出现在渲染进程、日志或导出文件中**。

## AI 教练配置

设置 → AI 教练服务：

| 服务商 | API 地址 | 模型示例 |
| --- | --- | --- |
| DeepSeek | `https://api.deepseek.com` | `deepseek-chat` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| 自定义 | 任意 OpenAI 兼容地址（需 https，本地服务可用 `http://localhost`） | — |

AI 只读取由主进程生成的真实训练摘要，系统提示词禁止编造成绩；AI 没有任何写数据库的能力。调用失败时自动回退到本地规则回答，并在消息旁显示失败原因。

---

## 技术架构

Electron · electron-vite · React 18 · TypeScript · Tailwind CSS · Motion for React · Zustand · Recharts · SQLite（better-sqlite3）· electron-builder

```
court-rise/
├─ electron.vite.config.ts      构建配置（生产构建注入严格 CSP）
├─ electron-builder.yml         Windows NSIS 打包配置
├─ build/icon.png               应用图标
├─ src/
│  ├─ shared/                   三端共用：类型、IPC 契约、配置、纯函数规则
│  │  ├─ config/                career（等级/称号/权重/赛季）drills skills badges quests
│  │  ├─ logic/                 progression skills quests season badges streak validation dates
│  │  ├─ api.ts                 IPC 通道与 API 类型
│  │  └─ types.ts
│  ├─ main/                     主进程（拥有全部 Node 权限）
│  │  ├─ index.ts               无边框窗口、单实例、导航 / 新窗口拦截
│  │  ├─ ipc.ts                 白名单 IPC，校验调用来源，错误转可读提示
│  │  ├─ db/                    连接、迁移（user_version）、技能定义同步
│  │  └─ services/              court（业务与重算）coach（AI + 本地规则）backup
│  ├─ preload/                  contextBridge 暴露 window.courtRise（sandbox）
│  └─ renderer/                 React 界面（无 Node 权限）
│     └─ src/
│        ├─ motion/             统一动效系统（见下）
│        ├─ art/                原创 SVG：球员立绘、球馆背景、徽章、教练头像、图标
│        ├─ components/         标题栏、侧边栏、雷达图、赛季总结、表单
│        ├─ pages/              9 个页面
│        └─ store/app.ts        Zustand 状态 + 事件播放队列
└─ tests/                       logic/（纯函数）db/（服务 + 持久化 + AI）
```

### 安全

- `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`；渲染进程只能调用预加载层暴露的固定方法。
- 主进程对每个 IPC 调用校验来源 URL；所有写操作在主进程再次校验（成绩范围、命中 ≤ 出手、不能记录未来日期、出手密度等）。
- 球商问答由主进程按题库判分，渲染进程无法伪造正确率；徽章、任务、XP 只能由真实记录推导。
- 禁止页面跳转与新窗口；外部 https 链接交给系统浏览器。

### 动效系统（`src/renderer/src/motion`）

统一弹簧参数（`springs.ts`）：按压 `stiffness 420 / damping 22 / mass 0.65`（按下时提高刚度以保证零延迟压缩），悬停、页面、滑块、弹出、填充各一套。所有页面只调用以下组件：

`ElasticButton` · `GameMenuItem` · `AnimatedPlayerCard` · `AnimatedCounter` · `XPProgressBar` · `SpringModal` · `BadgeUnlockAnimation` · `PageTransition` · `AnimatedTab` · `HoverTiltCard` · `GameToast` · `AchievementPopup`

- 动画只驱动 `transform` / `opacity`（进度条用 `scaleX`，图表柱用 `scaleY`），避免重排。
- 弹簧从当前值继续运动，连续点击 / 中途打断不会跳变；庆祝动画走队列，按 升级 → 徽章 → 纪录 顺序依次播放。
- `MotionConfig reducedMotion` 跟随 Windows“动画效果”设置，也可在设置中强制开 / 关；背景动画可单独关闭。
