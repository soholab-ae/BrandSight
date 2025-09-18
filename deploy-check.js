#!/usr/bin/env node
/**
 * Deployment Build Verification Script
 * 
 * This script verifies that the build process completed successfully
 * and all required files are in place for deployment.
 * 
 * Usage: node deploy-check.js
 * Exit code 0: Success
 * Exit code 1: Build verification failed
 */
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

console.log('🔍 Verifying deployment build...');

const requiredPaths = [
  { path: 'dist', type: 'directory', critical: true },
  { path: 'dist/public', type: 'directory', critical: true },
  { path: 'dist/index.js', type: 'file', critical: true },
  { path: 'dist/public/index.html', type: 'file', critical: true },
  { path: 'dist/public/assets', type: 'directory', critical: true },
];

let allPassed = true;
const warnings = [];
const errors = [];

// Check each required path
for (const { path, type, critical } of requiredPaths) {
  if (!existsSync(path)) {
    const message = `❌ Missing ${type}: ${path}`;
    if (critical) {
      errors.push(message);
      allPassed = false;
    } else {
      warnings.push(message);
    }
    console.log(message);
  } else {
    const stat = statSync(path);
    const isCorrectType = type === 'directory' ? stat.isDirectory() : stat.isFile();
    if (isCorrectType) {
      console.log(`✅ Found ${type}: ${path}`);
      
      // Additional checks for specific paths
      if (path === 'dist/public/assets') {
        try {
          const assets = readdirSync(path);
          console.log(`  📦 Assets found: ${assets.length} files`);
          if (assets.length === 0) {
            warnings.push('⚠️  Assets directory is empty');
          }
        } catch (e) {
          warnings.push('⚠️  Could not read assets directory');
        }
      }
    } else {
      const message = `❌ Wrong type for ${path}: expected ${type}`;
      errors.push(message);
      allPassed = false;
      console.log(message);
    }
  }
}

// Display summary
console.log('\n📊 Build Verification Summary:');
console.log(`✅ Passed: ${requiredPaths.length - errors.length}/${requiredPaths.length} checks`);

if (warnings.length > 0) {
  console.log(`⚠️  Warnings: ${warnings.length}`);
  warnings.forEach(w => console.log(`  ${w}`));
}

if (errors.length > 0) {
  console.log(`❌ Errors: ${errors.length}`);
  errors.forEach(e => console.log(`  ${e}`));
  
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Run "npm run build" and check for errors');
  console.log('2. Verify Node.js version supports import.meta.dirname');
  console.log('3. Check if build process has proper write permissions');
  console.log('4. Ensure working directory is project root during build');
  
  process.exit(1);
}

console.log('\n🎉 Build verification successful! Deployment ready.');
process.exit(0);