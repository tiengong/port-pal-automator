# Serial Pilot - Professional Web Serial Debug Tool

Serial Pilot 是一个专业的Web串口调试工具，支持多端口连接、测试用例管理、实时数据监控等功能。基于Web Serial API构建，可在浏览器中直接使用，也可构建为独立的桌面应用。

## ✨ 主要功能

- 🔌 **多端口连接支持** - 同时连接和管理多个串口设备
- 📋 **测试用例管理** - 创建、编辑、执行和管理测试用例
- 📊 **实时数据监控** - 实时显示串口数据收发
- 🔄 **参数替换** - 支持动态参数和变量替换
- 📈 **执行报告** - 详细的测试执行结果和统计
- 🌐 **Web和桌面双模式** - 支持浏览器和桌面应用两种使用方式
- 🎯 **拖拽操作** - 直观的测试用例拖拽排序
- 💾 **工作空间管理** - 保存和切换不同的测试配置

## 🚀 快速开始

### 本地开发运行

1. **安装依赖**
```bash
npm install
```

2. **启动开发服务器**
```bash
npm run dev
```

3. **访问应用**
打开浏览器访问：http://localhost:8080/

### 浏览器要求

- ✅ Chrome 89+ / Edge 89+ / Opera 75+
- ✅ HTTPS连接（生产环境必需，localhost除外）
- ❌ Firefox / Safari（不支持Web Serial API）
- ❌ 移动浏览器

### 设备支持

- USB转串口适配器 (CP210x, FTDI, CH340等)
- Arduino系列开发板
- ESP32/ESP8266开发板
- 其他标准串口设备

## 🌐 部署选项

### 1. Web版本部署

#### 构建独立Web版本
```bash
# 使用构建脚本（推荐）
node scripts/build-standalone.js

# 或直接使用Vite
vite build --config web.config.js
```

#### 快速部署到静态托管
- **Netlify**: 拖拽 `dist` 文件夹到 [netlify.com/drop](https://netlify.com/drop)
- **Vercel**: `cd dist && vercel --prod`
- **GitHub Pages**: 使用提供的GitHub Actions工作流

#### 本地预览构建结果
```bash
cd dist
python -m http.server 8080
# 或
npx serve .
```

### 2. 桌面应用（Tauri）

```bash
# 开发模式
npm run tauri dev

# 构建桌面应用
npm run tauri build
```

## 📁 项目结构

```
src/
├── components/
│   ├── serial/              # 串口相关组件
│   │   ├── hooks/          # 自定义Hooks
│   │   ├── logic/          # 业务逻辑
│   │   └── components/     # UI组件
│   └── ui/                 # 通用UI组件
├── lib/
│   └── serial/             # 串口管理核心
│       ├── transport.ts    # 传输层抽象
│       ├── webSerialTransport.ts   # Web Serial API实现
│       ├── tauriSerialTransport.ts # Tauri串口实现
│       └── serialManager.ts       # 串口管理器
├── hooks/                  # 全局Hooks
├── pages/                  # 页面组件
└── App.tsx                # 主应用入口
```

## 🛠️ 开发指南

### 环境要求
- Node.js 18+
- 现代浏览器（Chrome/Edge 89+）
- 串口设备（用于测试）

### 开发命令

```bash
# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build

# Web专用构建
npm run build:web

# 独立版本构建
npm run build:standalone

# 预览构建结果
npm run preview

# 代码检查
npm run lint
```

### 架构说明

Serial Pilot 采用模块化架构：

- **传输层抽象**: 支持Web Serial API和Tauri两种传输方式
- **状态管理**: 基于React Hooks的状态管理
- **组件化设计**: 高度组件化的UI结构
- **类型安全**: 完整的TypeScript类型支持

## 🔧 配置文件

- `vite.config.ts` - 主配置文件
- `web.config.js` - Web专用构建配置
- `netlify.toml` - Netlify部署配置
- `vercel.json` - Vercel部署配置

## 📖 使用指南

### 连接设备
1. 点击"快速连接"或"连接"按钮
2. 浏览器弹出设备选择对话框
3. 选择你的串口设备并授权访问
4. 设备连接成功后可开始调试

### 创建测试用例
1. 点击"新建测试用例"
2. 添加测试命令和参数
3. 配置验证方法和失败处理策略
4. 保存并执行测试用例

### 管理工作空间
1. 创建不同的工作空间用于不同项目
2. 导入/导出测试用例配置
3. 切换工作空间快速加载不同配置

## 🐛 故障排除

### Web Serial API不可用
1. 确认浏览器版本 (Chrome/Edge 89+)
2. 检查HTTPS连接
3. 启用实验性功能：`chrome://flags/#enable-experimental-web-platform-features`

### 设备连接失败
1. 检查设备驱动程序
2. 确认设备未被其他程序占用
3. 尝试不同的波特率设置

### 构建失败
1. 确认Node.js版本 (18+)
2. 清理依赖：`rm -rf node_modules && npm install`
3. 检查磁盘空间和权限

## 📄 许可证

本项目遵循相应的开源许可证。请查看 `LICENSE` 文件了解详情。

## 🤝 贡献

欢迎提交Issue和Pull Request来改进Serial Pilot！

---

## Lovable Project Information

**URL**: https://lovable.dev/projects/3615223c-acb9-4705-959c-b1ca4d3b38ba

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/3615223c-acb9-4705-959c-b1ca4d3b38ba) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/3615223c-acb9-4705-959c-b1ca4d3b38ba) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Troubleshooting Windows Desktop App

If the Serial Pilot desktop application fails to launch on Windows, follow these troubleshooting steps:

### Quick Checks

**1. Check WebView2 Runtime (Required)**
```powershell
# Check if WebView2 is installed
winget list --id Microsoft.EdgeWebView2Runtime -e
```

If not installed:
```powershell
# Install WebView2 Runtime
winget install Microsoft.EdgeWebView2Runtime
```

**2. Check Visual C++ Redistributable (Required)**
```powershell
# Check installed VC++ versions
Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -like "*Visual C++*" } | Select-Object Name, Version
```

If missing, install from: https://aka.ms/vs/17/release/vc_redist.x64.exe

**3. Unblock Downloaded Executable**
```powershell
# Navigate to where you extracted the app
cd "path\to\Serial Pilot"

# Unblock the executable
Unblock-File .\serial-pilot.exe

# Check if resources folder exists (required)
Test-Path .\resources
```

**4. Check Application Exit Code**
```powershell
# Run app and check exit code
.\serial-pilot.exe
echo "Exit code: $LASTEXITCODE"
```

### Debug Builds

For detailed error information, download the **Console Debug Build** from GitHub Actions artifacts. This version shows detailed error messages in a console window and writes startup errors to `startup-error.txt` in the same directory as the executable.

### Installation Recommendations

- **Preferred**: Use the official installer (.msi or .exe) rather than extracting files manually
- **Manual extraction**: Ensure you extract the entire contents, including the `resources` folder
- **Portable use**: Copy the entire application directory, not just the .exe file

### Common Issues

- **Missing resources folder**: App won't start without the bundled resources
- **WebView2 missing**: Most common cause of silent startup failures  
- **VC++ Redistributable missing**: May cause DLL loading errors
- **Windows Defender/Antivirus**: May block unsigned executables

If none of these steps resolve the issue, please share the contents of `startup-error.txt` (if generated) or the console output from the debug build.
