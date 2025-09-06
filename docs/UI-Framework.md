# Serial Pilot UI 框架文档

## 应用概览

Serial Pilot 是一个现代化的串口调试工具，提供直观的用户界面用于串口通信测试和调试。

## 实际应用界面结构

### 完整应用布局

```
|-----------------------------------------------------------------------|
| [Terminal] Serial Pilot v1.0.0       [🟢P1] [⚡][🔌] [⚙️Settings]      |
|-----------------------------------------------------------------------|
|                                                                       |
|  ┌──────────────────────┐  ┌────────────────────────────────────────┐ |
|  │    左侧控制面板       │  │             右侧数据终端                │ |
|  │    (384px 固定宽)     │  │            (弹性宽度)                  │ |
|  │                      │  │                                        │ |
|  │ ┌─[Connection]─────┐  │  │  ┌──── 实时数据显示区域 ──────────────┐ │ |
|  │ │[Test Case]      │  │  │  │                                   │ │ |
|  │ └─────────────────┘  │  │  │ [12:34:56] 📤 TX: AT+CGMI         │ │ |
|  │                      │  │  │ [12:34:56] 📥 RX: Quectel        │ │ |
|  │ 📱 串口连接配置:      │  │  │ [12:34:57] 📤 TX: AT+CGMM         │ │ |
|  │ ┌─ 主串口 (P1) ─────┐ │  │  │ [12:34:57] 📥 RX: EC200U-CN      │ │ |
|  │ │ ✅ 已连接 115200  │ │  │  │                                   │ │ |
|  │ │ 8N1 无校验       │ │  │  │ [HEX] [ASCII] [Clear] [Export]    │ │ |
|  │ │ [断开连接]       │ │  │  └───────────────────────────────────┘ │ |
|  │ └─────────────────┘ │  │                                        │ |
|  │                      │  │  ┌──── 快速发送区域 ──────────────────┐ │ |
|  │ [+ 添加第二串口]     │  │  │                                   │ │ |
|  │                      │  │  │ 📝 发送数据: [AT+CGMI____________] │ │ |
|  │ 🧪 测试用例管理:      │  │  │                                   │ │ |
|  │ • AT基础命令测试     │  │  │ [HEX] [Send] [History] [Save]     │ │ |
|  │ • 网络注册测试       │  │  │                                   │ │ |
|  │ • SIM卡操作测试      │  │  └───────────────────────────────────┘ │ |
|  │ [▶️ 执行] [⏸️ 暂停]   │  │                                        │ |
|  │                      │  │                                        │ |
|  └──────────────────────┘  └────────────────────────────────────────┘ |
|                                                                       |
|-----------------------------------------------------------------------|
| 🟢 Web Serial API 支持     活跃连接: P1(115200bps)  [📜History] ©2024 |
|-----------------------------------------------------------------------|
```

### Header Component Layout

```
|-------------------------------------------------------------------|
| [🔧] Serial Debug Tool v1.0          [⚙️] [🌙/☀️] [🔌] Connect  |
|-------------------------------------------------------------------|
```

**Components:**
- `🔧` App Icon
- `Serial Debug Tool v1.0` - Application Title & Version
- `⚙️` Settings Menu
- `🌙/☀️` Theme Toggle (Dark/Light Mode)
- `🔌 Connect` - Connection Button with Status

### Control Panel Layout

```
┌─────────────────────────────────────┐
│           CONTROL PANEL             │
├─────────────────────────────────────┤
│                                     │
│  📊 TEST CASES                      │
│  ├── 📄 AT Basic Commands           │
│  ├── 📄 Network Registration        │
│  ├── 📄 SIM Card Operations         │
│  └── ➕ Add New Test Case           │
│                                     │
│  ⚙️  CONNECTION SETTINGS            │
│  ├── 🔌 Port: COM3                  │
│  ├── ⚡ Baud: 115200                │
│  ├── 📡 Data Bits: 8               │
│  ├── 🛑 Stop Bits: 1               │
│  └── 🔄 Parity: None               │
│                                     │
│  📈 VARIABLES                       │
│  ├── ${IMEI}: 123456789012345       │
│  ├── ${PHONE}: +1234567890          │
│  └── ➕ Add Variable                │
│                                     │
│  🔧 ACTIONS                         │
│  ├── ▶️  Run Test Case              │
│  ├── ⏸️  Pause Execution            │
│  ├── ⏹️  Stop Execution             │
│  └── 🗑️  Clear Terminal             │
│                                     │
└─────────────────────────────────────┘
```

### Terminal Output Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                        TERMINAL OUTPUT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [12:34:56.789] 📤 TX: AT+CGMI                                 │
│  [12:34:56.850] 📥 RX: Quectel                                 │
│  [12:34:56.851] 📥 RX:                                         │
│  [12:34:56.852] 📥 RX: OK                                      │
│                                                                 │
│  [12:34:57.100] 📤 TX: AT+CGMM                                 │
│  [12:34:57.161] 📥 RX: EC200U-CN                               │
│  [12:34:57.162] 📥 RX:                                         │
│  [12:34:57.163] 📥 RX: OK                                      │
│                                                                 │
│  [12:34:57.400] 📤 TX: AT+CGSN                                 │
│  [12:34:57.461] 📥 RX: 123456789012345                         │
│  [12:34:57.462] 📥 RX:                                         │
│  [12:34:57.463] 📥 RX: OK                                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 💬 [Manual Input]                               [Send] │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Test Case Editor Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                       TEST CASE EDITOR                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📝 Test Case: AT Basic Commands                    [💾] [▶️]   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ {                                                           │ │
│  │   "name": "AT Basic Commands",                              │ │
│  │   "description": "Test basic AT commands functionality",    │ │
│  │   "timeout": 5000,                                          │ │
│  │   "commands": [                                             │ │
│  │     {                                                       │ │
│  │       "send": "AT+CGMI",                                    │ │
│  │       "expect": "OK",                                       │ │
│  │       "timeout": 1000                                       │ │
│  │     },                                                      │ │
│  │     {                                                       │ │
│  │       "send": "AT+CGMM",                                    │ │
│  │       "expect": "OK",                                       │ │
│  │       "timeout": 1000                                       │ │
│  │     }                                                       │ │
│  │   ]                                                         │ │
│  │ }                                                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Status Bar Layout

```
|-------------------------------------------------------------------|
| 🟢 Connected | COM3 @ 115200 | TX: 15 | RX: 12 | Status: Ready   |
|-------------------------------------------------------------------|
```

**Status Indicators:**
- `🟢` Connection Status (Green: Connected, Red: Disconnected, Yellow: Connecting)
- `COM3 @ 115200` - Port and Baud Rate
- `TX: 15` - Transmitted Commands Count
- `RX: 12` - Received Responses Count
- `Status: Ready` - Current Operation Status

### Tab Navigation Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [📊 Test Cases] [🔧 Execution] [📝 URC Editor] [⚙️ Settings]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     TAB CONTENT AREA                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Color Scheme

### Light Mode
```
Background:     ████ #ffffff (white)
Foreground:     ████ #1a1a1a (dark gray)
Primary:        ████ #3b82f6 (blue)
Secondary:      ████ #f3f4f6 (light gray)
Success:        ████ #10b981 (green)
Warning:        ████ #f59e0b (amber)
Error:          ████ #ef4444 (red)
```

### Dark Mode
```
Background:     ████ #1e1e1e (dark)
Foreground:     ████ #e1e1e1 (light gray)
Primary:        ████ #0078d4 (VS Code blue)
Secondary:      ████ #252526 (darker gray)
Success:        ████ #4caf50 (green)
Warning:        ████ #ffab00 (amber)
Error:          ████ #e53e3e (red)
```

## Typography

```
Heading 1:      Serial Debug Tool          (24px, bold)
Heading 2:      Test Cases                 (20px, semibold)
Heading 3:      Connection Settings        (16px, semibold)
Body Text:      Regular content            (14px, normal)
Code:           AT+CGMI                    (14px, monospace)
Small:          Status messages            (12px, normal)
```

## Interactive Elements

### Buttons
```
Primary:    [🔌 Connect    ]  (Blue background, white text)
Secondary:  [ ⚙️ Settings  ]  (Gray background, dark text)
Success:    [ ▶️ Run Test  ]  (Green background, white text)
Danger:     [ 🗑️ Delete   ]  (Red background, white text)
```

### Input Fields
```
Text Input:     [Serial port path        ]
Number Input:   [115200                  ]
Dropdown:       [COM3               ▼   ]
Textarea:       [┌─────────────────────┐ ]
                [│ Multi-line content  │ ]
                [└─────────────────────┘ ]
```

### Status Indicators
```
Connected:      🟢 (Green circle)
Disconnected:   🔴 (Red circle)
Connecting:     🟡 (Yellow circle)
Data TX:        📤 (Blue arrow up)
Data RX:        📥 (Green arrow down)
Error:          ❌ (Red X)
Success:        ✅ (Green checkmark)
```

This framework provides a comprehensive view of the Serial Debug Tool's interface structure and visual design system.