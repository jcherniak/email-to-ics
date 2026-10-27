// PageCleaner.js - main-content extraction shared by the Safari share-extension preprocessor and the
// offscreen WKWebView used for bare URLs. Tries Mozilla Readability first and falls back to the Chrome
// extension's selector heuristic when Readability rejects the page or drops schedule data (dates, list rows).
// Plain ES5 on purpose: it runs inside arbitrary pages in Safari's preprocessing context.
var WebToICS = (function () {
  var MAX_TEXT = 200000;
  var MAX_HTML = 800000;
  var MAX_SELECTION = 20000;
  var MIN_READABLE = 500;
  var CONTENT_SELECTORS = [
    'main', 'article', '[role="main"]', '#content', '#main-content', '#page-content',
    '#main', '#primary', '.content', '.main-content', '.page-content'
  ];
  var STRIP_SELECTOR = 'script, style, nav, footer, header, [role="navigation"], [role="banner"], ' +
    '[role="contentinfo"], .nav, .navbar, .footer, .header, .sidebar, .ad, .ads, .advertisement, noscript, iframe, svg, template';
  var BLOCK_SELECTOR = 'p, div, li, tr, h1, h2, h3, h4, h5, h6, section, article, td, th, dt, dd, blockquote, pre, ' +
    'ul, ol, table, figure, figcaption, aside, main, header, footer, address, details, summary';
  var INLINE_SELECTOR = 'span, a, time, label, button, strong, em, b, i, small, abbr';
  var DATE_RE = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2}\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\b\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)?\b/gi;

  function normalizeText(text) {
    return String(text || '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t  -​　]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function removeAll(root, selector) {
    var nodes = root.querySelectorAll(selector);
    for (var i = nodes.length - 1; i >= 0; i--) {
      var n = nodes[i];
      if (n.parentNode) { n.parentNode.removeChild(n); }
    }
  }

  // innerText-style text for a (possibly detached) element: block boundaries become line breaks.
  function elementToText(doc, el) {
    var clone = el.cloneNode(true);
    removeAll(clone, STRIP_SELECTOR);
    var breaks = clone.querySelectorAll('br');
    for (var i = breaks.length - 1; i >= 0; i--) {
      var br = breaks[i];
      if (br.parentNode) { br.parentNode.replaceChild(doc.createTextNode('\n'), br); }
    }
    var blocks = clone.querySelectorAll(BLOCK_SELECTOR);
    for (var j = 0; j < blocks.length; j++) {
      var b = blocks[j];
      b.insertBefore(doc.createTextNode('\n'), b.firstChild);
      b.appendChild(doc.createTextNode('\n'));
    }
    // Adjacent inline elements with no whitespace between them ("<span>June 5</span><span>7:30 PM</span>")
    // would otherwise run together in textContent.
    var inlines = clone.querySelectorAll(INLINE_SELECTOR);
    for (var k = 0; k < inlines.length; k++) {
      var inl = inlines[k];
      var next = inl.nextSibling;
      if (next && next.nodeType === 1 && inl.parentNode) {
        inl.parentNode.insertBefore(doc.createTextNode(' '), next);
      }
    }
    return normalizeText(clone.textContent);
  }

  function pickHeuristicElement(doc) {
    for (var i = 0; i < CONTENT_SELECTORS.length; i++) {
      var candidate = null;
      try { candidate = doc.querySelector(CONTENT_SELECTORS[i]); } catch (e) { candidate = null; }
      if (candidate && (candidate.textContent || '').replace(/\s+/g, ' ').trim().length > 100) { return candidate; }
    }
    return doc.body || doc.documentElement;
  }

  function countDates(text) {
    var matches = String(text || '').match(DATE_RE);
    return matches ? matches.length : 0;
  }

  function countRows(el) {
    try { return el.querySelectorAll('li, tr').length; } catch (e) { return 0; }
  }

  function metaContent(doc, selector) {
    try {
      var el = doc.querySelector(selector);
      return el ? (el.getAttribute('content') || '') : '';
    } catch (e) { return ''; }
  }

  function readabilityText(doc, heuristicDates, heuristicRows) {
    if (typeof Readability !== 'function') { return null; }
    var article = null;
    try {
      article = new Readability(doc.cloneNode(true), { charThreshold: 200, keepClasses: false }).parse();
    } catch (e) { return null; }
    if (!article || !article.content) { return null; }
    var holder = doc.createElement('div');
    holder.innerHTML = article.content;
    var text = elementToText(doc, holder);
    if (text.length < MIN_READABLE) { return null; }
    var dates = countDates(text);
    var rows = countRows(holder);
    var lostDates = heuristicDates > 0 && dates < heuristicDates * 0.5;
    var lostRows = heuristicRows >= 4 && rows < heuristicRows * 0.5;
    if (lostDates || lostRows) { return null; }
    return { text: text, title: article.title || '', siteName: article.siteName || '' };
  }

  function clean(doc, win) {
    doc = doc || document;
    win = win || window;
    var heuristicEl = pickHeuristicElement(doc);
    var heuristicText = elementToText(doc, heuristicEl);
    var text = heuristicText;
    var method = 'heuristic';
    var title = doc.title || '';
    var siteName = metaContent(doc, 'meta[property="og:site_name"]');

    var readable = readabilityText(doc, countDates(heuristicText), countRows(heuristicEl));
    if (readable) {
      text = readable.text;
      method = 'readability';
      if (readable.title) { title = readable.title; }
      if (!siteName && readable.siteName) { siteName = readable.siteName; }
    }

    var selection = '';
    try { selection = win.getSelection ? String(win.getSelection()) : ''; } catch (e) { selection = ''; }
    var html = '';
    try { html = doc.documentElement ? doc.documentElement.outerHTML : ''; } catch (e) { html = ''; }
    var url = '';
    try { url = doc.URL || (win.location && win.location.href) || ''; } catch (e) { url = ''; }

    return {
      url: url,
      title: normalizeText(title).slice(0, 500),
      siteName: normalizeText(siteName).slice(0, 200),
      selection: normalizeText(selection).slice(0, MAX_SELECTION),
      text: text.slice(0, MAX_TEXT),
      truncated: text.length > MAX_TEXT,
      html: html.slice(0, MAX_HTML),
      htmlTruncated: html.length > MAX_HTML,
      method: method
    };
  }

  return {
    clean: clean,
    elementToText: elementToText,
    countDates: countDates,
    pickHeuristicElement: pickHeuristicElement
  };
})();
