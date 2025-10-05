import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useTweetData } from '@/hooks/useTweetData'
import { Heart, MessageCircle, Repeat2, ExternalLink } from 'lucide-react'

interface TweetCardProps {
  url: string
  timestamp: number
  searchTerm?: string
}

function formatNumber(num: number | undefined): string {
  if (!num) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / 60000)
    return `${diffMins}m`
  }
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

function highlightText(text: string, searchTerm?: string): string {
  if (!searchTerm) return text

  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedTerm})`, 'gi')
  return text.replace(regex, '<mark class="bg-accent text-accent-foreground font-medium">$1</mark>')
}

function linkifyText(text: string, searchTerm?: string): string {
  // First highlight search terms
  let processed = highlightText(text, searchTerm)

  // Then linkify (being careful not to linkify inside mark tags)
  processed = processed
    .replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" target="_blank" rel="noopener" class="text-primary hover:underline">${url}</a>`)
    .replace(/@(\w+)/g, '<a href="https://x.com/$1" target="_blank" rel="noopener" class="text-primary hover:underline">@$1</a>')
    .replace(/#(\w+)/g, '<a href="https://x.com/hashtag/$1" target="_blank" rel="noopener" class="text-primary hover:underline">#$1</a>')

  return processed
}

export function TweetCard({ url, timestamp, searchTerm }: TweetCardProps) {
  const { tweetData, loading, error } = useTweetData(url)

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 bg-muted rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                <div className="h-3 bg-muted rounded w-24"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded"></div>
              <div className="h-3 bg-muted rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !tweetData) {
    // Fallback to simple URL display
    return (
      <Card className="overflow-hidden hover:bg-accent/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Tweet</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(new Date(timestamp).toISOString())}
            </span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline break-all flex items-center gap-1"
          >
            {url}
            <ExternalLink className="h-3 w-3" />
          </a>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden hover:bg-accent/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {tweetData.author.avatar_url && (
            <img
              src={tweetData.author.avatar_url}
              alt={tweetData.author.name}
              className="w-12 h-12 rounded-full"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-sm">{tweetData.author.name}</span>
                  <span className="text-muted-foreground text-sm">@{tweetData.author.screen_name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(tweetData.created_at)}
                </span>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-2">
              <p
                className="text-sm whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: linkifyText(tweetData.text, searchTerm) }}
              />
            </div>

            {/* Media */}
            {tweetData.media?.photos && tweetData.media.photos.length > 0 && (
              <div className={`mt-3 ${tweetData.media.photos.length > 1 ? 'grid grid-cols-2 gap-1' : ''}`}>
                {tweetData.media.photos.map((photo, idx) => (
                  <img
                    key={idx}
                    src={photo.url}
                    alt="Tweet media"
                    className="rounded-lg w-full"
                  />
                ))}
              </div>
            )}

            {tweetData.media?.videos && tweetData.media.videos.length > 0 && (
              <video
                controls
                className="mt-3 rounded-lg w-full"
                src={tweetData.media.videos[0].url}
              />
            )}

            {/* Engagement stats */}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              {tweetData.replies !== undefined && (
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {formatNumber(tweetData.replies)}
                </div>
              )}
              {tweetData.retweets !== undefined && (
                <div className="flex items-center gap-1">
                  <Repeat2 className="h-3 w-3" />
                  {formatNumber(tweetData.retweets)}
                </div>
              )}
              {tweetData.likes !== undefined && (
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {formatNumber(tweetData.likes)}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}