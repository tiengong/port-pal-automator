# 🖥️ 本地开发指南

通过本地开发服务器在 http://localhost:8080/ 使用Serial Pilot工具。

## 🚀 快速启动

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 访问应用
打开浏览器访问：**http://localhost:8080/**

## ✅ 功能确认

启动后你将获得：
- ✅ 完整的Web Serial API支持
- ✅ 实时热重载开发体验  
- ✅ 所有串口调试功能
- ✅ 测试用例管理
- ✅ 双端口连接支持

## 🔧 浏览器设置

### Chrome/Edge (推荐)
1. 使用 Chrome 89+ 或 Edge 89+
2. 访问 http://localhost:8080/
3. 点击"连接"按钮时会提示选择串口设备
4. 选择你的串口设备并授权

### 启用实验性功能（如果需要）
如果Web Serial API不工作，启用实验性功能：
1. 访问：`chrome://flags/#enable-experimental-web-platform-features`
2. 设置为"Enabled"
3. 重启浏览器

## 📱 支持的设备

### ✅ 支持的串口设备
- USB转串口适配器 (CP210x, FTDI, CH340等)
- Arduino系列开发板
- ESP32/ESP8266开发板  
- 其他标准串口设备

### ⚠️ 注意事项
- 需要现代浏览器支持Web Serial API
- 某些虚拟串口可能不被识别
- 第一次连接需要用户手动授权

## 🛠️ 开发模式特性

本地开发服务器包含：
- 🔥 **热重载** - 代码修改立即生效
- 🐛 **开发调试** - 完整的DevTools支持
- 📊 **性能监控** - Vite开发服务器优化
- 🔍 **错误提示** - 详细的错误信息

## 🔄 其他命令

### 构建生产版本
```bash
npm run build
```

### 预览生产构建
```bash
npm run preview
```

### Web专用构建
```bash
npm run build:web
# 或使用web配置
vite build --config web.config.js
```

## 📂 项目结构

```
src/
├── components/serial/    # 串口相关组件
├── lib/serial/          # 串口管理逻辑
├── hooks/               # React Hooks
├── pages/               # 页面组件
└── App.tsx             # 主应用
```

## 🐛 常见问题

### Q: 端口8080被占用？
A: 修改 vite.config.ts 中的端口号，或杀死占用进程

### Q: Web Serial API不可用？
A: 确认使用Chrome/Edge 89+，并启用实验性功能

### Q: 无法检测到串口设备？
A: 检查设备驱动，确保设备已正确连接

### Q: 热重载不工作？
A: 重启开发服务器：Ctrl+C 然后重新 npm run dev

## 🎯 下一步

1. **连接设备**: 插入串口设备并在浏览器中授权访问
2. **创建测试用例**: 使用界面创建和管理测试用例  
3. **执行调试**: 发送命令并监控返回数据
4. **导出结果**: 保存测试结果和配置

现在你可以完全在本地使用Serial Pilot进行串口调试了！🎉