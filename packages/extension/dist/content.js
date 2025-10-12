"use strict";
(() => {
  // src/content.ts
  var emailToIcsFrame = null;
  var dragHandle = null;
  var isDragging = false;
  var dragStartX = 0;
  var dragStartY = 0;
  var frameStartX = 0;
  var frameStartY = 0;
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggle-iframe") {
      if (emailToIcsFrame) {
        removeIframe();
      } else {
        createIframe(message.selectedText);
      }
      sendResponse({ success: true });
    } else if (message.action === "close-iframe") {
      removeIframe();
      sendResponse({ success: true });
    } else if (message.action === "get-page-info") {
      sendResponse({
        url: window.location.href,
        title: document.title,
        html: document.documentElement.outerHTML,
        text: document.body.innerText
      });
    }
  });
  function createIframe(selectedText) {
    if (emailToIcsFrame) {
      return;
    }
    const container = document.createElement("div");
    container.id = "email-to-ics-container";
    container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 450px;
    height: 600px;
    z-index: 2147483647;
  `;
    const handle = document.createElement("div");
    handle.id = "email-to-ics-draghandle";
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
    handle.innerHTML = `
    <span style="color: white; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; font-weight: 500;">
      \u22EE\u22EE\u22EE Email to ICS \u22EE\u22EE\u22EE
    </span>
  `;
    dragHandle = handle;
    container.appendChild(handle);
    const iframe = document.createElement("iframe");
    iframe.id = "email-to-ics-iframe";
    iframe.src = chrome.runtime.getURL("popup.html");
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
    setupDragHandlers(handle, container);
    makeResizable(container);
    iframe.onload = () => {
      iframe.contentWindow?.postMessage({
        type: "INIT_FROM_CONTENT",
        data: {
          url: window.location.href,
          title: document.title,
          selectedText
        }
      }, "*");
    };
  }
  function setupDragHandlers(handle, container) {
    handle.addEventListener("mousedown", (e) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const rect = container.getBoundingClientRect();
      frameStartX = rect.left;
      frameStartY = rect.top;
      document.body.style.cursor = "move";
      const overlay = document.createElement("div");
      overlay.id = "email-to-ics-drag-overlay";
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
    document.addEventListener("mousemove", (e) => {
      if (!isDragging)
        return;
      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;
      let newLeft = frameStartX + deltaX;
      let newTop = frameStartY + deltaY;
      const container2 = document.getElementById("email-to-ics-container");
      if (!container2)
        return;
      const rect = container2.getBoundingClientRect();
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - rect.width));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - rect.height));
      container2.style.left = newLeft + "px";
      container2.style.top = newTop + "px";
      container2.style.right = "auto";
    });
    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = "";
        const overlay = document.getElementById("email-to-ics-drag-overlay");
        if (overlay) {
          overlay.remove();
        }
      }
    });
  }
  function makeResizable(container) {
    const resizeHandle = document.createElement("div");
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
    resizeHandle.addEventListener("mousedown", (e) => {
      isResizing = true;
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      startWidth = container.offsetWidth;
      startHeight = container.offsetHeight;
      const overlay = document.createElement("div");
      overlay.id = "email-to-ics-resize-overlay";
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
    document.addEventListener("mousemove", (e) => {
      if (!isResizing)
        return;
      const deltaX = e.clientX - resizeStartX;
      const deltaY = e.clientY - resizeStartY;
      const newWidth = Math.max(350, startWidth + deltaX);
      const newHeight = Math.max(400, startHeight + deltaY);
      container.style.width = newWidth + "px";
      container.style.height = newHeight + "px";
    });
    document.addEventListener("mouseup", () => {
      if (isResizing) {
        isResizing = false;
        const overlay = document.getElementById("email-to-ics-resize-overlay");
        if (overlay) {
          overlay.remove();
        }
      }
    });
    container.appendChild(resizeHandle);
  }
  function removeIframe() {
    const container = document.getElementById("email-to-ics-container");
    if (container) {
      container.remove();
    }
    if (emailToIcsFrame) {
      emailToIcsFrame = null;
    }
    if (dragHandle) {
      dragHandle = null;
    }
    const dragOverlay = document.getElementById("email-to-ics-drag-overlay");
    if (dragOverlay) {
      dragOverlay.remove();
    }
    const resizeOverlay = document.getElementById("email-to-ics-resize-overlay");
    if (resizeOverlay) {
      resizeOverlay.remove();
    }
  }
  window.addEventListener("message", (event) => {
    if (event.source === emailToIcsFrame?.contentWindow) {
      if (event.data.type === "RESIZE_IFRAME") {
        const container = document.getElementById("email-to-ics-container");
        if (container) {
          container.style.height = event.data.height + 30 + "px";
        }
      } else if (event.data.type === "CLOSE_IFRAME") {
        removeIframe();
      }
    }
  });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "E") {
      e.preventDefault();
      if (emailToIcsFrame) {
        removeIframe();
      } else {
        createIframe();
      }
    }
  });
})();
//# sourceMappingURL=content.js.map
