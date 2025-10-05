class PostDatabase {
  constructor() {
    this.dbName = 'XHistoryDB';
    this.dbVersion = 1;
    this.storeName = 'posts';
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, {
            keyPath: 'url'
          });

          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('username', 'username', { unique: false });
          objectStore.createIndex('text', 'text', { unique: false });

          console.log('Post store created with indices');
        }
      };
    });
  }

  async savePost(postData) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const post = {
        url: postData.url,
        html: postData.html,
        text: postData.text || this.extractTextFromHtml(postData.html),
        username: postData.username || this.extractUsernameFromUrl(postData.url),
        timestamp: postData.timestamp || Date.now(),
        authorName: postData.authorName,
        authorUrl: postData.authorUrl,
        providerName: postData.providerName,
        providerUrl: postData.providerUrl,
        type: postData.type,
        width: postData.width,
        height: postData.height,
        version: postData.version,
        cacheControl: postData.cacheControl,
        fxData: postData.fxData,  // Save FxEmbed data if available
        savedAt: Date.now()
      };

      const request = store.put(post);

      request.onsuccess = () => {
        console.log('Post saved to IndexedDB:', post.url);
        resolve(post);
      };

      request.onerror = () => {
        console.error('Failed to save post:', request.error);
        reject(request.error);
      };
    });
  }

  async getPost(url) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(url);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getAllPosts() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async searchPosts(query) {
    if (!this.db) await this.init();

    const allPosts = await this.getAllPosts();

    if (!query || query.trim() === '') {
      return allPosts.sort((a, b) => b.timestamp - a.timestamp);
    }

    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);

    const filteredPosts = allPosts.filter(post => {
      const searchableText = [
        post.text || '',
        post.username || '',
        post.authorName || '',
        post.url || ''
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    });

    return filteredPosts.sort((a, b) => b.timestamp - a.timestamp);
  }

  async deletePost(url) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(url);

      request.onsuccess = () => {
        console.log('Post deleted from IndexedDB:', url);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async clearAll() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('All posts cleared from IndexedDB');
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  extractTextFromHtml(html) {
    if (!html) return '';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const blockquotes = tempDiv.querySelectorAll('blockquote.x-post');
    let text = '';

    blockquotes.forEach(blockquote => {
      const paragraphs = blockquote.querySelectorAll('p');
      paragraphs.forEach(p => {
        text += p.textContent + ' ';
      });
    });

    if (!text) {
      text = tempDiv.textContent || tempDiv.innerText || '';
    }

    return text.trim();
  }

  extractUsernameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        return pathParts[0];
      }
    } catch (e) {
      console.error('Failed to extract username from URL:', e);
    }
    return '';
  }

  async getPostsByUrls(urls) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const posts = [];
      let completed = 0;

      if (urls.length === 0) {
        resolve([]);
        return;
      }

      urls.forEach(url => {
        const request = store.get(url);

        request.onsuccess = () => {
          if (request.result) {
            posts.push(request.result);
          }
          completed++;
          if (completed === urls.length) {
            resolve(posts);
          }
        };

        request.onerror = () => {
          completed++;
          if (completed === urls.length) {
            resolve(posts);
          }
        };
      });
    });
  }
}

const postDB = new PostDatabase();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PostDatabase;
}