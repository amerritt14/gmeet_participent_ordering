// Content script for Google Meet participant sorting
console.log('Google Meet Participant Sorter loaded');

// Store original participant order
let originalOrder = [];
let isSorted = false;
let participantObserver = null;
let observedContainer = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getParticipants') {
    const participants = extractParticipants();
    console.log('Extracted participants:', participants);
    sendResponse({ participants: participants });
  } else if (request.action === 'sortByLastName') {
    sortParticipantsByLastName();
    sendResponse({ success: true });
  } else if (request.action === 'restoreOrder') {
    restoreOriginalOrder();
    sendResponse({ success: true });
  }
  return true;
});

function extractParticipants() {
  const participants = [];

  // Find the participant list container - Google Meet uses different structures
  // The participant list appears in a side panel, not the main button
  const participantContainers = [
    // Participant panel selectors (the actual list, not the button)
    'div[jsname="NEuNed"]', // Participant list panel
    'div[jscontroller="qeKFH"]', // Participant list controller
    'div[jsname="teTAFc"]', // Main participant panel
    // Look for elements with specific participant-related attributes
    '[data-participant-list]',
    '[aria-label*="participant" i][role="region"]',
    '[aria-label*="participant" i][role="complementary"]',
    // Fallback - look for common list structures
    'div[role="complementary"] [role="list"]',
    'aside [role="list"]',
    '[role="list"]'
  ];

  let container = null;
  for (const selector of participantContainers) {
    const elements = document.querySelectorAll(selector);
    // Find the one that's visible and likely contains participants
    for (const element of elements) {
      const text = element.textContent || '';
      // Check if it seems to contain participant info (has names or participant-related text)
      if (element.offsetParent !== null && text.length > 10) {
        container = element;
        console.log('Found participant container:', selector);
        break;
      }
    }
    if (container) break;
  }

  if (!container) {
    console.warn('Could not find participant container. Make sure the participant panel is open.');
    return participants;
  }

  // Find individual participant elements within the container
  // These are typically direct children or descendants with specific attributes
  const participantSelectors = [
    '[data-participant-id]',
    '[data-requested-participant-id]',
    'div[jscontroller][jsaction*="participant"]',
    'div[role="listitem"]'
  ];

  let participantElements = [];
  for (const selector of participantSelectors) {
    participantElements = Array.from(container.querySelectorAll(selector));
    console.log('Trying selector:', selector, 'Found:', participantElements.length);
    if (participantElements.length > 0) {
      console.log('Using participant elements with selector:', selector, 'Count:', participantElements.length);
      break;
    }
  }

  if (participantElements.length === 0) {
    console.warn('No participant elements found with any selector. Container HTML:', container.innerHTML.substring(0, 500));
  }

  // Filter to get actual participant items (not nested duplicates)
  const uniqueElements = new Set();
  participantElements.forEach((element) => {
    // Try to find the name text in various places
    let name = '';

    // Try different methods to extract the name
    const nameSources = [
      element.querySelector('[data-self-name]')?.getAttribute('data-self-name'),
      element.querySelector('[data-self-name]')?.textContent?.trim(),
      element.querySelector('div[jsname]')?.textContent?.trim(),
      element.getAttribute('data-tooltip'),
      element.getAttribute('aria-label'),
      element.textContent?.trim()
    ];

    for (const source of nameSources) {
      if (source && source.length > 0) {
        // Clean the name - remove extra info like "(You)", status icons, etc.
        name = source
          .replace(/\(You\)/i, '')
          .replace(/\(Host\)/i, '')
          .replace(/\(Organizer\)/i, '')
          .replace(/Meeting host$/i, '')
          .replace(/domain_disabled/gi, '')
          .replace(/Visitor$/gi, '')
          .replace(/Guest$/gi, '')
          .replace(/Presenter$/gi, '')
          .replace(/Co-host$/gi, '')
          .replace(/•/g, '')
          .replace(/\s+/g, ' ')  // Normalize multiple spaces
          .trim();

        // Validate it looks like a name (at least 2 chars, not too long, no newlines)
        if (name.length >= 2 && name.length < 100 && !name.includes('\n')) {
          break;
        }
      }
    }

    if (name && name.length > 0 && !uniqueElements.has(name)) {
      uniqueElements.add(name);
      participants.push({
        name: name,
        element: element,
        firstName: parseFirstName(name),
        lastName: parseLastName(name)
      });
    }
  });

  console.log('Unique participants found:', participants.length);
  return participants;
}

function parseFirstName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || '';
}

function parseLastName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return parts[0]; // If only one name, use it as last name too
}

function sortParticipantsByLastName() {
  // Try to open the participant panel if it's not already open
  ensureParticipantPanelOpen();

  // Wait a bit for the panel to open before extracting participants
  setTimeout(() => {
    const participants = extractParticipants();

    if (participants.length === 0) {
      console.warn('No participants found to sort');
      return;
    }

    console.log('Sorting participants:', participants.map(p => `${p.lastName}, ${p.firstName}`));

    // Clear previous state if we're re-sorting
    if (originalOrder.length > 0 && isSorted) {
      // Reset before sorting again
      originalOrder = [];
      isSorted = false;
    }

    // Store original order if not already stored
    if (originalOrder.length === 0) {
      originalOrder = participants.map(p => {
        const parent = p.element.parentNode;
        const children = Array.from(parent.children);
        const index = children.indexOf(p.element);
        return {
          element: p.element,
          parent: parent,
          originalIndex: index
        };
      });
      console.log('Stored original order for', originalOrder.length, 'participants');
    }

    // Sort by last name, then first name
    const sorted = [...participants].sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });

    // Get the parent container
    const parent = participants[0].element.parentNode;

    // Temporarily store all participant elements
    const allChildren = Array.from(parent.children);
    const participantSet = new Set(participants.map(p => p.element));
    const nonParticipants = allChildren.filter(child => !participantSet.has(child));

    // Remove all children but keep the elements in memory
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }

    // Add sorted participants
    sorted.forEach((participant) => {
      parent.appendChild(participant.element);
    });

    // Re-add any non-participant elements that were there
    nonParticipants.forEach(element => {
      parent.appendChild(element);
    });

    isSorted = true;
    console.log('Participants sorted by last name:', sorted.map(p => p.name));

    // Start observing for participant changes
    startObservingParticipants(parent);
  }, 300); // Wait 300ms for panel to open
}

function ensureParticipantPanelOpen() {
  // Look for the "People" button that opens the participant panel
  const peopleButtonSelectors = [
    'button[aria-label*="people" i]',
    'button[aria-label*="participant" i]',
    'button[data-tooltip*="people" i]',
    '[jsname="A5il2e"]', // Common jsname for people button
    'i[data-google-symbols-override="true"]:has-text("people")'
  ];

  for (const selector of peopleButtonSelectors) {
    const button = document.querySelector(selector);
    if (button) {
      // Check if panel is already open by looking for aria-pressed or aria-expanded
      const isPressed = button.getAttribute('aria-pressed') === 'true';
      const isExpanded = button.getAttribute('aria-expanded') === 'true';

      if (!isPressed && !isExpanded) {
        console.log('Opening participant panel...');
        button.click();
        return;
      } else {
        console.log('Participant panel already open');
        return;
      }
    }
  }

  console.log('Could not find people button to open panel');
}

function restoreOriginalOrder() {
  if (originalOrder.length === 0) {
    console.warn('No original order to restore');
    return;
  }

  console.log('Restoring original order for', originalOrder.length, 'participants');

  // Sort the stored order by original index
  const sortedOriginal = [...originalOrder].sort((a, b) => a.originalIndex - b.originalIndex);

  const parent = sortedOriginal[0].parent;
  const allChildren = Array.from(parent.children);
  const participantSet = new Set(sortedOriginal.map(o => o.element));
  const nonParticipants = allChildren.filter(child => !participantSet.has(child));

  // Remove all children but keep the elements in memory
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }

  sortedOriginal.forEach(({ element }) => {
    parent.appendChild(element);
  });

  // Re-add non-participants
  nonParticipants.forEach(element => {
    parent.appendChild(element);
  });

  // Clear the stored order
  originalOrder = [];
  isSorted = false;
  console.log('Original order restored');

  // Stop observing when not in sorted mode
  stopObservingParticipants();
}

function startObservingParticipants(container) {
  // Stop any existing observer
  stopObservingParticipants();

  if (!container) {
    console.warn('No container to observe');
    return;
  }

  observedContainer = container;

  // Create a MutationObserver to watch for new participants
  participantObserver = new MutationObserver((mutations) => {
    // Debounce the re-sort to avoid too many updates
    clearTimeout(participantObserver.timeout);
    participantObserver.timeout = setTimeout(() => {
      if (isSorted) {
        console.log('Participant list changed, re-sorting...');
        // Don't call sortParticipantsByLastName as it will create a new timeout
        // Instead, directly perform the sort
        performSort();
      }
    }, 500); // Wait 500ms after last change before re-sorting
  });

  // Observe the container for child additions/removals
  participantObserver.observe(container, {
    childList: true,
    subtree: true
  });

  console.log('Started observing participant changes');
}

function stopObservingParticipants() {
  if (participantObserver) {
    participantObserver.disconnect();
    participantObserver = null;
    observedContainer = null;
    console.log('Stopped observing participant changes');
  }
}

function performSort() {
  const participants = extractParticipants();

  if (participants.length === 0) {
    console.warn('No participants found to sort');
    return;
  }

  console.log('Re-sorting participants:', participants.map(p => `${p.lastName}, ${p.firstName}`));

  // Update original order with any new participants
  const currentParticipantSet = new Set(originalOrder.map(o => o.element));
  participants.forEach(p => {
    if (!currentParticipantSet.has(p.element)) {
      // New participant - add to original order
      const parent = p.element.parentNode;
      const children = Array.from(parent.children);
      const index = children.indexOf(p.element);
      originalOrder.push({
        element: p.element,
        parent: parent,
        originalIndex: index
      });
    }
  });

  // Sort by last name, then first name
  const sorted = [...participants].sort((a, b) => {
    const lastNameCompare = a.lastName.localeCompare(b.lastName);
    if (lastNameCompare !== 0) return lastNameCompare;
    return a.firstName.localeCompare(b.firstName);
  });

  // Get the parent container
  const parent = participants[0].element.parentNode;

  // Temporarily disconnect observer to avoid triggering during our changes
  const wasObserving = participantObserver !== null;
  if (wasObserving) {
    participantObserver.disconnect();
  }

  // Temporarily store all participant elements
  const allChildren = Array.from(parent.children);
  const participantSet = new Set(participants.map(p => p.element));
  const nonParticipants = allChildren.filter(child => !participantSet.has(child));

  // Remove all children but keep the elements in memory
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }

  // Add sorted participants
  sorted.forEach((participant) => {
    parent.appendChild(participant.element);
  });

  // Re-add any non-participant elements that were there
  nonParticipants.forEach(element => {
    parent.appendChild(element);
  });

  console.log('Participants re-sorted:', sorted.map(p => p.name));

  // Reconnect observer
  if (wasObserving) {
    participantObserver.observe(parent, {
      childList: true,
      subtree: true
    });
  }
}
