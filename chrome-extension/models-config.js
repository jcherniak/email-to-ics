// Shared model configuration for Chrome extension
// Used by both popup.js and email-processor.js

const ALLOWED_MODELS = [
    { id: '~openai/gpt-mini-latest', name: 'GPT Mini Latest' },
    { id: '~openai/gpt-latest', name: 'GPT Latest' },
    { id: '~google/gemini-pro-latest', name: 'Gemini Pro Latest' },
    { id: '~google/gemini-flash-latest', name: 'Gemini Flash Latest' },
    { id: '~anthropic/claude-opus-latest', name: 'Claude Opus Latest' },
    { id: '~anthropic/claude-sonnet-latest', name: 'Claude Sonnet Latest' },
    { id: '~moonshotai/kimi-latest', name: 'Kimi Latest' },
];

const ALLOWED_MODEL_IDS = ALLOWED_MODELS.map(m => m.id);

const PREFERRED_ORDER = [
    '~openai/gpt-mini-latest',
    '~openai/gpt-latest',
    '~google/gemini-pro-latest',
    '~google/gemini-flash-latest',
    '~anthropic/claude-opus-latest',
    '~anthropic/claude-sonnet-latest',
    '~moonshotai/kimi-latest',
];

// ES module exports for popup.js (bundled with esbuild)
export { ALLOWED_MODELS, ALLOWED_MODEL_IDS, PREFERRED_ORDER };

// CommonJS exports for email-processor.js (service worker)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ALLOWED_MODELS, ALLOWED_MODEL_IDS, PREFERRED_ORDER };
}
