#!/usr/bin/env node
import { execSync } from 'child_process';
import { mkdirSync, existsSync, readdirSync } from 'fs';
import { dirname } from 'path';

console.log('🚀 Starting build process with fallback directory creation...');

// Add environment variable to disable package caching if needed
if (process.env.DISABLE_PACKAGE_CACHE === 'true') {
  console.log('📦 Package caching disabled via environment variable');
  process.env.NPM_CONFIG_CACHE = '/tmp/npm-cache-disabled';
  process.env.npm_config_prefer_offline = 'false';
}

// Ensure all required directories exist before building
const distPath = './dist';
const distPublicPath = './dist/public';
const distAssetsPath = './dist/public/assets';

console.log('📁 Ensuring build directories exist...');

if (!existsSync(distPath)) {
  mkdirSync(distPath, { recursive: true });
  console.log('✅ Created dist directory');
}

if (!existsSync(distPublicPath)) {
  mkdirSync(distPublicPath, { recursive: true });
  console.log('✅ Created dist/public directory');
}

if (!existsSync(distAssetsPath)) {
  mkdirSync(distAssetsPath, { recursive: true });
  console.log('✅ Created dist/public/assets directory');
}

try {
  // Run Vite build
  console.log('📦 Running Vite build...');
  execSync('vite build', { stdio: 'inherit', cwd: '.' });
  console.log('✅ Vite build completed');

  // Run esbuild for server
  console.log('🔨 Building server...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit', cwd: '.' });
  console.log('✅ Server build completed');

  // Comprehensive build verification
  console.log('🔍 Verifying build output...');
  
  const requiredPaths = [
    { path: distPath, name: 'dist directory' },
    { path: distPublicPath, name: 'dist/public directory' },
    { path: './dist/index.js', name: 'server bundle (dist/index.js)' }
  ];
  
  let verificationFailed = false;
  
  for (const { path, name } of requiredPaths) {
    if (existsSync(path)) {
      console.log(`  ✅ ${name} exists`);
    } else {
      console.error(`  ❌ ${name} missing`);
      verificationFailed = true;
    }
  }
  
  // Check critical frontend files
  const criticalFiles = [
    { path: `${distPublicPath}/index.html`, name: 'index.html' }
  ];
  
  for (const { path, name } of criticalFiles) {
    if (existsSync(path)) {
      console.log(`  ✅ ${name} exists`);
    } else {
      console.error(`  ❌ ${name} missing`);
      verificationFailed = true;
    }
  }
  
  // Check if assets directory has content (indicates successful Vite build)
  if (existsSync(distAssetsPath)) {
    const assetFiles = readdirSync(distAssetsPath).filter(f => f.endsWith('.js') || f.endsWith('.css'));
    console.log(`  ✅ Assets directory contains ${assetFiles.length} JS/CSS files`);
    if (assetFiles.length === 0) {
      console.error('  ❌ No JS/CSS assets found - Vite build may have failed');
      verificationFailed = true;
    }
  } else {
    console.error('  ❌ Assets directory missing');
    verificationFailed = true;
  }
  
  if (verificationFailed) {
    throw new Error('Build verification failed - one or more required files/directories are missing');
  }

  console.log('🎉 Build process completed successfully!');
} catch (error) {
  console.error('❌ Build process failed:', error.message);
  process.exit(1);
}