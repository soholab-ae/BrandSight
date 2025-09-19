#!/usr/bin/env node
import { execSync } from 'child_process';
import { mkdirSync, existsSync, readdirSync, rmSync } from 'fs';
import { performance } from 'perf_hooks';

console.log('🚀 Starting optimized production build process...');
const startTime = performance.now();

// Set production environment
process.env.NODE_ENV = 'production';
process.env.VITE_NODE_ENV = 'production';

// Disable unnecessary npm features for faster builds
process.env.NPM_CONFIG_UPDATE_NOTIFIER = 'false';
process.env.NPM_CONFIG_FUND = 'false';
process.env.NPM_CONFIG_AUDIT = 'false';

// Clean previous builds
console.log('🧹 Cleaning previous build artifacts...');
if (existsSync('./dist')) {
  rmSync('./dist', { recursive: true, force: true });
  console.log('✅ Removed previous dist directory');
}

// Ensure dist directory exists
console.log('📁 Creating build directories...');
mkdirSync('./dist', { recursive: true });
mkdirSync('./dist/public', { recursive: true });
console.log('✅ Created build directories');

try {
  // Build frontend with Vite
  console.log('📦 Building frontend with Vite...');
  const viteStart = performance.now();
  
  execSync('vite build --mode production', { 
    stdio: 'inherit', 
    cwd: '.',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      VITE_NODE_ENV: 'production'
    }
  });
  
  const viteEnd = performance.now();
  console.log(`✅ Frontend build completed in ${Math.round(viteEnd - viteStart)}ms`);

  // Build backend with ESBuild (optimized)
  console.log('🔨 Building backend with ESBuild...');
  const esbuildStart = performance.now();
  
  execSync(`esbuild server/index.ts \\
    --platform=node \\
    --target=node20 \\
    --packages=external \\
    --bundle \\
    --format=esm \\
    --minify \\
    --sourcemap=false \\
    --tree-shaking=true \\
    --outdir=dist \\
    --log-level=warning`, { 
    stdio: 'inherit', 
    cwd: '.' 
  });
  
  const esbuildEnd = performance.now();
  console.log(`✅ Backend build completed in ${Math.round(esbuildEnd - esbuildStart)}ms`);

  // Build verification
  console.log('🔍 Verifying build output...');
  
  const requiredFiles = [
    { path: './dist/index.js', name: 'Server bundle' },
    { path: './dist/public/index.html', name: 'Frontend HTML' }
  ];
  
  let verificationFailed = false;
  
  for (const { path, name } of requiredFiles) {
    if (existsSync(path)) {
      console.log(`  ✅ ${name} exists`);
    } else {
      console.error(`  ❌ ${name} missing`);
      verificationFailed = true;
    }
  }
  
  // Check assets
  const assetsPath = './dist/public/assets';
  if (existsSync(assetsPath)) {
    const assetFiles = readdirSync(assetsPath);
    const jsFiles = assetFiles.filter(f => f.endsWith('.js'));
    const cssFiles = assetFiles.filter(f => f.endsWith('.css'));
    
    console.log(`  ✅ Found ${jsFiles.length} JS files and ${cssFiles.length} CSS files`);
    
    if (jsFiles.length === 0 || cssFiles.length === 0) {
      console.error('  ❌ Missing JS or CSS assets - build may have failed');
      verificationFailed = true;
    }
  } else {
    console.error('  ❌ Assets directory missing');
    verificationFailed = true;
  }
  
  if (verificationFailed) {
    throw new Error('Build verification failed');
  }

  // Calculate build size
  console.log('📊 Build size analysis...');
  try {
    const distSize = execSync('du -sh dist/', { encoding: 'utf8' }).trim().split('\t')[0];
    const assetsSize = execSync('du -sh dist/public/assets/', { encoding: 'utf8' }).trim().split('\t')[0];
    
    console.log(`  📦 Total build size: ${distSize}`);
    console.log(`  🎨 Assets size: ${assetsSize}`);
  } catch (error) {
    console.log('  ℹ️  Could not calculate build size');
  }

  const endTime = performance.now();
  const totalTime = Math.round(endTime - startTime);
  
  console.log(`🎉 Optimized production build completed successfully in ${totalTime}ms!`);
  console.log('📋 Build optimizations applied:');
  console.log('  • Source maps disabled for smaller bundles');
  console.log('  • Backend minification enabled');
  console.log('  • Tree shaking enabled');
  console.log('  • No redundant file copying');
  console.log('  • Production environment variables set');
  
} catch (error) {
  console.error('❌ Production build failed:', error.message);
  process.exit(1);
}