document.addEventListener('DOMContentLoaded', () => {
  const summarizeBtn = document.getElementById('summarizeBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const clearBtn = document.getElementById('clearBtn');
  const summaryContent = document.getElementById('summaryContent');
  const keyFactsList = document.getElementById('keyFactsList');
  const loadingDiv = document.querySelector('.loading');

  // Check settings on popup open
  chrome.storage.local.get(['apiKey', 'model'], (result) => {
    console.log('Checking settings:', result.apiKey ? 'API key exists' : 'No API key', result.model ? 'Model exists' : 'No model');
    if (!result.apiKey || !result.model) {
      summaryContent.textContent = 'Please configure your API key and model in settings first.';
      summarizeBtn.disabled = true;
    }
  });

  // Get current tab and check for existing summary
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    checkSummarizationStatus(currentTab.id);
  });

  summarizeBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Current tab:', tab.id);
      
      // Show loading state
      loadingDiv.style.display = 'block';
      summaryContent.style.display = 'none';
      summarizeBtn.disabled = true;

      // Ensure content script is injected
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        console.log('Content script injected successfully');
      } catch (error) {
        console.log('Content script already exists or failed to inject:', error);
      }

      // Extract content from the page
      console.log('Sending extractContent message to content script');
      chrome.tabs.sendMessage(tab.id, { action: "extractContent" }, async (response) => {
        console.log('Received response from content script:', response);
        if (chrome.runtime.lastError) {
          console.error('Error:', chrome.runtime.lastError);
          updateUI({
            status: "error",
            error: "Failed to extract content: " + chrome.runtime.lastError.message
          });
          return;
        }

        if (response && response.content) {
          // Start summarization
          console.log('Starting summarization');
          chrome.runtime.sendMessage({
            action: "startSummarization",
            content: response.content,
            tabId: tab.id
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error:', chrome.runtime.lastError);
              updateUI({
                status: "error",
                error: "Failed to start summarization: " + chrome.runtime.lastError.message
              });
              return;
            }

            console.log('Summarization response:', response);
            if (response && response.status === "started") {
              // Start polling for results
              pollSummarizationStatus(tab.id);
            } else {
              updateUI({
                status: "error",
                error: "Failed to start summarization"
              });
            }
          });
        } else {
          updateUI({
            status: "error",
            error: "No content extracted from page"
          });
        }
      });
    } catch (error) {
      console.error('Error in summarize button click handler:', error);
      updateUI({
        status: "error",
        error: error.message
      });
    }
  });

  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  clearBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.runtime.sendMessage({
      action: "clearSummarization",
      tabId: tab.id
    }, () => {
      summaryContent.textContent = 'Click "Summarize" to generate a summary of the current page.';
      keyFactsList.innerHTML = '';
      summarizeBtn.disabled = false;
      loadingDiv.style.display = 'none';
      summaryContent.style.display = 'block';
    });
  });

  function checkSummarizationStatus(tabId) {
    console.log('Checking summarization status for tab:', tabId);
    chrome.runtime.sendMessage({
      action: "getSummarizationStatus",
      tabId: tabId
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error checking status:', chrome.runtime.lastError);
        return;
      }
      console.log('Status response:', response);
      updateUI(response);
    });
  }

  function pollSummarizationStatus(tabId) {
    console.log('Starting to poll summarization status');
    const pollInterval = setInterval(() => {
      chrome.runtime.sendMessage({
        action: "getSummarizationStatus",
        tabId: tabId
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error polling status:', chrome.runtime.lastError);
          clearInterval(pollInterval);
          updateUI({
            status: "error",
            error: "Failed to check summarization status"
          });
          return;
        }

        console.log('Poll response:', response);
        if (response.status === "completed" || response.status === "error") {
          clearInterval(pollInterval);
        }
        updateUI(response);
      });
    }, 1000);
  }

  function updateUI(response) {
    console.log('Updating UI with response:', response);
    switch (response.status) {
      case "not_started":
        loadingDiv.style.display = 'none';
        summaryContent.style.display = 'block';
        summarizeBtn.disabled = false;
        break;

      case "processing":
        loadingDiv.style.display = 'block';
        summaryContent.style.display = 'none';
        summarizeBtn.disabled = true;
        break;

      case "completed":
        loadingDiv.style.display = 'none';
        summaryContent.style.display = 'block';
        summarizeBtn.disabled = false;
        summaryContent.textContent = response.summary;
        
        // Update key facts
        keyFactsList.innerHTML = '';
        response.keyFacts.forEach(fact => {
          const li = document.createElement('li');
          li.textContent = fact;
          keyFactsList.appendChild(li);
        });
        break;

      case "error":
        loadingDiv.style.display = 'none';
        summaryContent.style.display = 'block';
        summarizeBtn.disabled = false;
        summaryContent.textContent = `Error: ${response.error}`;
        break;
    }
  }
}); 