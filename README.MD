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
- **Vite** - Lightning-fast build tool and dev server
- **@crxjs/vite-plugin** - Chrome extension development with HMR
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Accessible React component library
- **Manifest V3** - Latest Chrome extension architecture
- **IndexedDB** - Local database for post caching
- **FxTwitter API** - Enhanced post data fetching

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
│   ├── popup/             # Popup React app
│   │   ├── index.html     # Popup entry HTML
│   │   ├── index.tsx      # React root
│   │   └── Popup.tsx      # Main popup component
│   ├── history/           # History page React app
│   │   ├── index.html     # History entry HTML
│   │   ├── index.tsx      # React root
│   │   └── History.tsx    # Main history component
│   ├── components/        # Shared React components
│   │   ├── TweetCard.tsx  # Tweet display component
│   │   └── ui/           # shadcn/ui components
│   ├── hooks/            # React hooks
│   ├── utils/            # Utility functions
│   ├── background.ts     # Service worker
│   └── db.ts            # IndexedDB operations
├── dist/                 # Vite build output
├── images/              # Extension icons
├── manifest.json        # Manifest V3 config
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
└── package.json         # Dependencies
```

## 🔧 Development

### Key Technologies

- **React 19** - Component-based UI with latest features
- **Vite** - Fast builds and instant HMR
- **@crxjs/vite-plugin** - Chrome extension dev tools
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Pre-built accessible components
- **Chrome Storage API** - Persistent data storage
- **IndexedDB** - Full post data caching
- **FxTwitter API** - Enhanced post metadata
- **Service Workers** - Background processing (Manifest V3)

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