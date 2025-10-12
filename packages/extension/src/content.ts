/**
 * Content Script for Email-to-ICS Extension
 * Iframe-based architecture matching original
 */

let emailToIcsFrame: HTMLIFrameElement | null = null;
let dragHandle: HTMLDivElement | null = null;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let frameStartX = 0;
let frameStartY = 0;

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

  // Create container div for both drag handle and iframe
  const container = document.createElement('div');
  container.id = 'email-to-ics-container';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 450px;
    height: 600px;
    z-index: 2147483647;
  `;

  // Create drag handle
  const handle = document.createElement('div');
  handle.id = 'email-to-ics-draghandle';
  handle.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 30px;
    background: linear-gradient(to bottom, #0d6efd, #0b5ed7);
    border-radius: 8px 8px 0 0;
    cursor: move;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    z-index: 2147483648;
  `;

  // Add drag handle icon/text
  handle.innerHTML = `
    <span style="color: white; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; font-weight: 500;">
      ⋮⋮⋮ Email to ICS ⋮⋮⋮
    </span>
  `;

  dragHandle = handle;
  container.appendChild(handle);

  // Create iframe with adjusted positioning
  const iframe = document.createElement('iframe');
  iframe.id = 'email-to-ics-iframe';
  iframe.src = chrome.runtime.getURL('popup.html');
  iframe.style.cssText = `
    position: absolute;
    top: 30px;
    left: 0;
    width: 100%;
    height: calc(100% - 30px);
    background: white;
    border: 3px solid #0d6efd;
    border-top: none;
    border-radius: 0 0 8px 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;

  container.appendChild(iframe);
  document.body.appendChild(container);
  emailToIcsFrame = iframe;

  // Add drag event listeners
  setupDragHandlers(handle, container);

  // Add resize functionality to container
  makeResizable(container);

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

/**
 * Setup drag handlers for the drag handle
 */
function setupDragHandlers(handle: HTMLDivElement, container: HTMLDivElement) {
  handle.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const rect = container.getBoundingClientRect();
    frameStartX = rect.left;
    frameStartY = rect.top;

    // Change cursor and add overlay to prevent iframe from capturing events
    document.body.style.cursor = 'move';
    const overlay = document.createElement('div');
    overlay.id = 'email-to-ics-drag-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2147483646;
      cursor: move;
    `;
    document.body.appendChild(overlay);

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;

    let newLeft = frameStartX + deltaX;
    let newTop = frameStartY + deltaY;

    // Get container dimensions
    const container = document.getElementById('email-to-ics-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();

    // Keep within viewport bounds
    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - rect.width));
    newTop = Math.max(0, Math.min(newTop, window.innerHeight - rect.height));

    container.style.left = newLeft + 'px';
    container.style.top = newTop + 'px';
    container.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';

      // Remove overlay
      const overlay = document.getElementById('email-to-ics-drag-overlay');
      if (overlay) {
        overlay.remove();
      }
    }
  });
}

/**
 * Make container resizable
 */
function makeResizable(container: HTMLDivElement) {
  // Add resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.style.cssText = `
    position: absolute;
    bottom: 0;
    right: 0;
    width: 20px;
    height: 20px;
    cursor: nwse-resize;
    z-index: 2147483649;
  `;

  let isResizing = false;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let startWidth = 0;
  let startHeight = 0;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    startWidth = container.offsetWidth;
    startHeight = container.offsetHeight;

    // Add overlay during resize
    const overlay = document.createElement('div');
    overlay.id = 'email-to-ics-resize-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2147483646;
      cursor: nwse-resize;
    `;
    document.body.appendChild(overlay);

    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - resizeStartX;
    const deltaY = e.clientY - resizeStartY;

    const newWidth = Math.max(350, startWidth + deltaX);
    const newHeight = Math.max(400, startHeight + deltaY);

    container.style.width = newWidth + 'px';
    container.style.height = newHeight + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;

      // Remove overlay
      const overlay = document.getElementById('email-to-ics-resize-overlay');
      if (overlay) {
        overlay.remove();
      }
    }
  });

  container.appendChild(resizeHandle);
}

function removeIframe() {
  const container = document.getElementById('email-to-ics-container');
  if (container) {
    container.remove();
  }

  if (emailToIcsFrame) {
    emailToIcsFrame = null;
  }

  if (dragHandle) {
    dragHandle = null;
  }

  // Clean up any overlays that might be left
  const dragOverlay = document.getElementById('email-to-ics-drag-overlay');
  if (dragOverlay) {
    dragOverlay.remove();
  }

  const resizeOverlay = document.getElementById('email-to-ics-resize-overlay');
  if (resizeOverlay) {
    resizeOverlay.remove();
  }
}

// Listen for messages from iframe to parent
window.addEventListener('message', (event) => {
  if (event.source === emailToIcsFrame?.contentWindow) {
    if (event.data.type === 'RESIZE_IFRAME') {
      const container = document.getElementById('email-to-ics-container');
      if (container) {
        // Adjust container height, accounting for the drag handle (30px)
        container.style.height = (event.data.height + 30) + 'px';
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