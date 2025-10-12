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

- **React 19** - Modern UI framework with hooks
- **TypeScript** - Type-safe development
- **Vite 7** - Lightning-fast build tool and dev server
- **@crxjs/vite-plugin** - Chrome extension development with HMR
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Accessible React component library (Button, Card, Input, ScrollArea)
- **Lucide React** - Icon library
- **Manifest V3** - Latest Chrome extension architecture
- **IndexedDB** - Local database for post caching with full-text search
- **FxTwitter API** - Enhanced post data with media, engagement stats, and metadata

## 🛠️ Installation

### For Users (Load Unpacked)

1. **Download** or clone this repository
2. **Install dependencies and build**:
   ```bash
   npm install
   npm run build
   ```
3. **Open Chrome** and navigate to `chrome://extensions/`
4. **Enable Developer Mode** (toggle in top right)
5. **Click "Load unpacked"** and select the `dist` folder
6. **Pin the extension** to your toolbar

> **Note**: This extension is distributed as "load unpacked" for maximum privacy and control. Your data stays completely local.

### For Developers

```bash
# Clone the repository
git clone https://github.com/yourusername/x-history.git
cd x-history

# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Development workflow:**
- `npm run dev` starts Vite dev server with HMR (Hot Module Replacement)
- Changes to React components auto-reload
- Extension reloads automatically with @crxjs/vite-plugin
- Build output goes to `dist/` folder

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
├── src/
│   ├── popup/             # Popup React app (500x600px)
│   │   ├── index.html     # Popup entry HTML
│   │   ├── index.tsx      # React root
│   │   └── Popup.tsx      # Main popup component with infinite scroll
│   ├── history/           # History page React app (full-page manager)
│   │   ├── index.html     # History entry HTML
│   │   ├── index.tsx      # React root
│   │   └── History.tsx    # Main history component with grid/list views
│   ├── components/        # Shared React components
│   │   ├── TweetCard.tsx  # Rich tweet display with media, engagement stats
│   │   └── ui/            # shadcn/ui components (button, card, input, scroll-area)
│   ├── hooks/             # React hooks
│   │   └── useTweetData.ts # FxTwitter API hook with localStorage cache
│   ├── utils/             # Utility functions
│   │   └── enrichPosts.ts # Post enrichment utilities
│   ├── background.ts      # Service worker (Manifest V3) - tracks x.com/*/status/*
│   ├── db.ts              # IndexedDB operations with full-text search
│   ├── sidebar.ts         # Legacy popup script (not used in React version)
│   └── index.css          # Global Tailwind styles
├── dist/                  # Vite build output (load this folder)
├── images/                # Extension icons (16, 48, 128)
├── manifest.json          # Manifest V3 config
├── vite.config.ts         # Vite configuration with @crxjs/vite-plugin
├── tailwind.config.js     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies
```

## 🔧 Development

### Key Technologies & Architecture

- **React 19** - Component-based UI with latest features and hooks
- **Vite 7** - Fast builds (~2s) and instant HMR
- **@crxjs/vite-plugin** - Chrome extension dev tools with hot reload
- **Tailwind CSS** - Utility-first styling with dark mode support
- **shadcn/ui** - Pre-built accessible components
- **Chrome Storage API** - Stores URLs array (`urls` key)
- **IndexedDB** - Caches full post data with text/username indices for search
- **FxTwitter API** - Fetches enhanced post metadata (no auth required)
- **Service Workers** - Background URL tracking via `webNavigation` API
- **localStorage** - Caches tweet data by post ID to reduce API calls

### Data Flow
1. **Background script** monitors x.com navigation → saves URLs to chrome.storage
2. **Popup/History** loads URLs → fetches from IndexedDB cache or FxTwitter API
3. **TweetCard** displays rich content with useTweetData hook → caches in localStorage

## 🔒 Privacy

- **100% Local Storage** - All data stays in your browser (chrome.storage, IndexedDB, localStorage)
- **No External Servers** - Only connects to X.com (for tracking) and FxTwitter API (for enrichment)
- **No Analytics/Tracking** - No telemetry, no third-party trackers
- **No Authentication** - FxTwitter API requires no keys or login
- **Easy Data Removal** - Clear all data with one click (clears all storage layers)
- **Export Your Data** - Full control with JSON export/import
- **Open Source** - Inspect the code, modify as needed

## 🐛 Troubleshooting

### Posts not being tracked?
- **Solution**: Ensure you're on `x.com` (not `twitter.com`)
- Check extension permissions in `chrome://extensions/`
- Look for navigation to URLs matching `x.com/{username}/status/{id}`
- Check background service worker logs in extension details

### Posts not showing rich content?
- **Solution**: FxTwitter API may be rate-limited or unavailable
- Posts will fallback to simple URL display
- Wait a few minutes and refresh
- Check browser console (F12) for API errors

### Search not finding posts?
- **Solution**: Search looks in IndexedDB cached posts only
- Posts must be viewed first (not just tracked) to be searchable
- Search is case-insensitive and matches text/username
- Try simpler search terms or reload posts

### Theme not applying?
- **Solution**: Check system theme preference
- Use manual theme toggle (🌙/☀️ button)
- Theme preference saved in localStorage

### Import/Export issues?
- **Export** creates JSON with all post URLs and metadata
- **Import** only accepts valid JSON arrays
- Large imports (>1000 posts) may take 10-30 seconds
- Extension may be unresponsive during import

### Extension icon not showing?
- **Solution**: Pin the extension in Chrome toolbar
- Check if extension is enabled in `chrome://extensions/`
- Reload the extension

## ⚠️ Known Issues & Technical Debt

- **Dual Storage Systems**: Both `urls` array (chrome.storage) and `trackedPosts` (chrome.storage) exist with migration logic - consider consolidating
- **Legacy Code**: [sidebar.ts](src/sidebar.ts) contains old non-React popup implementation (kept for reference, not actively used)
- **API Rate Limits**: FxTwitter API has no documented rate limits but may throttle - implement exponential backoff if needed
- **Media Display**: Videos may not work for private/deleted posts
- **Pagination**: History page loads all posts at once - consider virtualizing for 10k+ posts

## 📦 Distribution

This extension is designed for **load unpacked** distribution rather than Chrome Web Store:

### Why Load Unpacked?

- ✅ **Privacy First** - No review process, no external oversight
- ✅ **Full Control** - Users can inspect and modify code
- ✅ **Instant Updates** - Just rebuild and reload
- ✅ **No Restrictions** - Avoid Web Store policies and review delays
- ✅ **Developer Friendly** - Perfect for power users and developers

### Sharing with Others

To share this extension:

1. **Build the extension:**
   ```bash
   npm install
   npm run build
   ```

2. **Package the dist folder:**
   ```bash
   # Create a zip of the dist folder
   cd dist
   zip -r ../x-history-extension.zip .
   ```

3. **Share instructions with users:**
   - Extract the zip file
   - Go to `chrome://extensions/`
   - Enable Developer Mode
   - Click "Load unpacked"
   - Select the extracted folder

### Optional: Chrome Web Store

If you want to publish to Chrome Web Store later:

1. Update `manifest.json` with proper icons and descriptions
2. Create promotional images (1280x800, 640x400, etc.)
3. Create a developer account ($5 one-time fee)
4. Submit for review (1-2 weeks initial review)

For now, load unpacked is recommended for this privacy-focused tool.

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