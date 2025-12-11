document.addEventListener('DOMContentLoaded', () => {
  const sortBtn = document.getElementById('sortBtn');
  const restoreBtn = document.getElementById('restoreBtn');
  const status = document.getElementById('status');
  const participantList = document.getElementById('participantList');
  const sortIndicator = document.getElementById('sortIndicator');
  const sortArrow = document.getElementById('sortArrow');

  let isAscending = true; // Track current sort direction

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
    // Get current sort state first
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'getSortState' },
        (stateResponse) => {
          // If already sorted, toggle the direction. Otherwise, start with ascending
          if (stateResponse && stateResponse.isSorted) {
            isAscending = !stateResponse.isAscending;
          } else {
            isAscending = true; // First sort is always ascending
          }

          // Update arrow visual
          if (isAscending) {
            sortArrow.classList.remove('descending');
            sortArrow.textContent = '▲';
          } else {
            sortArrow.classList.add('descending');
            sortArrow.textContent = '▼';
          }

          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: 'sortByLastName', ascending: isAscending },
            (response) => {
              if (chrome.runtime.lastError) {
                showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
              } else if (response && response.success) {
                showStatus(`Participants sorted ${isAscending ? 'A-Z' : 'Z-A'}!`, 'success');
                // Wait a bit for the DOM to update, then refresh the list
                setTimeout(() => {
                  loadParticipants();
                  updateSortStatus();
                }, 400);
              } else {
                showStatus('Failed to sort participants', 'error');
              }
            }
          );
        }
      );
    });
  });

  restoreBtn.addEventListener('click', () => {
    // Reset to ascending when restoring
    isAscending = true;
    sortArrow.classList.remove('descending');
    sortArrow.textContent = '▲';

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
              updateSortStatus();
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
  updateSortStatus();

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

  function updateSortStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0].url.includes('meet.google.com')) {
        return;
      }

      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'getSortState' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error:', chrome.runtime.lastError);
            return;
          }

          if (response) {
            if (response.isSorted) {
              const direction = response.isAscending ? 'A-Z' : 'Z-A';
              sortIndicator.textContent = `Sorted by last name (${direction})`;
              sortIndicator.classList.add('sorted');

              // Sync arrow with actual state
              isAscending = response.isAscending;
              if (response.isAscending) {
                sortArrow.classList.remove('descending');
                sortArrow.textContent = '▲';
              } else {
                sortArrow.classList.add('descending');
                sortArrow.textContent = '▼';
              }
            } else {
              sortIndicator.textContent = 'Default order';
              sortIndicator.classList.remove('sorted');
            }
          }
        }
      );
    });
  }

  function displayParticipants(participants) {
    // Clear existing content
    participantList.textContent = '';

    if (participants.length === 0) {
      const message = document.createElement('p');
      message.style.color = '#5f6368';
      message.style.fontSize = '13px';
      message.textContent = 'No participants found. Make sure the participant list is visible in Google Meet.';
      participantList.appendChild(message);
      return;
    }

    // Create heading
    const heading = document.createElement('h3');
    heading.textContent = `Current Participants (${participants.length})`;
    participantList.appendChild(heading);

    // Create list
    const ul = document.createElement('ul');
    participants.forEach(p => {
      const li = document.createElement('li');
      li.textContent = p.name;
      ul.appendChild(li);
    });
    participantList.appendChild(ul);
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status ' + type;
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }
});
