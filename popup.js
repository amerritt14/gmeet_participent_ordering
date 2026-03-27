document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const statusEl = document.getElementById('status');
  const errorEl = document.getElementById('error');

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab.url || !tab.url.includes('meet.google.com')) {
      statusEl.textContent = 'Open on a Google Meet page';
      toggleBtn.disabled = true;
      return;
    }

    // Get current panel state
    chrome.tabs.sendMessage(tab.id, { action: 'getPanelState' }, (response) => {
      if (chrome.runtime.lastError) {
        showError('Could not connect to page. Refresh the Meet tab.');
        return;
      }
      updateButton(response && response.visible);
      if (response && response.visible) {
        statusEl.textContent = `${response.count} participant(s) shown`;
      } else {
        statusEl.textContent = 'Panel is hidden';
      }
    });
  });

  toggleBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePanel' }, (response) => {
        if (chrome.runtime.lastError) {
          showError('Could not connect to page.');
          return;
        }
        updateButton(response && response.visible);
        statusEl.textContent = response && response.visible ? 'Panel visible' : 'Panel hidden';
      });
    });
  });

  function updateButton(isVisible) {
    if (isVisible) {
      toggleBtn.textContent = 'Hide Sorted Panel';
      toggleBtn.classList.add('active');
    } else {
      toggleBtn.textContent = 'Show Sorted Panel';
      toggleBtn.classList.remove('active');
    }
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    statusEl.textContent = '';
    toggleBtn.disabled = true;
  }
});
