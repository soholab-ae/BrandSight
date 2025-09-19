#!/usr/bin/env node
import { readdirSync, statSync, readFileSync } from 'fs';
import { join, extname } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

console.log('📊 Bundle Analysis Tool');
console.log('=======================\n');

// Function to get file size in human readable format
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Function to analyze a directory
async function analyzeDirectory(dirPath, name) {
  try {
    const files = readdirSync(dirPath);
    let totalSize = 0;
    let gzipSize = 0;
    const fileAnalysis = [];

    console.log(`\n📁 ${name} Analysis:`);
    console.log('-'.repeat(50));

    for (const file of files) {
      const filePath = join(dirPath, file);
      const stats = statSync(filePath);
      
      if (stats.isFile()) {
        const size = stats.size;
        totalSize += size;
        
        // Calculate gzip size for text files
        let gzipFileSize = 0;
        if (['.js', '.css', '.html', '.json'].includes(extname(file))) {
          try {
            const content = readFileSync(filePath);
            const gzipped = await gzipAsync(content);
            gzipFileSize = gzipped.length;
            gzipSize += gzipFileSize;
          } catch (e) {
            // Skip gzip calculation for this file
          }
        }

        fileAnalysis.push({
          name: file,
          size,
          gzipSize: gzipFileSize,
          type: extname(file)
        });
      }
    }

    // Sort by size (largest first)
    fileAnalysis.sort((a, b) => b.size - a.size);

    // Display top files
    console.log('Top 10 largest files:');
    fileAnalysis.slice(0, 10).forEach((file, index) => {
      const gzipInfo = file.gzipSize > 0 ? ` (${formatBytes(file.gzipSize)} gzipped)` : '';
      console.log(`${index + 1}.`.padEnd(3) + 
                  `${file.name}`.padEnd(30) + 
                  `${formatBytes(file.size)}${gzipInfo}`);
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Total files: ${fileAnalysis.length}`);
    console.log(`   Total size: ${formatBytes(totalSize)}`);
    if (gzipSize > 0) {
      console.log(`   Gzipped size: ${formatBytes(gzipSize)}`);
      console.log(`   Compression ratio: ${Math.round((1 - gzipSize/totalSize) * 100)}%`);
    }

    // File type analysis
    const typeAnalysis = {};
    fileAnalysis.forEach(file => {
      if (!typeAnalysis[file.type]) {
        typeAnalysis[file.type] = { count: 0, size: 0 };
      }
      typeAnalysis[file.type].count++;
      typeAnalysis[file.type].size += file.size;
    });

    console.log(`\n📈 By file type:`);
    Object.entries(typeAnalysis)
      .sort(([,a], [,b]) => b.size - a.size)
      .forEach(([type, info]) => {
        console.log(`   ${(type || 'no extension').padEnd(10)} ${info.count.toString().padEnd(3)} files  ${formatBytes(info.size)}`);
      });

    return { totalSize, gzipSize, fileCount: fileAnalysis.length };

  } catch (error) {
    console.error(`❌ Error analyzing ${name}:`, error.message);
    return { totalSize: 0, gzipSize: 0, fileCount: 0 };
  }
}

// Main analysis
async function main() {
  const distExists = readdirSync('.').includes('dist');
  
  if (!distExists) {
    console.log('❌ No dist directory found. Run build first.');
    process.exit(1);
  }

  console.log('Analyzing build output...\n');

  const publicAnalysis = await analyzeDirectory('./dist/public', 'Frontend Bundle (dist/public)');
  const assetsAnalysis = await analyzeDirectory('./dist/public/assets', 'Assets (dist/public/assets)');
  
  // Backend analysis
  console.log('\n📦 Backend Bundle Analysis:');
  console.log('-'.repeat(50));
  
  try {
    const backendStats = statSync('./dist/index.js');
    console.log(`Server bundle size: ${formatBytes(backendStats.size)}`);
    
    // Analyze server bundle content
    const serverContent = readFileSync('./dist/index.js', 'utf8');
    const gzippedServer = await gzipAsync(Buffer.from(serverContent));
    console.log(`Server bundle (gzipped): ${formatBytes(gzippedServer.length)}`);
    console.log(`Compression ratio: ${Math.round((1 - gzippedServer.length/backendStats.size) * 100)}%`);
  } catch (error) {
    console.log('❌ Could not analyze backend bundle');
  }

  // Overall summary
  console.log('\n🎯 Optimization Recommendations:');
  console.log('='.repeat(50));

  if (publicAnalysis.totalSize > 5 * 1024 * 1024) {
    console.log('⚠️  Frontend bundle is quite large (>5MB). Consider code splitting.');
  }

  if (publicAnalysis.gzipSize > 0 && (publicAnalysis.gzipSize / publicAnalysis.totalSize) > 0.7) {
    console.log('⚠️  Poor compression ratio. Check for binary assets or repetitive code.');
  }

  console.log('\n✅ Analysis complete!');
}

main().catch(console.error);