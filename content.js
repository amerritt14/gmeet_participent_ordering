// Content script for Google Meet participant sorted panel
console.log('Google Meet Participant Sorter loaded');

let panelVisible = false;
let panelElement = null;
let listElement = null;
let selectedName = null;
let countElement = null;
let isAscending = true;
let updateTimer = null;
let domObserver = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'togglePanel') {
    togglePanel();
    sendResponse({ visible: panelVisible });
  } else if (request.action === 'getPanelState') {
    sendResponse({ visible: panelVisible, count: getParticipantCount() });
  }
  return true;
});

function init() {
  createPanel();
  // Delay first update to let Meet's UI load
  setTimeout(updatePanel, 2000);
  startObserver();
}

function createPanel() {
  panelElement = document.createElement('div');
  panelElement.id = 'gmps-panel';
  panelElement.style.cssText = `
    position: fixed;
    top: 60px;
    left: 16px;
    width: 220px;
    max-height: calc(100vh - 80px);
    background: #202124;
    border: 1px solid #3c4043;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    z-index: 2147483647;
    display: none;
    flex-direction: column;
    font-family: 'Google Sans', Roboto, sans-serif;
    color: #e8eaed;
    overflow: hidden;
    user-select: none;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px 8px;
    border-bottom: 1px solid #3c4043;
    cursor: move;
    flex-shrink: 0;
  `;

  const titleRow = document.createElement('div');
  titleRow.style.cssText = 'display: flex; align-items: center; gap: 6px;';

  const title = document.createElement('span');
  title.textContent = 'Participants';
  title.style.cssText = 'font-size: 13px; font-weight: 500;';

  countElement = document.createElement('span');
  countElement.style.cssText = `
    font-size: 11px;
    background: #3c4043;
    border-radius: 10px;
    padding: 1px 6px;
    color: #9aa0a6;
  `;
  countElement.textContent = '0';

  titleRow.appendChild(title);
  titleRow.appendChild(countElement);

  // Sort toggle button
  const sortBtn = document.createElement('button');
  sortBtn.id = 'gmps-sort-btn';
  sortBtn.title = 'Toggle sort direction';
  sortBtn.style.cssText = `
    background: #3c4043;
    border: none;
    border-radius: 4px;
    color: #e8eaed;
    cursor: pointer;
    font-size: 11px;
    padding: 3px 7px;
    display: flex;
    align-items: center;
    gap: 3px;
  `;
  sortBtn.innerHTML = 'A–Z ▲';
  sortBtn.addEventListener('click', () => {
    isAscending = !isAscending;
    sortBtn.innerHTML = isAscending ? 'A–Z ▲' : 'Z–A ▼';
    renderList(collectParticipants());
  });

  header.appendChild(titleRow);
  header.appendChild(sortBtn);

  // Scrollable list
  listElement = document.createElement('div');
  listElement.id = 'gmps-list';
  listElement.style.cssText = `
    overflow-y: auto;
    padding: 6px 0;
    flex: 1;
  `;
  listElement.style.scrollbarWidth = 'thin';
  listElement.style.scrollbarColor = '#5f6368 transparent';

  // Close button row
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 6px 8px;
    border-top: 1px solid #3c4043;
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
  `;
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    color: #9aa0a6;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
  `;
  closeBtn.addEventListener('click', hidePanel);
  footer.appendChild(closeBtn);

  // Resize handle at the bottom
  const resizeHandle = document.createElement('div');
  resizeHandle.style.cssText = `
    height: 6px;
    cursor: ns-resize;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  resizeHandle.innerHTML = `<div style="width:24px;height:2px;border-radius:1px;background:#5f6368;"></div>`;

  panelElement.appendChild(header);
  panelElement.appendChild(listElement);
  panelElement.appendChild(footer);
  panelElement.appendChild(resizeHandle);
  document.body.appendChild(panelElement);

  makeDraggable(panelElement, header);
  makeResizable(panelElement, resizeHandle);
}

function makeDraggable(panel, handle) {
  let startX, startY, startLeft, startTop;
  handle.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    const rect = panel.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  });

  function onMove(e) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = Math.max(0, startLeft + dx) + 'px';
    panel.style.top = Math.max(0, startTop + dy) + 'px';
    panel.style.right = 'auto';
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
}

function makeResizable(panel, handle) {
  let startY, startHeight;

  handle.addEventListener('mousedown', (e) => {
    startY = e.clientY;
    startHeight = panel.getBoundingClientRect().height;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  });

  function onMove(e) {
    const newHeight = Math.max(120, startHeight + (e.clientY - startY));
    panel.style.maxHeight = newHeight + 'px';
    panel.style.height = newHeight + 'px';
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
}

function togglePanel() {
  panelVisible ? hidePanel() : showPanel();
}

function showPanel() {
  if (!panelElement) createPanel();
  panelElement.style.display = 'flex';
  panelVisible = true;
  updatePanel();
  // Poll every 4s as a fallback for cases the observer misses
  if (!updateTimer) {
    updateTimer = setInterval(updatePanel, 4000);
  }
}

function hidePanel() {
  if (panelElement) panelElement.style.display = 'none';
  panelVisible = false;
  clearInterval(updateTimer);
  updateTimer = null;
}


function getParticipantCount() {
  return collectParticipants().length;
}

function updatePanel() {
  if (!panelVisible) return;
  const participants = collectParticipants();
  renderList(participants);
}

function applyItemStyle(item, name, inCall) {
  const selected = selectedName === name;
  item.style.background = selected ? '#4a90d9' : 'transparent';
  item.style.color = selected ? '#ffffff' : '#e8eaed';
  item.style.fontWeight = selected ? '500' : 'normal';

  // Update presence dot
  const dot = item.querySelector('.gmps-dot');
  if (dot) {
    dot.style.background = inCall ? '#34a853' : '#ea4335';
    dot.title = inCall ? 'In the call' : 'Not yet joined';
  }
}

function renderList(participants) {
  if (!listElement) return;

  const sorted = [...participants].sort((a, b) => {
    const lnCmp = a.lastName.localeCompare(b.lastName);
    const fnCmp = a.firstName.localeCompare(b.firstName);
    const cmp = lnCmp !== 0 ? lnCmp : fnCmp;
    return isAscending ? cmp : -cmp;
  });

  countElement.textContent = sorted.length;

  // Remove any stale placeholder (e.g. "No participants found") before reusing items
  Array.from(listElement.children).forEach(child => {
    if (!child.dataset.name) child.remove();
  });

  // Reuse existing items to avoid flicker
  const existing = Array.from(listElement.children);

  sorted.forEach((p, i) => {
    let item = existing[i];
    if (!item) {
      item = document.createElement('div');
      item.style.cssText = `
        padding: 5px 12px;
        font-size: 13px;
        line-height: 1.4;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 7px;
      `;

      const dot = document.createElement('span');
      dot.className = 'gmps-dot';
      dot.style.cssText = `
        flex-shrink: 0;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
      `;

      const label = document.createElement('span');
      label.style.cssText = `
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;

      item.appendChild(dot);
      item.appendChild(label);

      item.addEventListener('click', () => {
        const name = item.dataset.name;
        selectedName = selectedName === name ? null : name;
        // Re-style all items to clear the previous selection
        Array.from(listElement.children).forEach(child => {
          applyItemStyle(child, child.dataset.name, child.dataset.inCall === 'true');
        });
      });
      listElement.appendChild(item);
    }
    item.dataset.name = p.name;
    item.dataset.inCall = p.inCall;
    const label = item.querySelector('span:last-child');
    if (label && label.textContent !== p.name) label.textContent = p.name;
    item.title = p.name;
    applyItemStyle(item, p.name, p.inCall);
  });

  // Remove extra items
  while (listElement.children.length > sorted.length) {
    listElement.removeChild(listElement.lastChild);
  }

  if (sorted.length === 0) {
    const msg = document.createElement('div');
    msg.style.cssText = 'padding: 8px 12px; font-size: 12px; color: #9aa0a6;';
    msg.textContent = 'No participants found';
    listElement.appendChild(msg);
  }
}

function collectParticipants() {
  const names = new Map(); // name -> {name, firstName, lastName, inCall}

  document.querySelectorAll('[data-participant-id]').forEach(el => {
    if (panelElement && panelElement.contains(el)) return;
    const moreBtn = el.querySelector('[aria-label^="More options for "]');
    if (!moreBtn) return;
    const label = moreBtn.getAttribute('aria-label').replace(/^More options for /, '');
    if (label) addName(names, label, /* inCall */ true);
  });

  return Array.from(names.values());
}

function addName(map, raw, inCall) {
  if (!raw) return;
  let name = cleanName(raw);
  if (!name || name.length < 2 || name.length > 80) return;

  // Skip pure numbers
  if (/^\d+$/.test(name)) return;

  // Collapse doubled names: "Mike FeyMike Fey" or "Sisi ChingSisi Ching" → first half
  // Handles both spaced and no-space doubling
  if (name.length % 2 === 0) {
    const half = name.slice(0, name.length / 2);
    if (half === name.slice(name.length / 2)) {
      name = half.trim();
    }
  }
  // Word-boundary doubled: "Mike Fey Mike Fey"
  const words = name.split(/\s+/);
  if (words.length >= 2 && words.length % 2 === 0) {
    const half = words.slice(0, words.length / 2).join(' ');
    if (half === words.slice(words.length / 2).join(' ')) {
      name = half;
    }
  }

  if (map.has(name)) {
    // Upgrade to inCall if confirmed by a tile; never downgrade
    if (inCall) map.get(name).inCall = true;
  } else {
    map.set(name, {
      name,
      firstName: parseFirstName(name),
      lastName: parseLastName(name),
      inCall,
    });
  }
}

function cleanName(raw) {
  return raw
    .replace(/\(You\)/gi, '')
    .replace(/\(Host\)/gi, '')
    .replace(/\(Organizer\)/gi, '')
    .replace(/Meeting host/gi, '')
    .replace(/domain_disabled/gi, '')
    .replace(/(Visitor|Guest|Presenter|Co-host)$/gi, '')
    .replace(/•/g, '')
    .replace(/[\n\r\t]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseFirstName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || '';
}

function parseLastName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

function startObserver() {
  // Debounced panel update on any DOM change in the meet UI
  let debounce = null;
  domObserver = new MutationObserver(() => {
    if (!panelVisible) return;
    clearTimeout(debounce);
    debounce = setTimeout(updatePanel, 500);
  });
  domObserver.observe(document.body, { childList: true, subtree: true });
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
