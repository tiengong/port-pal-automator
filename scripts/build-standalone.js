#!/usr/bin/env node

// Standalone web build script - creates independent web version
import { execSync } from 'child_process';
import { existsSync, rmSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';

console.log('🔧 Building Standalone Web Version of Serial Pilot...\n');

// Clean previous build
if (existsSync('dist')) {
  console.log('🧹 Cleaning previous build...');
  rmSync('dist', { recursive: true, force: true });
}

try {
  // Build with web configuration
  console.log('📦 Building standalone web application...');
  execSync('vite build --config web.config.js', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  // Create deployment README
  const deploymentGuide = `# Serial Pilot - Standalone Web Version

## 🌐 Deployment Ready!

This is a standalone web version of Serial Pilot that works independently of Lovable platform.

### 📋 Requirements
- Modern web browser (Chrome 89+, Edge 89+, or Opera 75+)
- HTTPS connection (required for Web Serial API, except localhost)
- No server-side dependencies needed

### 🚀 Quick Deployment

#### Option 1: Static Hosting Services
Upload the contents of this folder to any of these services:
- **Netlify**: Drag & drop this folder to netlify.com/drop
- **Vercel**: Connect your GitHub repo or use CLI
- **GitHub Pages**: Push to gh-pages branch
- **Firebase Hosting**: Use Firebase CLI

#### Option 2: Local Server
\`\`\`bash
# Python
python -m http.server 8080

# Node.js
npx serve .

# PHP
php -S localhost:8080
\`\`\`

Then open: http://localhost:8080

### ✅ Features Available
- ✅ Web Serial API support
- ✅ Multiple port connections
- ✅ Test case management  
- ✅ Real-time data monitoring
- ✅ All UI functionality
- ✅ Drag & drop test cases
- ✅ Parameter substitution
- ✅ Execution reporting

### ⚠️ Browser Setup
1. Use Chrome 89+, Edge 89+, or Opera 75+
2. Ensure HTTPS connection (automatic on most hosting services)
3. Grant serial port permissions when prompted

### 🔧 Troubleshooting
If Web Serial doesn't work:
- Check browser version (Chrome/Edge 89+ required)
- Verify HTTPS connection
- Try enabling: chrome://flags/#enable-experimental-web-platform-features

### 📱 Mobile Support
Web Serial API is not supported on mobile browsers. This is a desktop web application.

---
Built with ❤️ using React + Vite + Web Serial API
`;

  writeFileSync(path.join('dist', 'README.md'), deploymentGuide);
  
  // Create simple deployment script
  const deployScript = `#!/bin/bash
# Simple deployment script for various platforms

echo "🚀 Serial Pilot - Deployment Helper"
echo ""
echo "Choose deployment method:"
echo "1) Netlify (drag & drop)"
echo "2) Vercel CLI"
echo "3) GitHub Pages"
echo "4) Local server"
echo ""

read -p "Enter choice (1-4): " choice

case $choice in
  1)
    echo "📂 Open https://netlify.com/drop and drag the dist folder"
    ;;
  2)
    echo "🔧 Installing Vercel CLI..."
    npm install -g vercel
    echo "🚀 Deploying to Vercel..."
    cd dist && vercel --prod
    ;;
  3)
    echo "📚 GitHub Pages deployment:"
    echo "1. Push this repo to GitHub"
    echo "2. Go to Settings > Pages"
    echo "3. Select source: GitHub Actions"
    echo "4. Use the provided workflow"
    ;;
  4)
    echo "🏠 Starting local server..."
    cd dist && python -m http.server 8080 || npx serve .
    ;;
  *)
    echo "❌ Invalid choice"
    ;;
esac
`;

  writeFileSync(path.join('dist', 'deploy.sh'), deployScript);
  
  // Make deploy script executable (on Unix systems)
  try {
    execSync('chmod +x dist/deploy.sh', { stdio: 'ignore' });
  } catch (e) {
    // Ignore on Windows
  }
  
  // Create GitHub Actions workflow for automated deployment
  const githubWorkflow = `name: Deploy Serial Pilot to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build for web
        run: npm run build:web
        
      - name: Setup Pages
        uses: actions/configure-pages@v4
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

  // Ensure .github/workflows directory exists in dist
  execSync('mkdir -p dist/.github/workflows', { stdio: 'ignore' });
  writeFileSync(path.join('dist', '.github', 'workflows', 'deploy.yml'), githubWorkflow);
  
  console.log('\n✅ Standalone web build completed successfully!');
  console.log('\n📁 Output: ./dist/');
  console.log('📖 Deployment guide: ./dist/README.md');
  console.log('🚀 Deployment helper: ./dist/deploy.sh');
  console.log('⚙️  GitHub Actions workflow: ./dist/.github/workflows/deploy.yml');
  console.log('\n🌐 Ready for deployment to any static hosting service!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}