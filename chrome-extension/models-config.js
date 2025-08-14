// Shared model configuration for Chrome extension
// Used by both popup.js and email-processor.js

const ALLOWED_MODELS = [
    { id: 'openai/gpt-5', name: 'GPT-5' },
    { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4' },
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'openai/o3', name: 'GPT-O3' },
    { id: 'openai/gpt-4.1', name: 'GPT-4.1' },
    { id: 'openai/o3-pro', name: 'GPT-O3 Pro' }
];

const ALLOWED_MODEL_IDS = ALLOWED_MODELS.map(m => m.id);

const PREFERRED_ORDER = [
    'openai/gpt-5',
    'openai/gpt-5-mini',
    'google/gemini-2.5-pro',
    'anthropic/claude-opus-4',
    'anthropic/claude-sonnet-4',
    'google/gemini-2.5-flash',
    'openai/o3',
    'openai/gpt-4.1',
    'openai/o3-pro'
];

// ES module exports for popup.js (bundled with esbuild)
export { ALLOWED_MODELS, ALLOWED_MODEL_IDS, PREFERRED_ORDER };

// CommonJS exports for email-processor.js (service worker)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ALLOWED_MODELS, ALLOWED_MODEL_IDS, PREFERRED_ORDER };
}