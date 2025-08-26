# X History Extension

This Chrome extension tracks the X posts the user views and saves them for later viewing. When you click on the extension icon, a sidebar appears showing your browsing history.

## Features

- **Automatic Tracking**: Automatically saves X post URLs as you browse
- **Sidebar Interface**: Click the extension icon to show/hide a sidebar with your history
- **Dual View Modes**:
  - Simple URL list view
  - Embedded tweet view (with Twitter widgets)
- **Persistent Storage**: Your history is saved locally and persists between sessions
- **Easy Management**: Clear all history with one click

## Installation

### Method 1: Load Unpacked Extension (Recommended for Development)

1. **Download/Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** by toggling the switch in the top right
4. **Click "Load unpacked"** and select the folder containing this extension
5. **Verify Installation**: You should see "X History" in your extensions list

### Method 2: Install from Chrome Web Store (When Available)

1. Visit the Chrome Web Store
2. Search for "X History"
3. Click "Add to Chrome"

## Usage

### Basic Operation

1. **Navigate to X.com**: Visit any page on x.com
2. **Browse Posts**: Visit individual X posts (URLs like `https://x.com/username/status/123456789`)
3. **View History**: Click the extension icon in your browser toolbar
4. **Sidebar Appears**: A sidebar will slide in from the right showing your browsing history

### Sidebar Controls

- **Toggle View**: Switch between simple URL list and embedded tweet views
- **Clear**: Remove all saved history
- **Close**: Hide the sidebar (X button)

### How It Works

- The extension automatically detects when you visit X post URLs
- URLs are saved to local storage
- The sidebar displays your history in real-time
- You can switch between viewing modes for different experiences

## Testing

### Quick Test

1. Open the `test.html` file in your browser
2. Check the extension status
3. Navigate to x.com and browse some posts
4. Click the extension icon to see the sidebar

### Manual Testing

1. **Install the extension** using the instructions above
2. **Visit x.com** and navigate to any post
3. **Click the extension icon** - the sidebar should appear
4. **Browse more posts** to see them being tracked
5. **Test the sidebar controls** (toggle view, clear, close)

## Troubleshooting

### Common Issues

**Sidebar doesn't appear:**
- Make sure you're on x.com
- Check that the extension is enabled
- Try refreshing the page
- Check browser console for errors

**Extension icon not visible:**
- Verify the extension is installed in `chrome://extensions/`
- Make sure it's enabled
- Check if it's pinned to the toolbar

**Sidebar appears but is empty:**
- Browse some X posts first
- Check if you're on the correct domain (x.com)
- Verify the extension has storage permissions

**Extension crashes:**
- Refresh the page
- Restart your browser
- Reinstall the extension

### Debug Mode

1. Open Chrome DevTools (F12)
2. Go to the Console tab
3. Look for messages from the extension
4. Check for any error messages

## Technical Details

### Architecture

- **Manifest V3**: Modern Chrome extension architecture
- **Content Scripts**: Inject sidebar into X.com pages
- **Background Service Worker**: Handles extension logic and storage
- **Message Passing**: Communication between components

### Files Structure

```
├── manifest.json          # Extension configuration
├── background.js          # Service worker (background logic)
├── injectSidebar.js       # Content script (injects sidebar)
├── sidebar.html           # Sidebar HTML template
├── sidebar.js             # Sidebar functionality
├── styles.css             # Sidebar styling
├── twitter-widgets-loader.js # Twitter widgets integration
├── test.html              # Testing page
└── images/                # Extension icons
    ├── 16.png
    ├── 48.png
    └── 128.png
```

### Permissions

- **activeTab**: Access to current tab
- **webNavigation**: Track page navigation
- **storage**: Save browsing history locally
- **tabs**: Manage tab state
- **host_permissions**: Access to x.com and publish.twitter.com

## Development

### Making Changes

1. **Edit the source files**
2. **Reload the extension** in `chrome://extensions/`
3. **Test your changes** on x.com

### Key Components

- **injectSidebar.js**: Handles sidebar injection and visibility
- **sidebar.js**: Manages sidebar functionality and data display
- **background.js**: Handles extension lifecycle and storage

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Look for error messages in the browser console
3. Verify the extension is properly installed
4. Test with the provided test.html file

## License

This project is open source and available under the MIT License.
