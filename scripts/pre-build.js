#!/usr/bin/env node
import { mkdirSync, existsSync } from 'fs';

console.log('🔧 Pre-build: Ensuring required directories exist...');

// Add environment variable to disable package caching if needed
if (process.env.DISABLE_PACKAGE_CACHE === 'true') {
  console.log('📦 Package caching disabled via environment variable');
  process.env.NPM_CONFIG_CACHE = '/tmp/npm-cache-disabled';
  process.env.npm_config_prefer_offline = 'false';
}

// Ensure all required directories exist before any build process
const requiredDirs = [
  './dist',
  './dist/public',
  './dist/public/assets'
];

requiredDirs.forEach(dir => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`📁 Directory already exists: ${dir}`);
  }
});

console.log('✅ Pre-build directory setup completed');