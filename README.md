# Google Meet Participant Sorter

A browser extension that sorts Google Meet participants alphabetically by last name with ascending or descending options.

## Features

- 📋 **Sort by Last Name** - Alphabetically sort participants A-Z or Z-A
- ⬆️⬇️ **Toggle Sort Direction** - Click to switch between ascending and descending
- 🔄 **Auto-Sort on Join** - Automatically re-sorts when new participants join the meeting
- 💾 **Restore Original Order** - Return to Google Meet's default ordering anytime
- 📊 **Visual Status Indicator** - See current sort state at a glance
- ⚡ **No Data Collection** - All sorting happens locally in your browser

## Installation

### From Browser Stores

- **Chrome Web Store**: [Coming Soon]
- **Firefox Add-ons**: [Coming Soon]
- **Safari**: Not available (Apple requires a $99/year developer membership for App Store distribution - see manual installation below instead)

### Manual Installation (Development)

#### Chrome/Edge/Brave

1. Download or clone this repository
2. Open `chrome://extensions/` in your browser
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select the extension folder
6. The extension icon will appear in your toolbar

#### Firefox/Zen

1. Download or clone this repository
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the extension folder
5. The extension will be loaded (temporary - removed on browser restart)

#### Safari

**Safari 17+ (macOS Sonoma and later)** supports loading web extensions in developer mode:

1. Download or clone this repository
2. Open **Safari**
3. Go to **Safari → Settings → Advanced**
4. Check **"Show features for web developers"** (or "Show Develop menu")
5. Go to **Develop → Developer Settings**
6. Check the Allow Unsigned Extensions option and enter your password
7. Click the "Add Temporary Extension" button
9. Navigate to and select the extension folder from step 1

## Usage

1. **Join a Google Meet** - Open any Google Meet meeting
2. **Click the Extension Icon** - Opens the control panel
3. **Click "Sort by Last Name"** - Sorts participants A-Z (ascending)
4. **Click Again** - Toggles to Z-A (descending)
5. **Restore Anytime** - Click "Restore Original Order" to undo sorting

The extension automatically opens the participant panel if it's closed and re-sorts the list when new people join.

## How It Works

The extension:
- Reads participant names from the Google Meet participant list (already visible on screen)
- Parses names into first and last components
- Reorders the DOM elements to display participants in sorted order
- Monitors for new participants and automatically re-sorts
- Stores the original order to allow restoration

**Privacy:** No data is collected, stored, or transmitted. All operations happen entirely within your browser.

## Troubleshooting

**Participants not showing:**
- Ensure you're on an active Google Meet call (`meet.google.com`)
- The extension will automatically open the participant panel
- Try refreshing the Google Meet page

**Sort not working:**
- Google may update their interface; extension updates may be needed
- Check browser console for errors (F12 → Console tab)

**Extension not appearing:**
- Make sure you're on a `meet.google.com` URL
- Reload the extension from the browser's extension management page

## Contributing

Contributions are welcome! Feel free to:
- Report bugs or issues
- Suggest new features
- Submit pull requests

## License

MIT License - See [LICENSE](LICENSE) file for details

## Support

For issues or questions, please open an issue on the [GitHub repository](https://github.com/amerritt14/gmeet_participent_ordering).
