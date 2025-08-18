#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

console.log('🔧 Starting custom build process...');

// 1. Read the system prompt
const systemPromptPath = path.join(__dirname, '..', 'system_prompt.txt');
const systemPrompt = fs.readFileSync(systemPromptPath, 'utf8');

console.log('📄 System prompt loaded, length:', systemPrompt.length);

// 2. Escape the system prompt for JavaScript string literal
const escapedPrompt = JSON.stringify(systemPrompt);

console.log('🏗️  Running esbuild with injected system prompt...');

async function build() {
    try {
        // Build popup.js bundle
        await esbuild.build({
            entryPoints: ['popup.js'],
            bundle: true,
            outfile: 'dist/popup.bundle.js',
            format: 'iife',
            sourcemap: true,
            define: {
                'INJECTED_SYSTEM_PROMPT': escapedPrompt
            }
        });

        // Build email-processor.js with injected system prompt using JSON.stringify (same as popup.js)
        const emailProcessorSource = fs.readFileSync('email-processor.js', 'utf8');
        
        // Use JSON.stringify approach - same proven method as popup.js build
        const processedSource = emailProcessorSource.replace(
            'INJECTED_SYSTEM_PROMPT',
            JSON.stringify(systemPrompt)
        );
        fs.writeFileSync('dist/email-processor.js', processedSource);
        
        // Validate syntax of generated file (LLM recommendation)
        try {
            new (require('vm').Script)(processedSource);
            console.log('✅ email-processor.js syntax validation passed');
        } catch (syntaxError) {
            console.error('❌ Syntax error in generated email-processor.js:', syntaxError.message);
            throw syntaxError;
        }

        // Copy Bootstrap CSS
        const bootstrapCss = path.join(__dirname, 'node_modules/bootstrap/dist/css/bootstrap.min.css');
        const distCss = path.join(__dirname, 'dist/bootstrap.min.css');
        fs.copyFileSync(bootstrapCss, distCss);
        
        // Copy models-config.js to dist folder
        const modelsConfig = path.join(__dirname, 'models-config.js');
        const distModelsConfig = path.join(__dirname, 'dist/models-config.js');
        fs.copyFileSync(modelsConfig, distModelsConfig);
        
        console.log('✅ Build completed successfully');
        console.log('🎉 Build process complete!');
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

build();