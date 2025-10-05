import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { TweetCard } from '@/components/TweetCard'
import {
  Grid3x3,
  List,
  Search,
  X,
  Trash2,
  Download,
  Upload,
  Calendar
} from 'lucide-react'

interface Post {
  url: string
  title?: string
  author?: string
  content?: string
  timestamp: number
}

export function History() {
  const [posts, setPosts] = useState<Post[]>([])
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')

  useEffect(() => {
    loadPosts()

    // Auto-detect theme
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', isDark)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleThemeChange = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches)
    }

    mediaQuery.addEventListener('change', handleThemeChange)
    return () => mediaQuery.removeEventListener('change', handleThemeChange)
  }, [])

  const loadPosts = async () => {
    const result = await chrome.storage.local.get(['trackedPosts', 'urls'])
    let allPosts = result.trackedPosts || []

    // Migration: Convert old URLs to post objects if needed
    if (allPosts.length === 0 && result.urls && result.urls.length > 0) {
      console.log('Migrating old URLs to post format...')
      allPosts = result.urls.map((url: string) => {
        const pathParts = url.split('/').filter(Boolean)
        const username = pathParts[2] || 'Unknown' // x.com/username/status/id
        return {
          url,
          author: '@' + username,
          content: '',
          timestamp: Date.now() - Math.random() * 86400000 // Random time in last 24h for migration
        }
      })
      // Save migrated data
      await chrome.storage.local.set({ trackedPosts: allPosts })
    }

    setPosts(allPosts)
    setFilteredPosts(allPosts)
  }

  // Real-time search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredPosts(posts)
      return
    }

    const filtered = posts.filter(post =>
      post.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredPosts(filtered)
  }, [searchTerm, posts])

  const clearSearch = () => {
    setSearchTerm('')
  }

  const togglePostSelection = (url: string) => {
    const newSelection = new Set(selectedPosts)
    if (newSelection.has(url)) {
      newSelection.delete(url)
    } else {
      newSelection.add(url)
    }
    setSelectedPosts(newSelection)
  }

  const deleteSelected = () => {
    if (selectedPosts.size === 0) return

    if (confirm(`Delete ${selectedPosts.size} selected posts?`)) {
      const remainingPosts = posts.filter(p => !selectedPosts.has(p.url))
      setPosts(remainingPosts)
      setFilteredPosts(remainingPosts)
      setSelectedPosts(new Set())
      chrome.storage.local.set({ trackedPosts: remainingPosts })
    }
  }

  const clearAll = () => {
    if (confirm('Clear all posts? This cannot be undone.')) {
      setPosts([])
      setFilteredPosts([])
      chrome.storage.local.remove(['trackedPosts'])
    }
  }

  const exportData = () => {
    const dataStr = JSON.stringify(posts, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `x-history-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target?.result as string)
            if (Array.isArray(imported)) {
              setPosts(imported)
              setFilteredPosts(imported)
              chrome.storage.local.set({ trackedPosts: imported })
            }
          } catch (err) {
            alert('Invalid file format')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const toggleSort = () => {
    const newSort = sortBy === 'newest' ? 'oldest' : 'newest'
    setSortBy(newSort)
    const sorted = [...filteredPosts].sort((a, b) =>
      newSort === 'newest'
        ? b.timestamp - a.timestamp
        : a.timestamp - b.timestamp
    )
    setFilteredPosts(sorted)
  }


  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="container max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">History Manager</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filteredPosts.length} posts
                {selectedPosts.size > 0 && ` (${selectedPosts.size} selected)`}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
                >
                  {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSort}
                  title={`Sort by ${sortBy === 'newest' ? 'oldest' : 'newest'}`}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={exportData}
                  title="Export data"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={importData}
                  title="Import data"
                >
                  <Upload className="h-4 w-4" />
                </Button>
                {selectedPosts.size > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={deleteSelected}
                    title="Delete selected"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  title="Clear all"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
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
      </div>

      <div className="container max-w-7xl mx-auto p-4">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts found</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
            {filteredPosts.map((post) => (
              <div
                key={post.url}
                className={`break-inside-avoid mb-4 cursor-pointer transition-all ${
                  selectedPosts.has(post.url) ? 'ring-2 ring-foreground rounded-lg' : ''
                }`}
                onClick={() => togglePostSelection(post.url)}
              >
                <TweetCard url={post.url} timestamp={post.timestamp} searchTerm={searchTerm} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPosts.map((post) => (
              <div
                key={post.url}
                className={`cursor-pointer transition-all ${
                  selectedPosts.has(post.url) ? 'ring-2 ring-foreground rounded-lg' : ''
                }`}
                onClick={() => togglePostSelection(post.url)}
              >
                <TweetCard url={post.url} timestamp={post.timestamp} searchTerm={searchTerm} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}