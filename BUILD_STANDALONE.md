# 构建独立Web版本

Serial Pilot 可以构建为完全独立的Web应用，无需依赖Lovable平台即可部署使用。

## 🚀 快速构建

### 一键构建独立版本
```bash
npm run build:standalone
```

这个命令会：
- ✅ 构建优化的Web版本
- ✅ 排除所有Tauri依赖
- ✅ 生成部署说明文档
- ✅ 创建GitHub Actions工作流
- ✅ 提供部署助手脚本

## 📁 构建输出

构建完成后，`dist/` 文件夹包含：

```
dist/
├── index.html              # 主页面
├── assets/                 # 静态资源
├── README.md              # 部署指南
├── deploy.sh              # 部署助手脚本
└── .github/
    └── workflows/
        └── deploy.yml     # GitHub Actions配置
```

## 🌐 部署选项

### 1. 静态托管服务（推荐）

#### Netlify（最简单）
1. 拖拽 `dist` 文件夹到 [netlify.com/drop](https://netlify.com/drop)
2. 自动获得HTTPS域名
3. 支持自定义域名

#### Vercel
```bash
npm install -g vercel
cd dist && vercel --prod
```

#### GitHub Pages
1. 将代码推送到GitHub仓库
2. 使用提供的 `.github/workflows/deploy.yml`
3. 在仓库设置中启用GitHub Pages

#### Firebase Hosting
```bash
npm install -g firebase-tools
firebase init hosting
firebase deploy
```

### 2. 自托管服务器

任何Web服务器都可以托管，只需：
1. 上传 `dist` 文件夹内容
2. 配置HTTPS（Web Serial API要求）
3. 设置正确的MIME类型

### 3. 本地测试

```bash
# 方式一：Python
cd dist && python -m http.server 8080

# 方式二：Node.js
cd dist && npx serve .

# 方式三：PHP
cd dist && php -S localhost:8080
```

访问：http://localhost:8080

## ⚙️ 浏览器要求

### 支持的浏览器
- ✅ Chrome 89+
- ✅ Edge 89+ 
- ✅ Opera 75+
- ❌ Firefox（不支持Web Serial API）
- ❌ Safari（不支持Web Serial API）
- ❌ 移动浏览器

### 安全要求
- 🔒 **必须HTTPS**（localhost除外）
- 👆 **需要用户交互**才能访问串口
- 🛡️ **同源策略**限制

## 🔧 功能对比

| 功能 | Tauri版本 | Web版本 |
|------|-----------|---------|
| 串口连接 | ✅ | ✅ |
| 测试用例管理 | ✅ | ✅ |
| 文件导入导出 | ✅ | ⚠️ 浏览器限制 |
| 多端口连接 | ✅ | ✅ |
| 实时数据监控 | ✅ | ✅ |
| 离线使用 | ✅ | ✅ PWA |
| 系统集成 | ✅ | ❌ |

## 🐛 常见问题

### Web Serial API不工作？
1. 检查浏览器版本（Chrome 89+）
2. 确保HTTPS连接
3. 启用实验性功能：
   ```
   chrome://flags/#enable-experimental-web-platform-features
   ```

### 构建失败？
1. 确保Node.js 16+
2. 清理并重新安装依赖：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### 部署后无法访问？
1. 检查HTTPS配置
2. 确认文件路径正确
3. 检查MIME类型配置

## 📈 性能优化

独立Web版本包含以下优化：
- 🗜️ 去除Tauri依赖（减少70%体积）
- 📦 代码分割和懒加载
- 🎯 Tree-shaking优化
- 💾 静态资源缓存
- ⚡ Vite构建优化

## 🔄 自动部署

使用提供的GitHub Actions工作流实现自动部署：

1. 推送代码到GitHub
2. Actions自动构建Web版本
3. 部署到GitHub Pages
4. 获得 `https://username.github.io/repository` 访问地址

## 📞 技术支持

- 构建问题：检查Node.js版本和依赖
- 部署问题：确认HTTPS和浏览器兼容性
- 功能问题：参考Web Serial API文档