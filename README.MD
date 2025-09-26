# X History Chrome Extension

A Chrome extension that tracks and saves X (Twitter) posts you view, with full-text search, masonry grid layout, and offline caching.

## 🚀 Features

- **Automatic Post Tracking**: Automatically saves posts you view on X.com
- **Smart Caching**: Posts cached in IndexedDB for instant loading and offline access
- **Full-Text Search**: Search through saved posts by content, username, or keywords
- **Dual View Modes**:
  - **Masonry Grid View**: Pinterest-style responsive grid layout
  - **List View**: Compact single-column layout
- **History Manager**: Dedicated page for managing your entire post history
- **Dark/Light Theme**: Automatic theme detection with manual toggle
- **Infinite Scroll**: Smooth pagination (10 posts per page in history, 5 in popup)
- **Import/Export**: Backup and restore your post history as JSON
- **TypeScript**: Full type safety and better development experience
- **Manifest V3**: Future-proof with Chrome's latest extension architecture

## 📦 Tech Stack

- **TypeScript** - Type-safe development
- **Manifest V3** - Latest Chrome extension architecture
- **IndexedDB** - Local database for post caching
- **FxTwitter API** - Enhanced post data fetching
- **ES Modules** - Modern JavaScript modules
- **Masonry Layout** - Dynamic responsive grid

## 🛠️ Installation

### For Users

1. **Download** the latest release or clone this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** using the toggle in the top right
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** to your toolbar for easy access

### For Developers

```bash
# Clone the repository
git clone https://github.com/yourusername/x-history.git
cd x-history

# Install dependencies
npm install

# Build the TypeScript files
npm run build

# Watch for changes during development
npm run watch
```

## 💡 Usage

### Basic Operation

1. **Browse X.com** - Navigate and view posts normally
2. **Automatic Tracking** - Posts are automatically saved as you browse
3. **View History** - Click the extension icon to see recent posts
4. **History Manager** - Click 📋 button for full history page

### Features Guide

#### 🔍 Search
- Real-time search as you type
- Searches post content, usernames, and metadata
- Multi-word search (all terms must match)
- Clear button to reset search

#### 🎨 View Modes
- **Grid View**: Masonry layout with multiple columns
- **List View**: Single column with compact cards
- Toggle between views with the grid/list buttons

#### 📊 History Manager
- View all saved posts in one place
- Advanced filtering and sorting
- Export your data as JSON
- Import previously exported data
- Bulk management options

#### 🎨 Themes
- Automatic system theme detection
- Manual toggle with 🌙/☀️ button
- Persists across sessions

## 📂 Project Structure

```
X_history/
├── src/                    # TypeScript source files
│   ├── background.ts       # Service worker for URL tracking
│   ├── sidebar.ts          # Popup functionality
│   ├── history.ts          # History page logic
│   ├── db.ts              # IndexedDB operations
│   └── shared-post-list.ts # Shared rendering logic
├── dist/                   # Compiled JavaScript
├── images/                 # Extension icons
├── manifest.json          # Manifest V3 configuration
├── popup.html             # Popup interface
├── history.html           # History manager page
├── *.css                  # Stylesheets
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

## 🔧 Development

### Commands

```bash
# Build TypeScript
npm run build

# Watch mode for development
npm run watch

# Clean build directory
npm run clean

# Development mode (build + watch)
npm run dev
```

### Key Technologies

- **Chrome Storage API** - URL list persistence
- **IndexedDB** - Full post data caching
- **FxTwitter API** - Enhanced post metadata
- **Service Workers** - Background processing (Manifest V3)
- **MutationObserver** - Dynamic content handling

## 🔒 Privacy

- **100% Local Storage** - All data stays in your browser
- **No External Servers** - Only connects to X.com and FxTwitter API
- **No Analytics/Tracking** - Your privacy is respected
- **Easy Data Removal** - Clear all data with one click
- **Export Your Data** - Full control over your information

## 🐛 Troubleshooting

### Posts not showing in grid view?
- Wait a moment for posts to load
- Try switching to list view and back
- Check browser console for errors

### Search not finding posts?
- Ensure posts are fully loaded first
- Search is case-insensitive
- Try simpler search terms

### Extension not tracking posts?
- Make sure you're on x.com (not twitter.com)
- Check extension permissions
- Reload the extension

### Import/Export issues?
- Export creates a JSON file with all post data
- Import only accepts properly formatted JSON
- Large imports may take a moment

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section above
2. Open browser DevTools (F12) for error details
3. Create an issue on GitHub
4. Include console logs and steps to reproduce

---

**Note**: This extension requires Chrome/Edge with Manifest V3 support (Chrome 88+)