#!/usr/bin/env node

// Build script to create CRX packages for both Chrome and Orion versions
// Requires: npm install -g crx3

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = 'build';
const CHROME_DIR = path.join(BUILD_DIR, 'chrome');
const ORION_DIR = path.join(BUILD_DIR, 'orion');

// Files that are common to both versions
const COMMON_FILES = [
  'content.js',
  'email-processor.js',
  'popup.html',
  'popup.css',
  'settings.html',
  'settings.js',
  'icons/',
  'dist/'
];

// Chrome-specific files
const CHROME_FILES = [
  { src: 'manifest.json', dest: 'manifest.json' },
  { src: 'background.js', dest: 'background.js' },
  { src: 'popup.js', dest: 'popup.js' }
];

// Orion-specific files
const ORION_FILES = [
  { src: 'manifest-orion.json', dest: 'manifest.json' },
  { src: 'background-orion.js', dest: 'background.js' },
  { src: 'popup-orion.js', dest: 'popup.js' }
];

function log(message) {
  console.log(`[BUILD] ${message}`);
}

function createBuildDirectories() {
  log('Creating build directories...');
  
  // Clean existing build directory
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  }
  
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.mkdirSync(CHROME_DIR, { recursive: true });
  fs.mkdirSync(ORION_DIR, { recursive: true });
}

function copyFile(src, dest) {
  const srcPath = path.resolve(src);
  const destPath = path.resolve(dest);
  
  if (fs.statSync(srcPath).isDirectory()) {
    // Copy directory recursively
    fs.mkdirSync(destPath, { recursive: true });
    const files = fs.readdirSync(srcPath);
    files.forEach(file => {
      copyFile(path.join(srcPath, file), path.join(destPath, file));
    });
  } else {
    // Copy file
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
  }
}

function copyCommonFiles(targetDir) {
  log(`Copying common files to ${targetDir}...`);
  
  COMMON_FILES.forEach(file => {
    const src = path.resolve(file);
    const dest = path.join(targetDir, file);
    
    if (fs.existsSync(src)) {
      copyFile(src, dest);
    } else {
      console.warn(`Warning: Common file not found: ${src}`);
    }
  });
}

function copySpecificFiles(files, targetDir, version) {
  log(`Copying ${version}-specific files to ${targetDir}...`);
  
  files.forEach(fileMap => {
    const src = path.resolve(fileMap.src);
    const dest = path.join(targetDir, fileMap.dest);
    
    if (fs.existsSync(src)) {
      copyFile(src, dest);
    } else {
      console.error(`Error: ${version} file not found: ${src}`);
      process.exit(1);
    }
  });
  
  // Fix manifest references for Orion
  if (version === 'Orion') {
    const manifestPath = path.join(targetDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Update background script reference
    if (manifest.background && manifest.background.scripts) {
      manifest.background.scripts = ['background.js'];
    }
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    log('Fixed Orion manifest background script reference');
  }
}

function updateManifestVersion(manifestPath, version) {
  log(`Updating manifest version in ${manifestPath}...`);
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const currentVersion = manifest.version;
  const versionParts = currentVersion.split('.');
  
  // Increment patch version
  versionParts[2] = (parseInt(versionParts[2]) || 0) + 1;
  manifest.version = versionParts.join('.');
  
  // Update build date
  manifest.description += ` (Built: ${new Date().toISOString().split('T')[0]})`;
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  log(`Updated version to: ${manifest.version}`);
}

function createCRX(sourceDir, outputName) {
  log(`Creating CRX package: ${outputName}...`);
  
  try {
    // Check if crx3 is available
    execSync('which crx3', { stdio: 'ignore' });
    
    // Generate private key if it doesn't exist
    const keyPath = path.join(BUILD_DIR, `${outputName}.pem`);
    if (!fs.existsSync(keyPath)) {
      log(`Generating private key: ${keyPath}`);
      execSync(`openssl genrsa -out "${keyPath}" 2048`);
    }
    
    // Create CRX file
    const crxPath = path.join(BUILD_DIR, `${outputName}.crx`);
    execSync(`crx3 "${sourceDir}" -o "${crxPath}" -p "${keyPath}"`);
    
    log(`✓ CRX created: ${crxPath}`);
    
    // Also create ZIP for manual installation
    const zipPath = path.join(BUILD_DIR, `${outputName}.zip`);
    execSync(`cd "${sourceDir}" && zip -r "../${outputName}.zip" .`);
    log(`✓ ZIP created: ${zipPath}`);
    
  } catch (error) {
    console.error(`Failed to create CRX for ${outputName}:`, error.message);
    
    // Fallback: create ZIP only
    log(`Falling back to ZIP creation only...`);
    const zipPath = path.join(BUILD_DIR, `${outputName}.zip`);
    execSync(`cd "${sourceDir}" && zip -r "../${outputName}.zip" .`);
    log(`✓ ZIP created: ${zipPath}`);
  }
}

function validateBuild(buildDir, version) {
  log(`Validating ${version} build...`);
  
  const manifestPath = path.join(buildDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing manifest.json in ${version} build`);
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  log(`${version} manifest version: ${manifest.version}`);
  
  // Check for required files
  const requiredFiles = ['background.js', 'popup.js', 'popup.html', 'email-processor.js'];
  requiredFiles.forEach(file => {
    const filePath = path.join(buildDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing required file: ${file} in ${version} build`);
    }
  });
  
  log(`✓ ${version} build validation passed`);
}

function main() {
  log('Starting CRX build process...');
  
  try {
    // Create build directories
    createBuildDirectories();
    
    // Build Chrome version
    log('\n=== Building Chrome Version ===');
    copyCommonFiles(CHROME_DIR);
    copySpecificFiles(CHROME_FILES, CHROME_DIR, 'Chrome');
    updateManifestVersion(path.join(CHROME_DIR, 'manifest.json'), 'Chrome');
    validateBuild(CHROME_DIR, 'Chrome');
    createCRX(CHROME_DIR, 'email-to-ics-chrome');
    
    // Build Orion version
    log('\n=== Building Orion Version ===');
    copyCommonFiles(ORION_DIR);
    copySpecificFiles(ORION_FILES, ORION_DIR, 'Orion');
    updateManifestVersion(path.join(ORION_DIR, 'manifest.json'), 'Orion');
    validateBuild(ORION_DIR, 'Orion');
    createCRX(ORION_DIR, 'email-to-ics-orion');
    
    log('\n=== Build Summary ===');
    log('✓ Chrome version built successfully');
    log('✓ Orion version built successfully');
    log(`\nOutput files in: ${path.resolve(BUILD_DIR)}`);
    
    // List generated files
    const buildFiles = fs.readdirSync(BUILD_DIR);
    log('\nGenerated files:');
    buildFiles.forEach(file => {
      if (file.endsWith('.crx') || file.endsWith('.zip')) {
        const filePath = path.join(BUILD_DIR, file);
        const stats = fs.statSync(filePath);
        log(`  ${file} (${Math.round(stats.size / 1024)}KB)`);
      }
    });
    
    log('\n🎉 Build completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };