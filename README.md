# Serial Pilot - 串口终端与测试工具

Serial Pilot 是一款基于 Tauri + React 的现代化串口终端应用程序，提供双通道串口通信、数据终端功能以及完整的测试用例管理系统。

## 项目特性

### 🚀 核心功能
- **双通道串口通信** - 支持 P1 和 P2 两个串口同时通信
- **实时数据终端** - 实时数据显示与交互终端
- **测试用例管理** - 完整的测试用例创建、执行和管理系统
- **多层级结构** - 支持三级测试用例结构（根用例→子用例→孙用例）
- **AT命令自动补全** - 智能AT命令提示和自动补全功能

### 📊 测试用例系统
- **层级化测试结构** - 支持用例→子用例→命令的三层结构
- **脚本编辑器** - 带语法高亮的复杂测试场景编辑器
- **拖拽功能** - 测试用例组织的拖拽操作
- **执行引擎** - 带实时反馈的测试执行引擎
- **结果记录** - 测试结果记录和导出功能

### 🎯 技术架构
- **前端**: React 18 + TypeScript + Vite
- **桌面框架**: Tauri (Rust-based)
- **UI组件**: shadcn/ui + Tailwind CSS
- **状态管理**: React Context + TanStack Query
- **构建工具**: Vite (支持热模块替换)

## 安装与使用

### Windows 用户

#### 选项1：MSI安装包（推荐）
1. 从 [Releases](https://github.com/your-repo/releases) 下载 `Serial-Pilot-Setup.msi`
2. 双击安装，按向导完成安装
3. 在开始菜单或桌面找到 Serial Pilot 启动

#### 选项2：绿色便携版
1. 从 [Releases](https://github.com/your-repo/releases) 下载 `Serial-Pilot-Portable.exe`
2. 无需安装，直接运行即可使用
3. 适合U盘携带或临时使用

### 开发环境搭建

**前置要求**:
- Node.js 20+ 和 npm
- Rust 稳定版工具链
- Windows 10/11（桌面版）

**安装步骤**:
```sh
# 1. 克隆仓库
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 构建生产版本
npm run build

# 5. 构建桌面应用
npm run tauri build
```

## 最近更新

### 🆕 新增功能 (2025-01-07)
- **多层级子用例优化**: 修复了三级子用例显示重复的问题，现在支持最大3级层级结构
- **AT命令自动补全**: 新增智能AT命令补全功能，包含常用AT指令库
- **默认测试用例**: 新增默认测试用例模板，包含基础连接测试和网络注册测试
- **构建优化**: 支持同时生成MSI安装包和绿色便携版，提供两种安装方式

### 🛠️ 技术改进
- **性能优化**: AT命令自动补全使用Trie树结构，提供毫秒级响应
- **构建配置**: 优化Tauri构建流程，支持Windows 64位MSI和NSIS打包
- **错误处理**: 增强三级子用例添加时的错误提示和层级限制

## 如何使用Lovable编辑代码

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

## Code Architecture Updates

### TestCaseManager Component Refactoring (2024-09-07)

The `TestCaseManager.tsx` component has been modularized to improve maintainability and reduce code duplication while preserving the exact UI appearance and functionality.

#### Changes Made:

1. **State Management Extraction** (`src/components/serial/hooks/useTestCaseState.ts`)
   - Centralized all React state management logic
   - Extracted 24+ useState hooks into a single cohesive hook
   - Added computed properties and utility functions

2. **Execution Logic Extraction** (`src/components/serial/hooks/useTestCaseExecution.ts`)
   - Separated test case execution logic from UI components
   - Implemented retry mechanisms and failure handling
   - Added execution status tracking and callbacks

3. **Drag & Drop Logic Extraction** (`src/components/serial/hooks/useTestCaseDragDrop.ts`)
   - Isolated drag and drop functionality
   - Implemented unified reordering for commands and sub-cases
   - Added drag state management

4. **Utility Functions Extraction** (`src/components/serial/utils/testCaseHelpers.ts`)
   - Consolidated repetitive utility functions
   - Added helper functions for test case operations
   - Implemented search, validation, and statistics functions

5. **UI Component Modularization**
   - Maintained 100% UI consistency with original design
   - Preserved all CSS classes, animations, and responsive behavior
   - Kept existing component structure (TestCaseHeader, TestCaseActions, etc.)

#### Benefits:

- **Reduced Code Duplication**: Eliminated repetitive state update patterns
- **Improved Maintainability**: Each module has a single responsibility
- **Better Testability**: Individual modules can be tested in isolation
- **Enhanced Readability**: Main component is now more focused on UI logic
- **Preserved Functionality**: All existing features work exactly as before

#### Files Created:

- `src/components/serial/hooks/useTestCaseState.ts` - State management hook
- `src/components/serial/hooks/useTestCaseExecution.ts` - Execution logic hook  
- `src/components/serial/hooks/useTestCaseDragDrop.ts` - Drag & drop hook
- `src/components/serial/utils/testCaseHelpers.ts` - Utility functions
- `src/components/serial/TestCaseManagerOptimized.tsx` - Refactored main component

#### Verification:

- ✅ UI layout and styling preserved 100%
- ✅ All existing functionality maintained
- ✅ Component behavior unchanged
- ✅ Responsive design intact
- ✅ TypeScript types compatible
