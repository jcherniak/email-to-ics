(() => {
  // popup.js
  var baseUrl = "https://new.justin-c.com/email-to-ics";
  var targetUrl = `${baseUrl}/?display=email`;
  var modelsEndpointUrl = `${baseUrl}/?get_models=1`;
  document.addEventListener("DOMContentLoaded", function() {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      window.addEventListener("message", (event) => {
        if (event.data.type === "INIT_FROM_CONTENT") {
          const urlInput2 = document.getElementById("url");
          if (urlInput2 && event.data.data.url) {
            urlInput2.value = event.data.data.url;
          }
        }
      });
    }
    document.querySelector('[data-bs-toggle="collapse"]').addEventListener("click", function() {
      const targetId = this.getAttribute("data-bs-target");
      const targetElement = document.querySelector(targetId);
      const isCurrentlyExpanded = this.getAttribute("aria-expanded") === "true";
      this.setAttribute("aria-expanded", !isCurrentlyExpanded);
      if (targetElement) {
        targetElement.classList.toggle("show");
      }
    });
    const statusDiv = document.getElementById("status");
    const reviewStatusDiv = document.getElementById("review-status");
    const urlInput = document.getElementById("url");
    const convertButton = document.getElementById("convert-button");
    const instructionsInput = document.getElementById("instructions");
    const modelSelect = document.getElementById("model-select");
    const refreshModelsButton = document.getElementById("refresh-models");
    const authSection = document.getElementById("auth-section");
    const formSection = document.getElementById("form-section");
    const openServerPageButton = document.getElementById("open-server-page");
    const tentativeToggle = document.getElementById("tentative-toggle");
    const multidayToggle = document.getElementById("multiday-toggle");
    const reviewRadioGroup = document.querySelectorAll('input[name="review-option"]');
    const reviewSection = document.getElementById("review-section");
    const reviewContent = document.getElementById("review-content");
    const reviewRecipient = document.getElementById("review-recipient");
    const reviewSubject = document.getElementById("review-subject");
    const sendButton = document.getElementById("send-button");
    const rejectButton = document.getElementById("reject-button");
    const processingView = document.getElementById("processingView");
    const requestData = document.getElementById("requestData");
    const statusMessage = document.getElementById("statusMessage");
    const responseData = document.getElementById("responseData");
    const backToFormButton = document.getElementById("backToFormButton");
    let reviewData = null;
    let serverUrl = "";
    let isAuthenticated = false;
    let localAvailableModels = [];
    let serverDefaultModelId = null;
    let currentTabId = null;
    class TabStateManager {
      constructor() {
        this.tabId = null;
        this.stateKey = null;
      }
      async initialize() {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          this.tabId = tab.id;
          this.stateKey = `tab_${this.tabId}_state`;
          currentTabId = this.tabId;
          await this.restoreState();
          window.addEventListener("beforeunload", () => this.saveState());
        } catch (error) {
          console.error("Error initializing tab state manager:", error);
        }
      }
      async saveState() {
        if (!this.tabId)
          return;
        const state = {
          formData: {
            url: urlInput?.value || "",
            instructions: instructionsInput?.value || "",
            model: modelSelect?.value || "",
            tentative: tentativeToggle?.checked || false,
            multiday: multidayToggle?.checked || false,
            reviewOption: document.querySelector('input[name="review-option"]:checked')?.value || "direct"
          },
          processingState: {
            isProcessing: processingView?.style.display === "block",
            hasResults: responseData?.textContent || ""
          },
          timestamp: Date.now()
        };
        try {
          await chrome.storage.local.set({ [this.stateKey]: state });
          console.log("Saved state for tab", this.tabId);
        } catch (error) {
          console.error("Error saving tab state:", error);
        }
      }
      async restoreState() {
        if (!this.tabId)
          return;
        try {
          const result = await chrome.storage.local.get([this.stateKey]);
          const state = result[this.stateKey];
          if (state && Date.now() - state.timestamp < 36e5) {
            const form = state.formData;
            if (form.url && urlInput)
              urlInput.value = form.url;
            if (form.instructions && instructionsInput)
              instructionsInput.value = form.instructions;
            if (form.model && modelSelect)
              modelSelect.value = form.model;
            if (tentativeToggle)
              tentativeToggle.checked = form.tentative;
            if (multidayToggle)
              multidayToggle.checked = form.multiday;
            if (form.reviewOption) {
              const radio = document.querySelector(`input[name="review-option"][value="${form.reviewOption}"]`);
              if (radio)
                radio.checked = true;
            }
            console.log("Restored state for tab", this.tabId);
          }
        } catch (error) {
          console.error("Error restoring tab state:", error);
        }
      }
      async cleanup() {
        try {
          const allItems = await chrome.storage.local.get(null);
          const now = Date.now();
          const keysToRemove = [];
          for (const key in allItems) {
            if (key.startsWith("tab_") && key.endsWith("_state")) {
              const state = allItems[key];
              if (state && now - state.timestamp > 864e5) {
                keysToRemove.push(key);
              }
            }
          }
          if (keysToRemove.length > 0) {
            await chrome.storage.local.remove(keysToRemove);
            console.log("Cleaned up", keysToRemove.length, "old tab states");
          }
        } catch (error) {
          console.error("Error cleaning up tab states:", error);
        }
      }
    }
    const tabStateManager = new TabStateManager();
    function getPageDimensions() {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        originalZoom: document.body.style.zoom,
        originalTransformOrigin: document.body.style.transformOrigin,
        originalScrollX: window.scrollX,
        originalScrollY: window.scrollY
      };
    }
    function applyZoomStyle(zoomFactor, originalZoom, originalTransformOrigin) {
      document.body.style.zoom = zoomFactor;
      document.body.style.transformOrigin = "0 0";
      return { originalZoom, originalTransformOrigin };
    }
    function removeZoomStyle(originalZoom, originalTransformOrigin) {
      document.body.style.zoom = originalZoom || "";
      document.body.style.transformOrigin = originalTransformOrigin || "";
    }
    function scrollToPosition(x, y) {
      window.scrollTo(x, y);
    }
    async function captureVisibleTabScreenshot() {
      if (window.self !== window.top) {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: "captureScreenshot" }, (response) => {
            if (response && response.screenshot) {
              resolve("data:image/jpeg;base64," + response.screenshot);
            } else {
              console.error("Screenshot request failed:", response?.error);
              resolve(null);
            }
          });
        });
      }
      let originalState = {};
      const tab = await getActiveTab();
      let dataUrl = null;
      try {
        const [initialResult] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: getPageDimensions
        });
        const state = initialResult.result;
        originalState = {
          zoom: state.originalZoom,
          transformOrigin: state.originalTransformOrigin,
          scrollX: state.originalScrollX,
          scrollY: state.originalScrollY
        };
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: scrollToPosition,
          args: [0, 0]
        });
        const zoomX = state.innerWidth / state.scrollWidth;
        const zoomY = state.innerHeight / state.scrollHeight;
        const zoomFactor = Math.min(zoomX, zoomY, 1);
        if (zoomFactor < 1) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: applyZoomStyle,
            args: [zoomFactor, originalState.zoom, originalState.transformOrigin]
          });
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
          format: "jpeg",
          quality: 90
        });
        if (!dataUrl) {
          throw new Error("captureVisibleTab returned empty result after zoom/scroll.");
        }
        console.log("Zoomed+Scrolled screenshot captured successfully");
        return dataUrl;
      } catch (error) {
        console.error("Zoomed+Scrolled screenshot capture error:", error);
        return null;
      } finally {
        if (Object.keys(originalState).length > 0) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: removeZoomStyle,
              args: [originalState.zoom, originalState.transformOrigin]
            });
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: scrollToPosition,
              args: [originalState.scrollX, originalState.scrollY]
            });
          } catch (cleanupError) {
            console.error("Error cleaning up zoom/scroll style:", cleanupError);
          }
        }
      }
    }
    async function getActiveTab() {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        return tabs[0];
      } else {
        throw new Error("Could not get active tab.");
      }
    }
    function showStatus(message, type = "loading", isError = false) {
      if (!statusDiv)
        return;
      statusDiv.textContent = message;
      statusDiv.className = `status-${type}`;
      statusDiv.style.display = "block";
      if (isError) {
        document.body.classList.add("error-state");
      } else {
        document.body.classList.remove("error-state");
      }
    }
    function showReviewStatus(message, type = "loading") {
      if (!reviewStatusDiv)
        return;
      reviewStatusDiv.textContent = message;
      reviewStatusDiv.className = `status-${type}`;
      reviewStatusDiv.style.display = "block";
    }
    function hideStatus() {
      if (!statusDiv)
        return;
      statusDiv.style.display = "none";
      statusDiv.textContent = "";
      document.body.classList.remove("error-state");
    }
    function hideReviewStatus() {
      if (!reviewStatusDiv)
        return;
      reviewStatusDiv.style.display = "none";
      reviewStatusDiv.textContent = "";
    }
    function disableForm(disable = true) {
      urlInput.disabled = disable;
      instructionsInput.disabled = disable;
      convertButton.disabled = disable;
      modelSelect.disabled = disable;
      refreshModelsButton.disabled = disable;
      tentativeToggle.disabled = disable;
      reviewRadioGroup.forEach((radio) => radio.disabled = disable);
    }
    function disableReviewButtons(disable = true) {
      sendButton.disabled = disable;
      rejectButton.disabled = disable;
    }
    async function loadModels(forceRefresh = false) {
      if (!isAuthenticated) {
        console.log("loadModels: Not authenticated, skipping.");
        return;
      }
      if (!forceRefresh && localAvailableModels.length > 0) {
        console.log("loadModels: Using cached models.");
        populateModelDropdown();
        return;
      }
      console.log("loadModels: Fetching models from server...");
      showStatus("Loading AI models...");
      if (modelSelect)
        modelSelect.disabled = true;
      if (refreshModelsButton)
        refreshModelsButton.disabled = true;
      try {
        const response = await fetch(`${serverUrl}?get_models=true`, {
          method: "GET",
          headers: { "Accept": "application/json" },
          credentials: "include"
          // Send cookies
        });
        console.log("loadModels: Fetch response status:", response.status);
        if (!response.ok) {
          if (response.status === 401) {
            console.log("loadModels: Status 401 - Unauthorized during refresh");
            isAuthenticated = false;
            if (authSection)
              authSection.style.display = "block";
            if (formSection)
              formSection.style.display = "none";
            hideStatus();
            return;
          }
          const errorText = await response.text();
          console.error("loadModels: Fetch failed:", errorText);
          throw new Error(`Failed to fetch models: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("loadModels: Received data:", data);
        if (!data || !Array.isArray(data.models)) {
          console.error("loadModels: Invalid model data received:", data);
          throw new Error("Invalid model data received from server.");
        }
        localAvailableModels = data.models;
        serverDefaultModelId = localAvailableModels.find((m) => m.default)?.id || (localAvailableModels.length > 0 ? localAvailableModels[0].id : null);
        console.log("loadModels: Server default model ID:", serverDefaultModelId);
        populateModelDropdown();
        hideStatus();
      } catch (error) {
        console.error("loadModels: Error loading models:", error);
        showStatus(`Error loading models: ${error.message}`, "error", true);
        if (modelSelect)
          modelSelect.innerHTML = '<option value="">Error loading</option>';
      } finally {
        if (modelSelect)
          modelSelect.disabled = false;
        if (refreshModelsButton)
          refreshModelsButton.disabled = false;
        console.log("loadModels: Finished.");
      }
    }
    function populateModelDropdown() {
      if (!modelSelect)
        return;
      modelSelect.innerHTML = "";
      console.log("populateModelDropdown: Populating with models:", localAvailableModels);
      if (localAvailableModels.length === 0) {
        modelSelect.innerHTML = '<option value="">No models available</option>';
        return;
      }
      localAvailableModels.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.name + (model.vision_capable ? " (Vision)" : "");
        option.selected = model.id === serverDefaultModelId;
        modelSelect.appendChild(option);
      });
      console.log("populateModelDropdown: Finished.");
    }
    async function checkAuthenticationAndFetchConfig2() {
      console.log("checkAuthenticationAndFetchConfig: Starting");
      try {
        console.log("checkAuthenticationAndFetchConfig: Getting baseUrl from storage");
        const data = await new Promise((resolve) => {
          chrome.storage.sync.get(["baseUrl"], resolve);
        });
        serverUrl = data.baseUrl;
        console.log("checkAuthenticationAndFetchConfig: Got serverUrl from storage:", serverUrl);
        if (!serverUrl) {
          console.log("checkAuthenticationAndFetchConfig: No serverUrl in storage - showing auth section.");
          isAuthenticated = false;
          if (authSection)
            authSection.style.display = "block";
          if (formSection)
            formSection.style.display = "none";
          hideStatus();
          return;
        }
        if (!serverUrl.endsWith("/")) {
          serverUrl += "/";
        }
        showStatus("Checking authentication...");
        console.log("checkAuthenticationAndFetchConfig: Fetching models for auth check:", `${serverUrl}?get_models=true`);
        const modelsResponse = await fetch(`${serverUrl}?get_models=true`, {
          method: "GET",
          headers: {
            "Accept": "application/json"
          },
          credentials: "include"
        });
        console.log("checkAuthenticationAndFetchConfig: Auth check response status:", modelsResponse.status);
        if (modelsResponse.status === 401) {
          console.log("checkAuthenticationAndFetchConfig: Status 401 - Unauthorized");
          isAuthenticated = false;
          if (authSection)
            authSection.style.display = "block";
          if (formSection)
            formSection.style.display = "none";
          hideStatus();
          console.log("checkAuthenticationAndFetchConfig: Showing auth section.");
        } else if (!modelsResponse.ok) {
          console.error("checkAuthenticationAndFetchConfig: Auth check fetch failed (not OK)");
          throw new Error(`Server error checking auth: ${modelsResponse.statusText}`);
        } else {
          console.log("checkAuthenticationAndFetchConfig: Status OK - Authorized");
          isAuthenticated = true;
          if (authSection)
            authSection.style.display = "none";
          if (formSection)
            formSection.style.display = "block";
          hideStatus();
          console.log("checkAuthenticationAndFetchConfig: Showing form section, loading models...");
          await loadModels();
          chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0] && tabs[0].url && (tabs[0].url.startsWith("http:") || tabs[0].url.startsWith("https:"))) {
              if (urlInput)
                urlInput.value = tabs[0].url;
              console.log("checkAuthenticationAndFetchConfig: Populated URL field.");
            }
          });
        }
      } catch (error) {
        console.error("checkAuthenticationAndFetchConfig: Error:", error);
        showStatus(`Error: ${error.message}`, "error", true);
        if (authSection)
          authSection.style.display = "none";
        if (formSection)
          formSection.style.display = "none";
        console.log("checkAuthenticationAndFetchConfig: Hiding sections due to error.");
      }
    }
    async function applyContextMenuInstructions() {
      try {
        const data = await new Promise((resolve) => {
          chrome.storage.local.get(["contextMenuInstructions"], resolve);
        });
        if (data && data.contextMenuInstructions) {
          console.log("Applying context menu instructions:", data.contextMenuInstructions);
          if (instructionsInput) {
            instructionsInput.value = data.contextMenuInstructions;
          }
          chrome.storage.local.remove("contextMenuInstructions", () => {
            if (chrome.runtime.lastError) {
              console.error("Error removing context menu instructions:", chrome.runtime.lastError);
            }
          });
        }
      } catch (error) {
        console.error("Error applying context menu instructions:", error);
      }
    }
    async function generateICS() {
      if (!isAuthenticated) {
        showStatus("Not authenticated.", "error", true);
        return;
      }
      let showingReview = false;
      const urlValue = urlInput.value.trim();
      const instructionsValue = instructionsInput.value.trim();
      const selectedModelValue = modelSelect.value;
      const isTentativeValue = tentativeToggle.checked;
      const isMultidayValue = multidayToggle.checked;
      const reviewOptionValue = document.querySelector('input[name="review-option"]:checked')?.value || "direct";
      let requestDetailsText = `URL: ${urlValue || "(Using current tab)"}
`;
      requestDetailsText += `Instructions: ${instructionsValue || "(None)"}
`;
      requestDetailsText += `Model: ${selectedModelValue || "(Default)"}
`;
      requestDetailsText += `Tentative: ${isTentativeValue}
`;
      requestDetailsText += `Multi-day: ${isMultidayValue}
`;
      requestDetailsText += `Review Option: ${reviewOptionValue}
`;
      requestData.textContent = requestDetailsText;
      hideStatus();
      hideReviewStatus();
      reviewSection.style.display = "none";
      processingView.style.display = "block";
      statusMessage.textContent = "Processing...";
      statusMessage.className = "status-loading";
      responseData.textContent = "";
      disableForm();
      backToFormButton.disabled = true;
      let htmlContent = "";
      let screenshotViewportData = null;
      let screenshotZoomedData = null;
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0)
          throw new Error("Could not get active tab.");
        const tabId = tabs[0].id;
        const currentTabUrl = tabs[0].url;
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => document.documentElement.outerHTML
        });
        if (results && results[0] && results[0].result)
          htmlContent = results[0].result;
        else
          console.warn("Could not get HTML content.");
        statusMessage.textContent = "Capturing screenshots...";
        try {
          screenshotViewportData = await chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 80 });
          if (screenshotViewportData && screenshotViewportData.startsWith("data:image/jpeg;base64,")) {
            screenshotViewportData = screenshotViewportData.substring("data:image/jpeg;base64,".length);
          } else
            screenshotViewportData = null;
        } catch (vpError) {
          console.error("Viewport screenshot failed:", vpError);
          screenshotViewportData = null;
        }
        try {
          const zoomedDataUrl = await captureVisibleTabScreenshot();
          if (zoomedDataUrl && zoomedDataUrl.startsWith("data:image/jpeg;base64,")) {
            screenshotZoomedData = zoomedDataUrl.substring("data:image/jpeg;base64,".length);
          } else
            screenshotZoomedData = null;
        } catch (zoomError) {
          console.error("Zoomed screenshot failed:", zoomError);
          screenshotZoomedData = null;
        }
        statusMessage.textContent = "Sending to server...";
        const formData = new URLSearchParams();
        formData.append("url", urlValue || currentTabUrl);
        formData.append("html", htmlContent);
        formData.append("instructions", instructionsValue);
        formData.append("model", selectedModelValue);
        formData.append("tentative", isTentativeValue ? "1" : "0");
        formData.append("multiday", isMultidayValue ? "1" : "0");
        formData.append("review", reviewOptionValue === "review" ? "1" : "0");
        formData.append("fromExtension", "true");
        formData.append("display", "email");
        if (screenshotViewportData)
          formData.append("screenshot_viewport", screenshotViewportData);
        if (screenshotZoomedData)
          formData.append("screenshot_zoomed", screenshotZoomedData);
        let resultJson = null;
        const response = await fetch(serverUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData,
          credentials: "include"
        });
        const responseText = await response.text();
        console.log("RAW RESPONSE TEXT (first 100 chars):", responseText.substring(0, 100));
        if (responseText.includes('"needsReview":true')) {
          console.log("RAW TEXT CONTAINS needsReview:true!");
        }
        if (!response.ok) {
          statusMessage.textContent = `Error: ${response.status} ${response.statusText}`;
          statusMessage.className = "status-error";
          console.error("Server returned error:", response.status, responseText);
          responseData.textContent = responseText;
        } else {
          try {
            resultJson = JSON.parse(responseText);
            console.log("PARSED JSON RESPONSE:", resultJson);
            console.log("needsReview:", resultJson.needsReview);
            console.log("confirmationToken:", resultJson.confirmationToken);
            console.log("icsContent length:", resultJson.icsContent ? resultJson.icsContent.length : "missing");
            if (resultJson.needsReview) {
              if (resultJson.confirmationToken && resultJson.icsContent) {
                console.log("SHOWING REVIEW SECTION - conditions met");
                showReviewSection(resultJson);
                showingReview = true;
              } else {
                console.log("NOT SHOWING REVIEW - missing required data");
                console.log("confirmationToken present:", !!resultJson.confirmationToken);
                console.log("icsContent present:", !!resultJson.icsContent);
                console.error("Review needed, but missing confirmationToken or icsContent from server:", resultJson);
                statusMessage.textContent = "Error: Review data missing from server.";
              }
            } else {
              statusMessage.textContent = "Success (Sent Directly)";
              statusMessage.className = "status-success";
              let responseHTML = "";
              if (resultJson.message) {
                responseHTML += `<div class="success-message">${resultJson.message}</div>`;
              }
              if (resultJson.icsContent) {
                responseHTML += parseAndDisplayIcs(resultJson.icsContent);
              } else {
                responseHTML += `<pre class="plain-text">${responseText}</pre>`;
              }
              responseData.innerHTML = responseHTML;
              console.log("Success (Sent Directly), displayed details");
            }
          } catch (e) {
            console.warn("Could not parse JSON response, showing raw text.", e);
            statusMessage.textContent = "Success (Raw Response)";
            statusMessage.className = "status-success";
            responseData.textContent = responseText;
          }
        }
      } catch (error) {
        console.error("generateICS Error:", error);
        statusMessage.textContent = `Error: ${error.message || "Unknown error"}`;
        statusMessage.className = "status-error";
        responseData.textContent = error.stack || "";
      } finally {
        if (!showingReview && backToFormButton) {
          backToFormButton.disabled = false;
        }
      }
    }
    async function sendReviewedICS() {
      if (!reviewData || !reviewData.confirmationToken) {
        showReviewStatus("Error: Missing confirmation data.", "error");
        return;
      }
      showReviewStatus("Sending confirmation...", "loading");
      disableReviewButtons();
      try {
        const formData = new URLSearchParams();
        formData.append("confirmationToken", reviewData.confirmationToken);
        const response = await fetch(`${serverUrl}?confirm=true`, {
          // Send to confirmation endpoint
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: formData,
          credentials: "include"
        });
        const resultText = await response.text();
        if (!response.ok) {
          let errorMsg = `Server error: ${response.status}`;
          try {
            errorMsg += `: ${JSON.parse(resultText).error}`;
          } catch (e) {
          }
          throw new Error(errorMsg);
        }
        showReviewStatus("Email sent successfully!", "success");
        setTimeout(() => {
          hideReviewSection();
        }, 2500);
      } catch (error) {
        console.error("Error sending confirmation:", error);
        showReviewStatus(`Error sending: ${error.message}`, "error");
        disableReviewButtons(false);
      }
    }
    convertButton?.addEventListener("click", generateICS);
    refreshModelsButton?.addEventListener("click", () => loadModels(true));
    openServerPageButton?.addEventListener("click", () => {
      if (serverUrl)
        chrome.tabs.create({ url: serverUrl });
    });
    sendButton?.addEventListener("click", sendReviewedICS);
    rejectButton?.addEventListener("click", hideReviewSection);
    urlInput?.addEventListener("input", () => tabStateManager.saveState());
    instructionsInput?.addEventListener("input", () => tabStateManager.saveState());
    modelSelect?.addEventListener("change", () => tabStateManager.saveState());
    tentativeToggle?.addEventListener("change", () => tabStateManager.saveState());
    multidayToggle?.addEventListener("change", () => tabStateManager.saveState());
    reviewRadioGroup?.forEach((radio) => {
      radio.addEventListener("change", () => tabStateManager.saveState());
    });
    backToFormButton?.addEventListener("click", () => {
      processingView.style.display = "none";
      formSection.style.display = "block";
      disableForm(false);
    });
    document.addEventListener("keydown", function(event) {
      const activeElement = document.activeElement;
      const isTypingArea = activeElement && (activeElement.tagName === "TEXTAREA" || activeElement.tagName === "INPUT");
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !isTypingArea) {
        if (formSection.style.display !== "none" && processingView.style.display === "none") {
          event.preventDefault();
          convertButton?.click();
        }
      }
    });
    Promise.all([
      checkAuthenticationAndFetchConfig2(),
      tabStateManager.initialize()
    ]).then(() => {
      applyContextMenuInstructions();
      setInterval(() => tabStateManager.cleanup(), 36e5);
    });
    function hideReviewSection() {
      reviewSection.style.display = "none";
      formSection.style.display = "block";
      reviewData = null;
      hideReviewStatus();
      disableForm(false);
    }
    function parseAndDisplayIcs(icsString) {
      console.log("parseAndDisplayIcs (using ical.js) called - icsString length:", icsString ? icsString.length : "none");
      if (!icsString)
        return "<p>No ICS data available.</p>";
      try {
        const jcalData = ICAL.parse(icsString);
        const vcalendar = new ICAL.Component(jcalData);
        const vevent = vcalendar.getFirstSubcomponent("vevent");
        if (!vevent) {
          throw new Error("Could not find VEVENT component in ICS data.");
        }
        const event = new ICAL.Event(vevent);
        let html = '<dl class="ics-details">';
        const addProperty = (label, value) => {
          if (value) {
            const displayValue = String(value).replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").replace(/\\n/g, "<br>");
            html += `<dt>${label}:</dt><dd>${displayValue}</dd>`;
          }
        };
        addProperty("Event", event.summary);
        addProperty("Location", event.location);
        const startDate = event.startDate;
        const endDate = event.endDate;
        if (startDate) {
          try {
            addProperty("Start", startDate.toJSDate().toLocaleString());
          } catch (dateError) {
            console.warn("Could not format start date:", dateError);
            addProperty("Start", startDate.toString());
          }
        }
        if (endDate) {
          try {
            addProperty("End", endDate.toJSDate().toLocaleString());
          } catch (dateError) {
            console.warn("Could not format end date:", dateError);
            addProperty("End", endDate.toString());
          }
        }
        addProperty("Description", event.description);
        html += "</dl>";
        html += "<details><summary>Raw ICS Data</summary><pre>";
        html += icsString.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        html += "</pre></details>";
        return html;
      } catch (error) {
        console.error("Error parsing/displaying ICS with ical.js:", error);
        return `<p class="error">Error displaying ICS: ${error.message}</p>
                    <pre>${icsString.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
      }
    }
    function showReviewSection(data) {
      console.log("showReviewSection called with data:", data);
      reviewData = {
        confirmationToken: data.confirmationToken,
        recipientEmail: data.recipientEmail,
        // Keep for display
        emailSubject: data.emailSubject,
        // Keep for display
        icsContent: data.icsContent
        // Keep for display/debugging
      };
      console.log("reviewData set:", reviewData);
      reviewRecipient.textContent = data.recipientEmail || "Unknown";
      reviewSubject.textContent = data.emailSubject || "No Subject";
      console.log("Review recipient/subject populated");
      console.log("About to parse ICS content using ical.js");
      reviewContent.innerHTML = parseAndDisplayIcs(data.icsContent || "");
      console.log("ICS content parsed and set to innerHTML");
      formSection.style.display = "none";
      processingView.style.display = "none";
      reviewSection.style.display = "block";
      console.log("Display set: formSection=none, processingView=none, reviewSection=block");
      hideStatus();
      hideReviewStatus();
      disableReviewButtons(false);
      console.log("Review section display complete");
    }
  });
})();
//# sourceMappingURL=popup.bundle.js.map
