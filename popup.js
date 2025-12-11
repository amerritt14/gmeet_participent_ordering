document.addEventListener('DOMContentLoaded', () => {
  const sortBtn = document.getElementById('sortBtn');
  const restoreBtn = document.getElementById('restoreBtn');
  const status = document.getElementById('status');
  const participantList = document.getElementById('participantList');

  // Check if we're on a Google Meet page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (!currentTab.url.includes('meet.google.com')) {
      showStatus('Please open this extension on a Google Meet page', 'error');
      sortBtn.disabled = true;
      restoreBtn.disabled = true;
    }
  });

  sortBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'sortByLastName' },
        (response) => {
          if (chrome.runtime.lastError) {
            showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
          } else if (response && response.success) {
            showStatus('Participants sorted by last name!', 'success');
            // Wait a bit for the DOM to update, then refresh the list
            setTimeout(() => {
              loadParticipants();
            }, 400);
          } else {
            showStatus('Failed to sort participants', 'error');
          }
        }
      );
    });
  });

  restoreBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'restoreOrder' },
        (response) => {
          if (chrome.runtime.lastError) {
            showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
          } else if (response && response.success) {
            showStatus('Original order restored!', 'success');
            // Wait a bit for the DOM to update, then refresh the list
            setTimeout(() => {
              loadParticipants();
            }, 400);
          } else {
            showStatus('Failed to restore order', 'error');
          }
        }
      );
    });
  });

  // Load and display participants
  loadParticipants();

  function loadParticipants() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0].url.includes('meet.google.com')) {
        return;
      }

      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'getParticipants' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error:', chrome.runtime.lastError);
            return;
          }

          if (response && response.participants) {
            displayParticipants(response.participants);
          }
        }
      );
    });
  }

  function displayParticipants(participants) {
    if (participants.length === 0) {
      participantList.innerHTML = '<p style="color: #5f6368; font-size: 13px;">No participants found. Make sure the participant list is visible in Google Meet.</p>';
      return;
    }

    const html = `
      <h3>Current Participants (${participants.length})</h3>
      <ul>
        ${participants.map(p => `<li>${p.name}</li>`).join('')}
      </ul>
    `;
    participantList.innerHTML = html;
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status ' + type;
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }
});
