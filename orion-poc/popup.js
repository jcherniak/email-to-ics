// iOS Orion API Test PoC

document.addEventListener('DOMContentLoaded', async () => {
  // Display environment info
  displayEnvironmentInfo();
  
  // Set up test button handlers
  document.getElementById('test-storage').addEventListener('click', testStorageAPI);
  document.getElementById('test-content').addEventListener('click', testContentExtraction);
  document.getElementById('test-screenshot').addEventListener('click', testScreenshot);
});

function displayEnvironmentInfo() {
  const envInfo = document.getElementById('env-info');
  const userAgent = navigator.userAgent;
  const isOrion = userAgent.includes('Orion');
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
  
  envInfo.innerHTML = `
    <div class="test-result ${isOrion ? 'success' : 'warning'}">
      Browser: ${isOrion ? 'Orion' : isSafari ? 'Safari' : 'Other'}<br>
      Platform: ${isIOS ? 'iOS' : 'Desktop'}<br>
      User Agent: ${userAgent.substring(0, 60)}...
    </div>
  `;
}

async function testStorageAPI() {
  const result = document.getElementById('storage-result');
  
  try {
    // Test basic storage operations
    const testData = {
      timestamp: Date.now(),
      testString: 'Hello from Orion PoC',
      testObject: { nested: true, array: [1, 2, 3] }
    };
    
    // Test chrome.storage.local (should work on iOS Orion)
    await chrome.storage.local.set(testData);
    const retrieved = await chrome.storage.local.get(Object.keys(testData));
    
    // Test chrome.storage.sync (may not work on iOS)
    let syncSupported = false;
    try {
      await chrome.storage.sync.set({ syncTest: 'test' });
      await chrome.storage.sync.get(['syncTest']);
      syncSupported = true;
    } catch (e) {
      console.log('Storage sync not supported:', e);
    }
    
    const success = JSON.stringify(retrieved) === JSON.stringify(testData);
    
    result.innerHTML = `
      <div class="test-result ${success ? 'success' : 'error'}">
        Local Storage: ${success ? 'Working' : 'Failed'}<br>
        Sync Storage: ${syncSupported ? 'Working' : 'Not Supported'}<br>
        Data: ${JSON.stringify(retrieved).substring(0, 50)}...
      </div>
    `;
  } catch (error) {
    result.innerHTML = `
      <div class="test-result error">
        Storage Error: ${error.message}
      </div>
    `;
  }
}

async function testContentExtraction() {
  const result = document.getElementById('content-result');
  
  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab found');
    }
    
    // Test content script communication
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'extractContent' 
      });
      
      result.innerHTML = `
        <div class="test-result success">
          Content extracted successfully<br>
          Title: ${response.title}<br>
          Text length: ${response.textLength} chars<br>
          URL: ${response.url}
        </div>
      `;
    } catch (msgError) {
      // Try script injection as fallback (for iOS compatibility)
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          title: document.title,
          textLength: document.body.innerText.length,
          url: window.location.href,
          html: document.documentElement.outerHTML.substring(0, 500)
        })
      });
      
      const data = injectionResults[0].result;
      result.innerHTML = `
        <div class="test-result success">
          Content extracted via injection<br>
          Title: ${data.title}<br>
          Text length: ${data.textLength} chars<br>
          URL: ${data.url}
        </div>
      `;
    }
  } catch (error) {
    result.innerHTML = `
      <div class="test-result error">
        Content Error: ${error.message}
      </div>
    `;
  }
}

async function testScreenshot() {
  const result = document.getElementById('screenshot-result');
  
  try {
    // Test screenshot capture (not available on iOS)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (chrome.tabs.captureVisibleTab) {
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'png',
        quality: 50
      });
      
      result.innerHTML = `
        <div class="test-result success">
          Screenshot captured<br>
          Size: ${Math.round(dataUrl.length / 1024)}KB<br>
          <img src="${dataUrl}" style="max-width: 100px; max-height: 60px;" />
        </div>
      `;
    } else {
      result.innerHTML = `
        <div class="test-result warning">
          Screenshot API not available (expected on iOS)
        </div>
      `;
    }
  } catch (error) {
    result.innerHTML = `
      <div class="test-result warning">
        Screenshot not supported: ${error.message}
      </div>
    `;
  }
}