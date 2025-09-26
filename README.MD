# X History Chrome Extension

A Chrome extension that tracks and saves X posts you view, with full-text search capabilities and offline caching.

## Features

- **Automatic Post Tracking**: Automatically saves URLs of posts you view on X.com
- **IndexedDB Caching**: All posts are cached locally for instant loading and offline access
- **Full-Text Search**: Search through your saved posts by keywords (username, content, etc.)
- **Dual View Modes**:
  - Simple URL list view for quick scanning
  - Embedded post view with full X card rendering
- **Dark/Light Theme**: Automatic theme detection with manual toggle
- **Pagination**: Efficient infinite scroll loading (5 posts at a time)
- **Persistent Storage**: Your history is saved locally in Chrome storage and IndexedDB
- **Offline Support**: Cached posts load instantly without network requests

## Installation

### Method 1: Load Unpacked Extension (Development)

1. **Download/Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** by toggling the switch in the top right
4. **Click "Load unpacked"** and select the folder containing this extension
5. **Pin the extension** to your toolbar for easy access

## Usage

### Basic Operation

1. **Browse X.com**: Navigate to X.com and view posts normally
2. **Automatic Tracking**: The extension automatically saves post URLs as you browse
3. **View History**: Click the extension icon in your toolbar to open the popup
4. **Search Posts**: Use the search bar to find specific posts

### Controls

- **Search Bar**: Enter keywords to filter posts (searches text content, usernames, etc.)
- **Clear Search**: Click the X button to reset search and view all posts
- **Toggle View**: Switch between simple URL list and embedded post views
- **Theme Toggle**: Switch between light and dark themes
- **Clear All**: Remove all saved history (requires confirmation)

### Search Functionality

- Search is case-insensitive
- Searches across post content, usernames, and URLs
- Multi-word search (all terms must match)
- Results update instantly as you type
- Shows count of matching posts

### Caching Strategy

1. **First Visit**: Post is fetched from X's oEmbed API
2. **Cached**: Post data and HTML stored in IndexedDB
3. **Subsequent Views**: Loads instantly from cache without network requests
4. **Offline Ready**: Works without internet for previously viewed posts

## Files Structure

```
├── manifest.json          # Extension configuration (Manifest V2)
├── background.js          # Background script for URL tracking
├── popup.html           # Popup HTML interface
├── sidebar.js             # Main popup functionality
├── db.js                  # IndexedDB operations for caching
├── styles.css             # Styling for popup interface
├── theme-init.js          # Theme initialization
├── content.js             # Content script (if needed)
├── injectSidebar.js       # Legacy sidebar injection
└── images/                # Extension icons
    ├── 16.png
    ├── 48.png
    └── 128.png
```

## Technical Details

### Architecture

- **Manifest V2**: Chrome extension using Manifest V2
- **IndexedDB**: Local database for post caching and search
- **Chrome Storage API**: For URL list persistence
- **X oEmbed API**: For fetching post content
- **Background Script**: Monitors navigation and saves post URLs

### Permissions

- **activeTab**: Access to current tab
- **webNavigation**: Track page navigation
- **storage**: Save browsing history locally
- **tabs**: Manage tab state
- **X domains**: Access to X's API endpoints

### Data Storage

- **Chrome Storage**: List of post URLs
- **IndexedDB**: Full post data including:
  - HTML content
  - Post text
  - Author information
  - Metadata
  - Timestamps

## Troubleshooting

### Extension popup is empty
- Browse some posts on X.com first
- Check if you're on the correct domain (x.com)
- Ensure the extension has proper permissions

### Search not working
- Make sure posts are cached (view them first)
- Try refreshing the extension popup
- Check browser console for errors

### Posts not loading
- Check your internet connection for first-time loads
- Verify X's API is accessible
- Try clearing cache and reloading

## Privacy

- **All data is stored locally** in your browser
- **No external servers** involved (except X's API)
- **No tracking or analytics**
- **Data never leaves your device**
- Clear button removes all stored data permanently

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Open browser console (F12) for error messages
3. Try reloading the extension
4. Report issues at the project repository

## License

This project is open source and available under the MIT License.