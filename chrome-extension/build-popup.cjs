#!/usr/bin/env node

/**
 * Build script for popup.ts that reads .env.default / .env configuration
 * and injects defaults into the bundle via esbuild --define.
 *
 * Override chain:  .env.default  →  .env (local)  →  Settings dialog (runtime)
 */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

function parseEnvFile(filePath) {
    const result = {};
    if (!fs.existsSync(filePath)) return result;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.substring(0, eqIdx).trim();
        let value = trimmed.substring(eqIdx + 1).trim();
        // Remove surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        result[key] = value;
    }
    return result;
}

async function build() {
    const dir = __dirname;

    // Read .env.default then overlay with .env
    const envDefault = parseEnvFile(path.join(dir, '.env.default'));
    const envLocal = parseEnvFile(path.join(dir, '.env'));
    const env = { ...envDefault, ...envLocal };

    // Read the custom prompt default file
    const customPromptPath = path.join(dir, 'custom-prompt.default.txt');
    let customPromptDefault = '';
    if (fs.existsSync(customPromptPath)) {
        customPromptDefault = fs.readFileSync(customPromptPath, 'utf8').trim();
    }

    const buildTimestamp = new Date().toLocaleString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });

    const defines = {
        '__DEFAULT_TIMEZONE__': JSON.stringify(env.DEFAULT_TIMEZONE || 'America/Los_Angeles'),
        '__CUSTOM_PROMPT_DEFAULT__': JSON.stringify(env.CUSTOM_PROMPT || customPromptDefault),
        '__BUILD_TIMESTAMP__': JSON.stringify(buildTimestamp),
        'global': 'globalThis'
    };

    console.log('📦 Building popup with defaults:', {
        DEFAULT_TIMEZONE: env.DEFAULT_TIMEZONE || 'America/Los_Angeles',
        CUSTOM_PROMPT_LENGTH: (env.CUSTOM_PROMPT || customPromptDefault).length
    });

    await esbuild.build({
        entryPoints: [path.join(dir, 'src/popup.ts')],
        bundle: true,
        outfile: path.join(dir, 'dist/popup.bundle.js'),
        format: 'iife',
        sourcemap: true,
        external: ['chrome', 'fs', 'path', 'ical-generator'],
        define: defines,
        platform: 'browser'
    });

    console.log('✅ popup.bundle.js built successfully');
}

build().catch(err => {
    console.error('❌ Build failed:', err);
    process.exit(1);
});
