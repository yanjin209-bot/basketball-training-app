# COURT RISE · 安卓客户端

一款面向篮球爱好者的个人训练与生涯记录应用。用户可以记录训练、查看个人成长和统计数据，并通过摄像头实验性地统计投篮。项目处于开发阶段。

## 功能

- **训练中心**：投篮、控球、体能等训练项目，支持计时、记录成绩和查看历史。
- **生涯成长**：根据训练记录计算经验值，查看等级、任务、徽章和赛季进度。
- **能力测试与统计**：记录标准化测试，查看能力评分、训练趋势及比赛数据。
- **教练**：提供本地规则建议，也可自行配置 HTTPS 在线 AI 服务。
- **摄像头投篮统计（实验）**：识别单个篮筐附近的篮球，估算出手、命中和命中率，结束后写入训练记录。
- **数据管理**：支持 JSON 导入、导出和数据库备份；数据存储在设备本地。

**投篮姿势分析尚未实现。** 摄像头统计也尚未经安卓真机和球场验证；遮挡、反弹、投篮未经过篮筐附近、多人多球或手机移动都可能造成误判和漏计。训练记录可在历史页面修改或删除。自动统计使用默认疲劳度 5，并在记录中注明。

## 使用摄像头训练

在训练中心选择「摄像头自动识别投篮」，选择训练项目，授权摄像头，然后固定手机并让一个篮筐及附近篮球清晰入画。点击结束后，已识别到的投篮会保存为训练记录；没有识别到投篮时不会生成记录。模型在设备本地运行，视频不会上传。

## 技术架构

- Android 原生 Activity + WebView，最低 Android 7.0（API 24）。
- React、TypeScript、Vite 和 Tailwind CSS 构建界面。
- SQL.js 和 WebView 本机存储保存数据；Android Keystore 用于在线教练密钥。
- ONNX Runtime Web 运行篮球、篮筐检测模型，并以轨迹规则估算投篮结果。
- 安卓客户端复用仓库根目录 `src/renderer/src`、`src/shared` 和 `src/main` 中的部分界面及业务逻辑。

## 从源码构建

本目录不能单独构建：请保留整个 `court-rise` 仓库及其目录结构。需要 Node.js、pnpm、JDK 17、Android SDK Platform 35 和 Build Tools 35.0.0。按 Android SDK 提示自行阅读并接受所需许可，配置 `ANDROID_HOME` 或 Android Studio 的 SDK 路径。

从仓库根目录执行：

```bash
cd android-app
pnpm install --frozen-lockfile
pnpm build
mkdir -p app/src/main/assets
cp -R original-preview/. app/src/main/assets/
./gradlew assembleDebug
```

Windows 使用等效的文件复制命令和 `gradlew.bat assembleDebug`。输出位于 `android-app/app/build/outputs/apk/debug/app-debug.apk`。这是调试包，并非正式签名的发布版。项目内的 `安装安卓构建工具.command` 使用开发机临时路径，不能作为通用安装脚本。

## 目录结构

```text
court-rise/
├── src/                       # 安卓端复用的界面和业务逻辑
└── android-app/
    ├── mobile-src/            # 移动端入口、适配、摄像头识别及模型
    ├── app/src/main/java/     # Android WebView 和原生桥接
    ├── app/src/main/assets/   # 构建时复制的前端资源
    ├── tests/                 # 现有移动端测试
    └── gradlew                # Gradle Wrapper
```

## 数据与测试状态

卸载应用或清除应用数据会删除本机数据；请定期导出 JSON。导入会覆盖当前本机数据。浏览器预览、安卓应用和桌面版的数据不会自动合并。摄像头、文件选择、密钥存储、网络和完整操作流程仍需在真实安卓设备上验证；识别准确率和设备性能尚未测定。

## 模型与许可

篮球与篮筐检测模型来自 [Basketball-Shot-Detection](https://github.com/josephattalla/Basketball-Shot-Detection)，转换为 ONNX 后随应用提供；上游许可证位于 `mobile-src/public/BASKETBALL-MODEL-LICENSE.txt`。项目及其他依赖的许可、模型权重和训练数据的使用条件应在公开发布前分别核实；当前仓库尚未声明整体开源许可证。
