// Test script for EmailProcessor
// This can be run in Node.js environment for testing

// Mock Chrome APIs for testing
const localStorageData = {};

global.chrome = {
    storage: {
        sync: {
            get: (keys, callback) => {
                // Mock settings for testing
                const mockSettings = {
                    openRouterKey: 'test-key',
                    postmarkApiKey: 'test-postmark-key',
                    fromEmail: 'test@example.com',
                    toTentativeEmail: 'tentative@example.com',
                    toConfirmedEmail: 'confirmed@example.com',
                    aiModel: 'anthropic/claude-3.5-sonnet'
                };
                callback(mockSettings);
            },
            set: (data, callback) => {
                console.log('Storage set:', data);
                if (callback) callback();
            }
        },
        local: {
            get: (keys, callback) => {
                const result = {};
                if (Array.isArray(keys)) {
                    keys.forEach(key => {
                        if (localStorageData[key]) {
                            result[key] = localStorageData[key];
                        }
                    });
                } else if (typeof keys === 'object') {
                    Object.keys(keys).forEach(key => {
                        if (localStorageData[key]) {
                            result[key] = localStorageData[key];
                        }
                    });
                } else if (typeof keys === 'string') {
                    if (localStorageData[keys]) {
                        result[keys] = localStorageData[keys];
                    }
                }
                callback(result);
            },
            set: (data, callback) => {
                Object.assign(localStorageData, data);
                console.log('Local storage set:', Object.keys(data));
                if (callback) callback();
            },
            remove: (keys, callback) => {
                if (Array.isArray(keys)) {
                    keys.forEach(key => delete localStorageData[key]);
                } else {
                    delete localStorageData[keys];
                }
                console.log('Local storage remove:', keys);
                if (callback) callback();
            }
        }
    },
    runtime: {
        getURL: (path) => `chrome-extension://test/${path}`
    }
};

// Mock fetch for testing
global.fetch = async (url, options) => {
    console.log('Mock fetch called:', url, options);
    
    if (url.includes('openrouter.ai/api/v1/models')) {
        return {
            ok: true,
            json: async () => ({
                data: [
                    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
                    { id: 'openai/gpt-4o', name: 'GPT-4o' }
                ]
            })
        };
    }
    
    if (url.includes('openrouter.ai/api/v1/chat/completions')) {
        return {
            ok: true,
            json: async () => ({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            summary: 'Test Meeting',
                            location: 'Conference Room A',
                            start_date: '2024-01-15',
                            start_time: '14:00',
                            end_date: '2024-01-15',
                            end_time: '15:00',
                            description: 'Test meeting description',
                            timezone: 'America/New_York'
                        })
                    }
                }]
            })
        };
    }
    
    if (url.includes('api.postmarkapp.com')) {
        return {
            ok: true,
            json: async () => ({
                MessageID: 'test-message-id',
                To: 'test@example.com',
                SubmittedAt: new Date().toISOString()
            })
        };
    }
    
    throw new Error(`Unhandled fetch URL: ${url}`);
};

// Load EmailProcessor
const EmailProcessor = require('./email-processor.js');

async function runTests() {
    console.log('Starting EmailProcessor tests...\n');
    
    try {
        // Test 1: Initialize EmailProcessor
        console.log('Test 1: Initialize EmailProcessor');
        const processor = new EmailProcessor();
        await processor.initializeFromStorage();
        console.log('✓ EmailProcessor initialized successfully\n');
        
        // Test 2: Load available models
        console.log('Test 2: Load available models');
        const models = await processor.loadAvailableModels();
        console.log('✓ Models loaded:', models.length, 'models');
        console.log('Models:', models.map(m => m.id).join(', '), '\n');
        
        // Test 3: Process content
        console.log('Test 3: Process content');
        const testParams = {
            url: 'https://example.com/meeting',
            html: '<html><body><h1>Team Meeting</h1><p>Date: January 15, 2024 at 2:00 PM</p><p>Location: Conference Room A</p></body></html>',
            instructions: 'Extract meeting details',
            screenshot: null,
            tentative: true,
            multiday: false,
            reviewMode: 'direct'
        };
        
        const result = await processor.processContent(testParams);
        console.log('✓ Content processed successfully');
        console.log('Result:', result);
        console.log('ICS Preview:', result.icsContent.substring(0, 200), '...\n');
        
        // Test 4: Generate ICS directly
        console.log('Test 4: Generate ICS directly');
        const eventData = {
            summary: 'Direct Test Event',
            location: 'Test Location',
            start_date: '2024-01-20',
            start_time: '10:00',
            end_date: '2024-01-20',
            end_time: '11:00',
            description: 'Direct test event description',
            timezone: 'America/New_York'
        };
        
        const icsContent = await processor.generateICS(eventData, false, false);
        console.log('✓ ICS generated successfully');
        console.log('ICS Content length:', icsContent.length);
        console.log('ICS Preview:', icsContent.substring(0, 300), '...\n');
        
        // Test 5: Test with review mode
        console.log('Test 5: Test with review mode');
        const reviewParams = { ...testParams, reviewMode: 'review' };
        const reviewResult = await processor.processContent(reviewParams);
        console.log('✓ Review mode processed successfully');
        console.log('Review result:', {
            needsReview: reviewResult.needsReview,
            hasToken: !!reviewResult.confirmationToken,
            hasICS: !!reviewResult.icsContent
        });
        
        if (reviewResult.needsReview && reviewResult.confirmationToken) {
            console.log('Test 5b: Confirm event');
            const confirmResult = await processor.confirmEvent(reviewResult.confirmationToken);
            console.log('✓ Event confirmed successfully');
            console.log('Confirm result:', confirmResult.message);
        }
        
        console.log('\n🎉 All tests passed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack:', error.stack);
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests };