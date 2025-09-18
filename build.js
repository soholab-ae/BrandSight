#!/usr/bin/env node
import { execSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

console.log('🚀 Starting build process with fallback directory creation...');

// Ensure dist/public directory exists before building
const distPublicPath = './dist/public';
if (!existsSync('./dist')) {
  mkdirSync('./dist', { recursive: true });
  console.log('✅ Created dist directory');
}

if (!existsSync(distPublicPath)) {
  mkdirSync(distPublicPath, { recursive: true });
  console.log('✅ Created dist/public directory');
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

  // Verify build output
  if (existsSync(distPublicPath) && existsSync('./dist/index.js')) {
    console.log('✅ Build verification successful');
    console.log('  - dist/public directory exists');
    console.log('  - dist/index.js exists');
  } else {
    throw new Error('Build verification failed - missing expected files');
  }

  console.log('🎉 Build process completed successfully!');
} catch (error) {
  console.error('❌ Build process failed:', error.message);
  process.exit(1);
}