# COURT//RISE 一键安装脚本：检查 Node.js → 安装依赖 → 测试 → 打包 → 启动安装程序
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$log = Join-Path $root 'setup-log.txt'
Start-Transcript -Path $log -Force | Out-Null

function Step($n, $text) { Write-Host ""; Write-Host "[$n/5] $text" -ForegroundColor DarkYellow }
function Ok($text) { Write-Host "  ✓ $text" -ForegroundColor Green }
function Warn($text) { Write-Host "  ! $text" -ForegroundColor Yellow }
function Fail($text) {
  Write-Host ""; Write-Host "  ✕ $text" -ForegroundColor Red
  Write-Host "  完整日志：$log" -ForegroundColor Gray
  Stop-Transcript | Out-Null
  Read-Host "按回车键关闭"
  exit 1
}
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}

Write-Host ""
Write-Host "  COURT//RISE 球场生涯 · 一键安装" -ForegroundColor White
Write-Host "  项目目录：$root" -ForegroundColor Gray

# ── 1. Node.js ────────────────────────────────────────────
Step 1 '检查 Node.js'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Warn '未找到 Node.js，尝试用 winget 安装 Node.js LTS…'
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if ($winget) {
    & winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    Refresh-Path
    $node = Get-Command node -ErrorAction SilentlyContinue
  }
  if (-not $node) {
    Start-Process 'https://nodejs.org/zh-cn/download'
    Fail '请先安装 Node.js 20 或 22 LTS（已为你打开下载页），安装后重新运行本脚本。'
  }
}
$ver = (& node -v).Trim()
$major = [int]($ver.TrimStart('v').Split('.')[0])
if ($major -lt 18) { Fail "Node.js 版本过低（$ver），需要 18 以上，推荐 20 / 22 LTS。" }
Ok "Node.js $ver"

# ── 2. 选择下载源 ─────────────────────────────────────────
Step 2 '检测网络'
$useMirror = $false
try {
  Invoke-WebRequest -Uri 'https://registry.npmjs.org/electron' -Method Head -TimeoutSec 6 -UseBasicParsing | Out-Null
  Ok '可以直连 npm 官方源'
} catch {
  $useMirror = $true
  Warn '官方源访问较慢或不可用，本次改用 npmmirror 国内镜像'
}
if ($useMirror) {
  $env:npm_config_registry = 'https://registry.npmmirror.com'
  $env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
  $env:ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/'
  $env:npm_config_better_sqlite3_binary_host_mirror = 'https://registry.npmmirror.com/-/binary/better-sqlite3'
}

# ── 3. 安装依赖 ───────────────────────────────────────────
Step 3 '安装依赖（首次约 3–10 分钟，会下载 Electron）'
& npm.cmd install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) {
  Fail 'npm install 失败。若提示 better-sqlite3 编译错误，请安装 Visual Studio Build Tools（勾选“使用 C++ 的桌面开发”）后重试。'
}
Ok '依赖安装完成'

# ── 4. 测试 ───────────────────────────────────────────────
Step 4 '运行单元测试'
& npm.cmd test
if ($LASTEXITCODE -ne 0) { Warn '有测试未通过（不影响继续打包），详见上方输出与日志。' } else { Ok '全部测试通过' }

# ── 5. 打包 ───────────────────────────────────────────────
Step 5 '构建并打包 Windows 安装程序'
& npm.cmd run dist:win
if ($LASTEXITCODE -ne 0) {
  Warn '标准打包失败，改用不修改 exe 元数据的方式重试（常见于未开启开发者模式的电脑）…'
  & npx.cmd electron-builder --win --x64 -c.win.signAndEditExecutable=false
  if ($LASTEXITCODE -ne 0) { Fail '打包失败，请把 setup-log.txt 发给开发者排查。' }
}
$installer = Get-ChildItem -Path (Join-Path $root 'release') -Recurse -Filter 'CourtRise-Setup-*.exe' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $installer) { Fail '没有找到生成的安装程序。' }
Ok "安装程序：$($installer.FullName)"

Write-Host ""
Write-Host '  即将打开安装向导，按提示完成安装即可。安装后桌面会出现「COURT RISE 球场生涯」快捷方式。' -ForegroundColor White
Stop-Transcript | Out-Null
Start-Process -FilePath $installer.FullName
Read-Host "按回车键关闭此窗口"
