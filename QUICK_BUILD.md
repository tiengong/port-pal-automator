# 🚀 快速构建独立Web版本

由于package.json为只读，请使用以下命令直接构建：

## 构建命令

### 方式一：使用构建脚本（推荐）
```bash
node scripts/build-standalone.js
```

### 方式二：直接使用Vite
```bash
vite build --config web.config.js
```

## 构建完成后

1. **部署文件夹**: `./dist/`
2. **部署指南**: `./dist/README.md`
3. **部署助手**: `./dist/deploy.sh`

## 快速部署

### Netlify（最简单）
直接拖拽 `dist` 文件夹到 https://netlify.com/drop

### 本地测试
```bash
cd dist
python -m http.server 8080
# 或
npx serve .
```

访问: http://localhost:8080

## 浏览器要求
- Chrome 89+ / Edge 89+ / Opera 75+
- HTTPS连接（localhost除外）
- 启用Web Serial API权限

构建的版本完全独立，无需Lovable平台即可使用！