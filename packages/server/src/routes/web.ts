import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Web interface routes - serves HTML form similar to PHP form.html
 */
export async function webRoutes(fastify: FastifyInstance) {
  
  // Serve main web interface
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // For now, serve a simple HTML form
      // TODO: Move form.html from php/ to web/ and serve it here
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email-to-ICS Converter</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #34495e;
        }
        input, textarea, select {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: #3498db;
        }
        textarea {
            height: 150px;
            resize: vertical;
        }
        button {
            background: #3498db;
            color: white;
            padding: 14px 30px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.3s;
            width: 100%;
        }
        button:hover {
            background: #2980b9;
        }
        .status {
            margin: 20px 0;
            padding: 15px;
            border-radius: 6px;
            display: none;
        }
        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .loading {
            display: none;
            text-align: center;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📧 Email-to-ICS Converter</h1>
        
        <form id="extractForm">
            <div class="form-group">
                <label for="url">Website URL (optional):</label>
                <input type="url" id="url" name="url" placeholder="https://example.com/event-page">
            </div>
            
            <div class="form-group">
                <label for="html">HTML Content:</label>
                <textarea id="html" name="html" placeholder="Paste HTML content here..."></textarea>
            </div>
            
            <div class="form-group">
                <label for="text">Text Content:</label>
                <textarea id="text" name="text" placeholder="Paste plain text content here..."></textarea>
            </div>
            
            <div class="form-group">
                <label for="model">AI Model:</label>
                <select id="model" name="model">
                    <option value="google/gemini-2.5-pro-preview">Gemini 2.5 Pro (Default)</option>
                    <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                    <option value="anthropic/claude-3.7-sonnet:thinking">Claude 3.7 Sonnet</option>
                </select>
            </div>
            
            <button type="submit">Extract Events & Generate ICS</button>
        </form>
        
        <div class="loading" id="loading">
            <p>🤖 Processing with AI... This may take a few seconds.</p>
        </div>
        
        <div class="status" id="status"></div>
        
        <div id="results" style="display: none;">
            <h3>Extracted Events:</h3>
            <div id="eventsList"></div>
            <button id="downloadIcs" style="display: none;">Download ICS File</button>
        </div>
    </div>

    <script>
        document.getElementById('extractForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const form = e.target;
            const formData = new FormData(form);
            const loading = document.getElementById('loading');
            const status = document.getElementById('status');
            const results = document.getElementById('results');
            
            // Show loading
            loading.style.display = 'block';
            status.style.display = 'none';
            results.style.display = 'none';
            
            try {
                // First, extract events
                const extractResponse = await fetch('/api/extract-events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        input: {
                            url: formData.get('url') || undefined,
                            html: formData.get('html') || undefined,
                            text: formData.get('text') || undefined,
                            source: 'manual'
                        },
                        options: {
                            model: formData.get('model')
                        }
                    })
                });
                
                const extractData = await extractResponse.json();
                
                if (!extractData.success) {
                    throw new Error(extractData.error);
                }
                
                const events = extractData.result.events;
                
                if (events.length === 0) {
                    status.className = 'status error';
                    status.textContent = 'No events found in the provided content.';
                    status.style.display = 'block';
                    return;
                }
                
                // Generate ICS
                const icsResponse = await fetch('/api/generate-ics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        events: events,
                        config: { method: 'PUBLISH' }
                    })
                });
                
                if (icsResponse.headers.get('content-type')?.includes('text/calendar')) {
                    const icsContent = await icsResponse.text();
                    
                    // Show success
                    status.className = 'status success';
                    status.textContent = \`Successfully extracted \${events.length} event(s)!\`;
                    status.style.display = 'block';
                    
                    // Show events
                    const eventsList = document.getElementById('eventsList');
                    eventsList.innerHTML = events.map(event => \`
                        <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
                            <h4>\${event.summary}</h4>
                            <p><strong>Start:</strong> \${new Date(event.dtstart).toLocaleString()}</p>
                            \${event.dtend ? \`<p><strong>End:</strong> \${new Date(event.dtend).toLocaleString()}</p>\` : ''}
                            \${event.location ? \`<p><strong>Location:</strong> \${event.location}</p>\` : ''}
                            \${event.description ? \`<p><strong>Description:</strong> \${event.description}</p>\` : ''}
                        </div>
                    \`).join('');
                    
                    results.style.display = 'block';
                    
                    // Set up download
                    const downloadBtn = document.getElementById('downloadIcs');
                    downloadBtn.style.display = 'block';
                    downloadBtn.onclick = () => {
                        const blob = new Blob([icsContent], { type: 'text/calendar' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = \`\${events[0].summary.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics\`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                    };
                } else {
                    const errorData = await icsResponse.json();
                    throw new Error(errorData.error || 'Failed to generate ICS');
                }
                
            } catch (error) {
                status.className = 'status error';
                status.textContent = \`Error: \${error.message}\`;
                status.style.display = 'block';
            } finally {
                loading.style.display = 'none';
            }
        });
    </script>
</body>
</html>
      `;

      reply.type('text/html');
      return html;
    } catch (error) {
      fastify.log.error(`Failed to serve web interface: ${error instanceof Error ? error.message : String(error)}`);
      reply.code(500);
      return { error: 'Failed to load web interface' };
    }
  });

  // Serve models list for extensions
  fastify.get('/models', async (request: FastifyRequest, reply: FastifyReply) => {
    const config = fastify.config as any;
    
    return {
      models: config.ALLOWED_MODELS || [config.DEFAULT_MODEL],
      default: config.DEFAULT_MODEL
    };
  });
}