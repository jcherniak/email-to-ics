let emailToIcsFrame = null;

function createIframe() {
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
        z-index: 999999;
        background: white;
        border: 3px solid #0d6efd;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;

    document.body.appendChild(iframe);

    emailToIcsFrame = iframe;

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
    } else if (request.action === 'hide-iframe') {
        if (emailToIcsFrame) {
            emailToIcsFrame.style.visibility = 'hidden';
        }
        sendResponse({ success: true });
    } else if (request.action === 'show-iframe') {
        if (emailToIcsFrame) {
            emailToIcsFrame.style.visibility = 'visible';
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