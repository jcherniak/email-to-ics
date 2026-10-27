#!/usr/bin/env node
// Extracts the main readable content from HTML using Mozilla Readability.
// Usage: node scripts/readability.mjs [url] < page.html
// Output (stdout): {"title","content","textContent","length","excerpt","byline"}
import { Readability } from '@mozilla/readability';
import { JSDOM, VirtualConsole } from 'jsdom';

const readStdin = () => new Promise((resolve, reject) => {
  const chunks = [];
  process.stdin.on('data', (chunk) => chunks.push(chunk));
  process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  process.stdin.on('error', reject);
});

const emptyResult = () => ({ title: null, content: null, textContent: '', length: 0, excerpt: null, byline: null });

const main = async () => {
  const url = (process.argv[2] || '').trim();
  const html = await readStdin();
  if (!html.trim()) {
    process.stdout.write(JSON.stringify(emptyResult()));
    return;
  }

  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', () => {});
  const dom = new JSDOM(html, {
    url: /^https?:\/\//i.test(url) ? url : 'https://localhost/',
    virtualConsole,
    // No runScripts and no resources: nothing executes and nothing is fetched.
  });

  const reader = new Readability(dom.window.document, { charThreshold: 100 });
  const article = reader.parse();
  if (!article) {
    process.stdout.write(JSON.stringify(emptyResult()));
    return;
  }

  const textContent = (article.textContent || '').replace(/\s+/g, ' ').trim();
  process.stdout.write(JSON.stringify({
    title: article.title || null,
    content: article.content || null,
    textContent,
    length: textContent.length,
    excerpt: article.excerpt || null,
    byline: article.byline || null,
  }));
};

main().catch((error) => {
  process.stderr.write(`readability: ${error && error.message ? error.message : String(error)}\n`);
  process.exit(1);
});
