class TweetDatabase {
  constructor() {
    this.dbName = 'XHistoryDB';
    this.dbVersion = 1;
    this.storeName = 'tweets';
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

          console.log('Tweet store created with indices');
        }
      };
    });
  }

  async saveTweet(tweetData) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const tweet = {
        url: tweetData.url,
        html: tweetData.html,
        text: tweetData.text || this.extractTextFromHtml(tweetData.html),
        username: tweetData.username || this.extractUsernameFromUrl(tweetData.url),
        timestamp: tweetData.timestamp || Date.now(),
        authorName: tweetData.authorName,
        authorUrl: tweetData.authorUrl,
        providerName: tweetData.providerName,
        providerUrl: tweetData.providerUrl,
        type: tweetData.type,
        width: tweetData.width,
        height: tweetData.height,
        version: tweetData.version,
        cacheControl: tweetData.cacheControl,
        fxData: tweetData.fxData,  // Save FxEmbed data if available
        savedAt: Date.now()
      };

      const request = store.put(tweet);

      request.onsuccess = () => {
        console.log('Tweet saved to IndexedDB:', tweet.url);
        resolve(tweet);
      };

      request.onerror = () => {
        console.error('Failed to save tweet:', request.error);
        reject(request.error);
      };
    });
  }

  async getTweet(url) {
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

  async getAllTweets() {
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

  async searchTweets(query) {
    if (!this.db) await this.init();

    const allTweets = await this.getAllTweets();

    if (!query || query.trim() === '') {
      return allTweets.sort((a, b) => b.timestamp - a.timestamp);
    }

    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);

    const filteredTweets = allTweets.filter(tweet => {
      const searchableText = [
        tweet.text || '',
        tweet.username || '',
        tweet.authorName || '',
        tweet.url || ''
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    });

    return filteredTweets.sort((a, b) => b.timestamp - a.timestamp);
  }

  async deleteTweet(url) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(url);

      request.onsuccess = () => {
        console.log('Tweet deleted from IndexedDB:', url);
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
        console.log('All tweets cleared from IndexedDB');
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

    const blockquotes = tempDiv.querySelectorAll('blockquote.twitter-tweet');
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

  async getTweetsByUrls(urls) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const tweets = [];
      let completed = 0;

      if (urls.length === 0) {
        resolve([]);
        return;
      }

      urls.forEach(url => {
        const request = store.get(url);

        request.onsuccess = () => {
          if (request.result) {
            tweets.push(request.result);
          }
          completed++;
          if (completed === urls.length) {
            resolve(tweets);
          }
        };

        request.onerror = () => {
          completed++;
          if (completed === urls.length) {
            resolve(tweets);
          }
        };
      });
    });
  }
}

const tweetDB = new TweetDatabase();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TweetDatabase;
}