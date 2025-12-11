# Google Meet Participant Sorter

A browser extension that allows you to sort Google Meet participants by last name.

## Features

- 📋 Sort participants alphabetically by last name
- 🔄 Restore original participant order
- 👀 View current participant list in the extension popup
- ⚡ Works directly on Google Meet pages

## Installation

### Chrome/Edge

1. Clone or download this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked"
5. Select the `gmeet_participent_ordering` folder
6. The extension icon should appear in your browser toolbar

### Firefox

1. Clone or download this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to the `gmeet_participent_ordering` folder and select the `manifest.json` file
5. The extension will be loaded temporarily

**Note:** For Firefox, you'll need to reload the extension each time you restart the browser. For a permanent installation, you'll need to sign the extension through Mozilla's Add-on Developer Hub.

## Usage

1. Join a Google Meet meeting
2. Open the participant list in Google Meet (click the "People" icon)
3. Click the extension icon in your browser toolbar
4. Click "Sort by Last Name" to alphabetically sort participants by their last name
5. Click "Restore Original Order" to return to the default ordering

## How It Works

The extension:
- Monitors Google Meet pages for participant information
- Extracts participant names from the DOM
- Parses names into first and last names
- Reorders the participant list elements in the DOM when you click sort
- Stores the original order so you can restore it

## Development

### Project Structure

```
gmeet_participent_ordering/
├── manifest.json       # Extension configuration
├── content.js         # Content script that runs on Meet pages
├── popup.html         # Extension popup UI
├── popup.css          # Popup styling
├── popup.js           # Popup logic
├── icons/             # Extension icons (placeholder)
└── README.md          # This file
```

### Adding Icons

The extension currently references placeholder icons. To add real icons:

1. Create PNG images in these sizes: 16x16, 48x48, and 128x128 pixels
2. Save them as `icon16.png`, `icon48.png`, and `icon128.png` in the `icons/` folder

You can create simple icons using any graphics editor, or generate them online.

## Troubleshooting

**Participants not showing up:**
- Make sure the participant list is open in Google Meet
- Google may update their DOM structure; the extension may need updates to work with new versions

**Extension not working:**
- Make sure you're on a `meet.google.com` URL
- Try refreshing the Google Meet page
- Check the browser console for errors (right-click → Inspect → Console)

**Sort not persisting:**
- The sort is visual only and resets when participants join/leave
- You may need to click sort again after the participant list updates

## Contributing

Feel free to open issues or submit pull requests with improvements!

## License

MIT License - feel free to use and modify as needed.
