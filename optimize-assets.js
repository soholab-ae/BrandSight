#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

console.log('🎨 Asset Optimization Tool');
console.log('==========================\n');

// Function to format file sizes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Function to create compressed versions of assets
async function compressAssets(assetsPath) {
  console.log(`📦 Creating compressed versions of assets...`);
  
  try {
    const files = readdirSync(assetsPath);
    let totalOriginal = 0;
    let totalCompressed = 0;
    let filesProcessed = 0;

    for (const file of files) {
      const filePath = join(assetsPath, file);
      const ext = extname(file);
      
      // Only compress text-based assets
      if (['.js', '.css', '.html', '.json', '.svg'].includes(ext)) {
        const content = readFileSync(filePath);
        const originalSize = content.length;
        
        try {
          const gzippedContent = await gzipAsync(content);
          const compressedSize = gzippedContent.length;
          
          // Only create .gz file if it saves significant space (>10% reduction)
          if (compressedSize < originalSize * 0.9) {
            writeFileSync(filePath + '.gz', gzippedContent);
            
            totalOriginal += originalSize;
            totalCompressed += compressedSize;
            filesProcessed++;
            
            const savings = Math.round((1 - compressedSize/originalSize) * 100);
            console.log(`  ✅ ${file.padEnd(30)} ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${savings}% smaller)`);
          }
        } catch (error) {
          console.log(`  ❌ Failed to compress ${file}`);
        }
      }
    }

    if (filesProcessed > 0) {
      const totalSavings = Math.round((1 - totalCompressed/totalOriginal) * 100);
      console.log(`\n📊 Compression Summary:`);
      console.log(`   Files processed: ${filesProcessed}`);
      console.log(`   Original size: ${formatBytes(totalOriginal)}`);
      console.log(`   Compressed size: ${formatBytes(totalCompressed)}`);
      console.log(`   Total savings: ${totalSavings}%`);
    } else {
      console.log('ℹ️  No assets needed compression or savings were minimal');
    }

  } catch (error) {
    console.error('❌ Error processing assets:', error.message);
  }
}

// Function to analyze and suggest optimizations
function analyzeBundleStructure(assetsPath) {
  console.log('🔍 Analyzing bundle structure...');
  
  try {
    const files = readdirSync(assetsPath);
    const jsFiles = files.filter(f => f.endsWith('.js') && !f.endsWith('.map'));
    const cssFiles = files.filter(f => f.endsWith('.css'));
    
    console.log(`\n📈 Bundle Structure:`);
    console.log(`   JavaScript files: ${jsFiles.length}`);
    console.log(`   CSS files: ${cssFiles.length}`);
    
    // Analyze JS files
    if (jsFiles.length > 0) {
      console.log(`\n🔧 JavaScript Analysis:`);
      const jsAnalysis = jsFiles.map(file => {
        const filePath = join(assetsPath, file);
        const size = statSync(filePath).size;
        return { name: file, size };
      }).sort((a, b) => b.size - a.size);
      
      jsAnalysis.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.name.padEnd(40)} ${formatBytes(file.size)}`);
      });
      
      // Check for potential issues
      const largeFiles = jsAnalysis.filter(f => f.size > 500 * 1024); // >500KB
      if (largeFiles.length > 0) {
        console.log(`\n⚠️  Large JavaScript files detected:`);
        largeFiles.forEach(file => {
          console.log(`     ${file.name} (${formatBytes(file.size)}) - Consider code splitting`);
        });
      }
    }
    
    // Analyze CSS files
    if (cssFiles.length > 0) {
      console.log(`\n🎨 CSS Analysis:`);
      const cssAnalysis = cssFiles.map(file => {
        const filePath = join(assetsPath, file);
        const size = statSync(filePath).size;
        return { name: file, size };
      }).sort((a, b) => b.size - a.size);
      
      cssAnalysis.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.name.padEnd(40)} ${formatBytes(file.size)}`);
      });
    }

  } catch (error) {
    console.error('❌ Error analyzing bundle structure:', error.message);
  }
}

// Function to generate optimization report
function generateOptimizationReport() {
  console.log('\n🎯 Optimization Recommendations:');
  console.log('='.repeat(50));
  
  console.log('1. 🗜️  Enable gzip compression in your web server');
  console.log('   - Nginx: `gzip on; gzip_types text/css application/javascript;`');
  console.log('   - Express: Use compression middleware');
  console.log('   - Fly.io: Automatically handles compression for common file types');
  
  console.log('\n2. 🔄 Implement proper caching headers');
  console.log('   - Set long-term cache headers for assets with hashes in filenames');
  console.log('   - Use ETags for dynamic content');
  
  console.log('\n3. 📦 Code splitting opportunities');
  console.log('   - Split vendor libraries into separate chunks');
  console.log('   - Use dynamic imports for route-based splitting');
  console.log('   - Consider lazy loading for non-critical components');
  
  console.log('\n4. 🌟 Production optimizations');
  console.log('   - Remove console.log statements');
  console.log('   - Enable tree shaking');
  console.log('   - Use production builds of all libraries');
  
  console.log('\n5. 📊 Monitoring');
  console.log('   - Monitor bundle sizes in CI/CD');
  console.log('   - Use tools like webpack-bundle-analyzer');
  console.log('   - Set bundle size budgets');
}

// Main function
async function main() {
  const assetsPath = './dist/public/assets';
  
  try {
    // Check if assets directory exists
    readdirSync(assetsPath);
  } catch (error) {
    console.log('❌ Assets directory not found. Run build first.');
    process.exit(1);
  }
  
  // Run optimizations
  analyzeBundleStructure(assetsPath);
  await compressAssets(assetsPath);
  generateOptimizationReport();
  
  console.log('\n✅ Asset optimization complete!');
}

main().catch(console.error);