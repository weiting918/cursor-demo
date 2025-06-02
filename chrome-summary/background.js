let summarizationTasks = new Map();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);
  
  if (request.action === "startSummarization") {
    const tabId = sender.tab ? sender.tab.id : request.tabId;
    console.log('Starting summarization for tab:', tabId);
    
    if (summarizationTasks.has(tabId)) {
      const existingTask = summarizationTasks.get(tabId);
      console.log('Existing task found:', existingTask);
      sendResponse({
        status: "in_progress",
        data: existingTask
      });
      return true;
    }

    summarizationTasks.set(tabId, {
      status: "processing",
      summary: null,
      keyFacts: null
    });

    // Get the API key and model from storage
    chrome.storage.local.get(['apiKey', 'model'], async (settings) => {
      console.log('Retrieved settings:', settings.apiKey ? 'API key exists' : 'No API key', settings.model ? 'Model exists' : 'No model');
      
      if (!settings.apiKey || !settings.model) {
        console.error('API key or model not set');
        summarizationTasks.set(tabId, {
          status: "error",
          error: "Please configure your OpenAI API key and select a model in the settings."
        });
        return;
      }

      try {
        console.log('Making API request...');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
          },
          body: JSON.stringify({
            model: settings.model,
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant that summarizes web content. Provide a concise summary and key facts in the same language as the input text."
              },
              {
                role: "user",
                content: `Please summarize the following text and provide key facts. Use the same language as the input text:\n\n${request.content}`
              }
            ],
            temperature: 0.7,
            max_tokens: 1000
          })
        });

        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          
          // Try to get more detailed error information
          try {
            const errorData = await response.json();
            if (errorData.error && errorData.error.message) {
              errorMessage = errorData.error.message;
            }
          } catch (e) {
            console.error('Could not parse error response:', e);
          }

          // Provide more user-friendly error messages
          if (response.status === 429) {
            errorMessage = "OpenAI API rate limit exceeded. Please wait a moment and try again, or check your API key's rate limits.";
          } else if (response.status === 401) {
            errorMessage = "Invalid API key. Please check your OpenAI API key in the settings.";
          } else if (response.status === 403) {
            errorMessage = "API key does not have permission to use this model. Please check your OpenAI account settings.";
          }

          throw new Error(errorMessage);
        }

        console.log('Received API response');
        const responseData = await response.json();
        const aiResponse = responseData.choices[0].message.content;
        
        // Split the response into summary and key facts
        const parts = aiResponse.split(/Key Facts:|Key Points:|Main Points:/i);
        const summary = parts[0].trim();
        const keyFacts = parts[1] ? parts[1].trim().split('\n').filter(fact => fact.trim()) : [];

        console.log('Processed summary and key facts');
        summarizationTasks.set(tabId, {
          status: "completed",
          summary: summary,
          keyFacts: keyFacts
        });

      } catch (error) {
        console.error('Error in summarization:', error);
        summarizationTasks.set(tabId, {
          status: "error",
          error: error.message
        });
      }
    });

    console.log('Sending initial response');
    sendResponse({
      status: "started",
      message: "Summarization process started"
    });
    return true;
  }

  if (request.action === "getSummarizationStatus") {
    const tabId = sender.tab ? sender.tab.id : request.tabId;
    const status = summarizationTasks.get(tabId) || { status: "not_started" };
    console.log('Getting status for tab:', tabId, status);
    sendResponse(status);
    return true;
  }

  if (request.action === "clearSummarization") {
    const tabId = sender.tab ? sender.tab.id : request.tabId;
    console.log('Clearing summarization for tab:', tabId);
    summarizationTasks.delete(tabId);
    sendResponse({ status: "cleared" });
    return true;
  }
}); 