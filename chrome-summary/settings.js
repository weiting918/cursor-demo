document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settingsForm');
  const apiKeyInput = document.getElementById('apiKey');
  const modelSelect = document.getElementById('model');
  const saveButton = document.getElementById('saveButton');
  const statusMessage = document.getElementById('statusMessage');

  // Load saved settings
  chrome.storage.local.get(['apiKey', 'model'], (result) => {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
      verifyApiKey(result.apiKey);
    }
    if (result.model) {
      modelSelect.value = result.model;
    }
  });

  // Handle API key verification and model list loading
  async function verifyApiKey(apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Invalid API key');
      }

      const data = await response.json();
      
      // Filter for chat models only
      const chatModels = data.data.filter(model => 
        model.id.includes('gpt') && model.id.includes('3.5')
      );

      // Clear and populate model select
      modelSelect.innerHTML = '<option value="">Select a model</option>';
      chatModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.id;
        modelSelect.appendChild(option);
      });

      modelSelect.disabled = false;
      showStatus('API key verified successfully!', 'success');
    } catch (error) {
      modelSelect.disabled = true;
      showStatus('Invalid API key. Please check and try again.', 'error');
    }
  }

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;

    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    if (!model) {
      showStatus('Please select a model', 'error');
      return;
    }

    try {
      // Save settings
      await chrome.storage.local.set({ apiKey, model });
      showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      showStatus('Error saving settings. Please try again.', 'error');
    }
  });

  // Handle API key input
  let debounceTimeout;
  apiKeyInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    const apiKey = e.target.value.trim();
    
    if (apiKey) {
      debounceTimeout = setTimeout(() => {
        verifyApiKey(apiKey);
      }, 500);
    } else {
      modelSelect.disabled = true;
      modelSelect.innerHTML = '<option value="">Select a model</option>';
    }
  });

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
    statusMessage.style.display = 'block';
    
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  }
}); 