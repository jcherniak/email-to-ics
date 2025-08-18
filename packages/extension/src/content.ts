/**
 * Content Script for Email-to-ICS Extension
 * Iframe-based architecture matching original
 */

let emailToIcsFrame: HTMLIFrameElement | null = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggle-iframe') {
    if (emailToIcsFrame) {
      removeIframe();
    } else {
      createIframe(message.selectedText);
    }
    sendResponse({ success: true });
  } else if (message.action === 'close-iframe') {
    removeIframe();
    sendResponse({ success: true });
  } else if (message.action === 'get-page-info') {
    sendResponse({
      url: window.location.href,
      title: document.title,
      html: document.documentElement.outerHTML,
      text: document.body.innerText
    });
  }
});

/**
 * Create iframe loading popup.html
 */
function createIframe(selectedText?: string) {
  if (emailToIcsFrame) {
    return;
  }

  // Create iframe with fixed positioning
  const iframe = document.createElement('iframe');
  iframe.id = 'email-to-ics-iframe';
  iframe.src = chrome.runtime.getURL('popup.html');
  iframe.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 450px;
    height: 600px;
    z-index: 2147483647;
    background: white;
    border: 3px solid #0d6efd;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    resize: both;
    min-width: 350px;
    min-height: 400px;
  `;

  document.body.appendChild(iframe);
  emailToIcsFrame = iframe;

  // Send current page info to iframe when it loads
  iframe.onload = () => {
    iframe.contentWindow?.postMessage({
      type: 'INIT_FROM_CONTENT',
      data: {
        url: window.location.href,
        title: document.title,
        selectedText: selectedText
      }
    }, '*');
  };
}

function removeIframe() {
  if (emailToIcsFrame) {
    emailToIcsFrame.remove();
    emailToIcsFrame = null;
  }
}

// Listen for messages from iframe to parent
window.addEventListener('message', (event) => {
  if (event.source === emailToIcsFrame?.contentWindow) {
    if (event.data.type === 'RESIZE_IFRAME') {
      if (emailToIcsFrame) {
        emailToIcsFrame.style.height = event.data.height + 'px';
      }
    } else if (event.data.type === 'CLOSE_IFRAME') {
      removeIframe();
    }
  }
});

// Keyboard shortcut to toggle iframe
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
    e.preventDefault();
    if (emailToIcsFrame) {
      removeIframe();
    } else {
      createIframe();
    }
  }
});