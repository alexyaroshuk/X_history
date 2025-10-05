import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { TweetCard } from '@/components/TweetCard'
import { enrichPostsWithTweetData } from '@/utils/enrichPosts'
import { Search, X, Eye, EyeOff, Trash2, FileText } from 'lucide-react'

interface Post {
  url: string
  title?: string
  author?: string
  content?: string
  timestamp: number
}

export function Popup() {
  const [posts, setPosts] = useState<Post[]>([])
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isDark, setIsDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  const [viewMode, setViewMode] = useState<'simple' | 'embedded'>('embedded')
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const POSTS_PER_PAGE = 10

  useEffect(() => {
    loadPosts()
    loadViewMode()

    // Auto-detect theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleThemeChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches)
      document.documentElement.classList.toggle('dark', e.matches)
    }

    // Set initial theme
    document.documentElement.classList.toggle('dark', isDark)

    mediaQuery.addEventListener('change', handleThemeChange)
    return () => mediaQuery.removeEventListener('change', handleThemeChange)
  }, [])


  const loadViewMode = () => {
    chrome.storage.local.get(['viewMode'], (result) => {
      const mode = result.viewMode || 'embedded'
      console.log('Loading view mode:', mode)
      setViewMode(mode)
    })
  }

  const loadPosts = async () => {
    const result = await chrome.storage.local.get(['trackedPosts', 'urls'])
    console.log('Storage data:', result)
    let allPosts = result.trackedPosts || []

    // Migration: Convert old URLs to post objects if needed
    if (allPosts.length === 0 && result.urls && result.urls.length > 0) {
      console.log('Migrating old URLs to post format...')
      allPosts = result.urls.map((url: string) => {
        const urlParts = new URL(url)
        const pathParts = urlParts.pathname.split('/').filter(Boolean)
        const username = pathParts[0] || 'Unknown' // First part after x.com/
        return {
          url,
          author: '@' + username,
          content: '',
          timestamp: Date.now() - Math.random() * 86400000 // Random time in last 24h for migration
        }
      })
      // Save migrated data
      await chrome.storage.local.set({ trackedPosts: allPosts })
      console.log('Migrated posts:', allPosts)
    }

    // Enrich posts without content
    const postsNeedingEnrichment = allPosts.filter((p: Post) => !p.content || !p.content.trim())
    if (postsNeedingEnrichment.length > 0) {
      console.log(`Enriching ${postsNeedingEnrichment.length} posts...`)
      const enriched = await enrichPostsWithTweetData(allPosts)
      allPosts = enriched

      // Save enriched data back to storage
      await chrome.storage.local.set({ trackedPosts: allPosts })
    }

    console.log('Loading posts:', allPosts)
    setPosts(allPosts)
    setDisplayedPosts(allPosts.slice(0, POSTS_PER_PAGE))
    setHasMore(allPosts.length > POSTS_PER_PAGE)
  }

  const loadMorePosts = useCallback(() => {
    if (loading || !hasMore) return
    setLoading(true)

    setTimeout(() => {
      const currentLength = displayedPosts.length
      const morePosts = posts.slice(currentLength, currentLength + POSTS_PER_PAGE)
      setDisplayedPosts(prev => [...prev, ...morePosts])
      setHasMore(currentLength + morePosts.length < posts.length)
      setLoading(false)
    }, 300)
  }, [loading, hasMore, displayedPosts, posts])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMorePosts()
        }
      },
      { threshold: 0.1 }
    )

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current)
    }

    observerRef.current = observer

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loadMorePosts])


  const toggleViewMode = () => {
    const newMode = viewMode === 'simple' ? 'embedded' : 'simple'
    setViewMode(newMode)
    chrome.storage.local.set({ viewMode: newMode })
  }

  const clearAll = () => {
    if (confirm('Clear all saved posts?')) {
      chrome.storage.local.remove(['trackedPosts'], () => {
        setPosts([])
        setDisplayedPosts([])
      })
    }
  }

  const openHistory = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/history/index.html') })
  }

  // Real-time search
  useEffect(() => {
    if (!searchTerm) {
      setDisplayedPosts(posts.slice(0, POSTS_PER_PAGE))
      setHasMore(posts.length > POSTS_PER_PAGE)
      return
    }

    const filtered = posts.filter(post =>
      post.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setDisplayedPosts(filtered)
    setHasMore(false)
  }, [searchTerm, posts])

  const clearSearch = () => {
    setSearchTerm('')
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="w-[500px] h-[600px] bg-background">
      <div className="flex flex-col h-full">
        <div className="border-b">
          <div className="flex items-center justify-between p-4">
            <div>
              <h2 className="text-lg font-semibold">X History</h2>
              <p className="text-sm text-muted-foreground">Posts you recently viewed</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={openHistory}
                title="Open History Manager"
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearAll}
                title="Clear All"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleViewMode}
                title="Toggle View"
              >
                {viewMode === 'simple' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 pb-4">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-20"
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearSearch}
                    className="h-8 w-8"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          {displayedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <p className="text-muted-foreground">
                You have not read any posts. Start browsing at{' '}
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  x.com
                </a>
              </p>
            </div>
          ) : (
            <div className="py-4 space-y-3">
              <div className="text-xs text-muted-foreground mb-2">
                Showing {displayedPosts.length} posts
              </div>
              {displayedPosts.map((post, index) => (
                viewMode === 'simple' ? (
                  <Card key={index} className="overflow-hidden hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all"
                      >
                        {post.url}
                      </a>
                    </CardContent>
                  </Card>
                ) : (
                  <TweetCard
                    key={index}
                    url={post.url}
                    timestamp={post.timestamp}
                    searchTerm={searchTerm}
                  />
                )
              ))}

              {loading && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Card key={`skeleton-${i}`} className="h-20 animate-pulse bg-muted/50" />
                  ))}
                </div>
              )}

              <div ref={sentinelRef} className="h-1" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}