function extractContent() {
  console.log('Starting content extraction...');
  // Get the main content of the page
  const article = document.querySelector('article') || document.body;
  
  // Remove unwanted elements
  const elementsToRemove = article.querySelectorAll(
    'script, style, noscript, iframe, img, svg, form, nav, footer, header, aside'
  );
  elementsToRemove.forEach(el => el.remove());

  // Get all text nodes
  const walker = document.createTreeWalker(
    article,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip if parent is hidden
        if (window.getComputedStyle(node.parentElement).display === 'none') {
          return NodeFilter.FILTER_REJECT;
        }
        // Skip if empty or only whitespace
        if (!node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let text = '';
  let node;
  while (node = walker.nextNode()) {
    text += node.textContent.trim() + '\n';
  }

  // Clean up the text
  text = text
    .replace(/(\n\s*){3,}/g, '\n\n') // Remove excessive newlines
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();

  console.log('Extracted content length:', text.length);
  return text;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  if (request.action === "extractContent") {
    const content = extractContent();
    console.log('Sending extracted content back to popup');
    sendResponse({ content });
  }
  return true;
}); 