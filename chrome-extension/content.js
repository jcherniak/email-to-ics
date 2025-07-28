let emailToIcsFrame = null;

function createIframe() {
    if (emailToIcsFrame) {
        return;
    }

    // Create iframe container
    const container = document.createElement('div');
    container.id = 'email-to-ics-container';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 450px;
        height: 600px;
        z-index: 999999;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #f8f9fa;
        border-bottom: 1px solid #dee2e6;
        border-radius: 8px 8px 0 0;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Email to ICS Converter';
    title.style.cssText = `
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #333;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    `;

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
        background: none;
        border: none;
        font-size: 24px;
        line-height: 1;
        cursor: pointer;
        color: #6c757d;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
    `;
    closeButton.onmouseover = () => {
        closeButton.style.backgroundColor = '#e9ecef';
    };
    closeButton.onmouseout = () => {
        closeButton.style.backgroundColor = 'transparent';
    };
    closeButton.onclick = removeIframe;

    header.appendChild(title);
    header.appendChild(closeButton);

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'email-to-ics-iframe';
    iframe.src = chrome.runtime.getURL('popup.html');
    iframe.style.cssText = `
        width: 100%;
        flex: 1;
        border: none;
        background: white;
    `;

    container.appendChild(header);
    container.appendChild(iframe);
    document.body.appendChild(container);

    emailToIcsFrame = container;

    // Send current page info to iframe when it loads
    iframe.onload = () => {
        iframe.contentWindow.postMessage({
            type: 'INIT_FROM_CONTENT',
            data: {
                url: window.location.href,
                title: document.title
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

// Listen for messages from extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggle-iframe') {
        if (emailToIcsFrame) {
            removeIframe();
        } else {
            createIframe();
        }
        sendResponse({ success: true });
    }
});

// Listen for messages from iframe
window.addEventListener('message', (event) => {
    if (event.data.type === 'CLOSE_IFRAME') {
        removeIframe();
    }
});