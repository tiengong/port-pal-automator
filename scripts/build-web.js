#!/usr/bin/env node

// Build script for web version
import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';

console.log('🚀 Building Serial Pilot for Web...\n');

// Clean previous build
if (existsSync('dist')) {
  console.log('🧹 Cleaning previous build...');
  rmSync('dist', { recursive: true, force: true });
}

try {
  // Build with web mode
  console.log('📦 Building application...');
  execSync('vite build --mode web', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  console.log('\n✅ Web build completed successfully!');
  console.log('\n📁 Output directory: ./dist');
  console.log('\n🌐 Deploy the dist folder to your hosting service');
  console.log('\n⚠️  Remember: Web Serial API requires HTTPS in production');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}