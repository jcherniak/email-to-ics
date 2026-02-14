// Shared model configuration for Chrome extension
// Used by both popup.js and email-processor.js

const ALLOWED_MODELS = [
    { id: 'openai/gpt-5.2', name: 'GPT-5.2' },
    { id: 'openai/gpt-5.2-codex', name: 'GPT-5.2 Codex' },
    { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6' },
    { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
    { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro' },
    { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash' },
];

const ALLOWED_MODEL_IDS = ALLOWED_MODELS.map(m => m.id);

const PREFERRED_ORDER = [
    'openai/gpt-5.2',
    'openai/gpt-5.2-codex',
    'anthropic/claude-opus-4.6',
    'anthropic/claude-sonnet-4.5',
    'google/gemini-3-pro-preview',
    'google/gemini-3-flash-preview',
];

// ES module exports for popup.js (bundled with esbuild)
export { ALLOWED_MODELS, ALLOWED_MODEL_IDS, PREFERRED_ORDER };

// CommonJS exports for email-processor.js (service worker)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ALLOWED_MODELS, ALLOWED_MODEL_IDS, PREFERRED_ORDER };
}