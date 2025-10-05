import { useState, useEffect } from 'react'

interface TweetAuthor {
  name: string
  screen_name: string
  avatar_url: string
}

interface TweetMedia {
  photos?: Array<{ url: string }>
  videos?: Array<{ url: string }>
}

interface TweetData {
  text: string
  author: TweetAuthor
  created_at: string
  media?: TweetMedia
  likes?: number
  retweets?: number
  replies?: number
}

interface FxTwitterResponse {
  tweet: TweetData
}

export function useTweetData(url: string) {
  const [tweetData, setTweetData] = useState<TweetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) {
      setLoading(false)
      return
    }

    const fetchTweetData = async () => {
      try {
        // Extract post ID from URL
        const match = url.match(/status\/(\d+)/)
        const postId = match ? match[1] : null

        if (!postId) {
          throw new Error('Invalid tweet URL')
        }

        // Check cache first
        const cacheKey = `tweet_${postId}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const data = JSON.parse(cached)
          setTweetData(data)
          setLoading(false)
          return
        }

        // Fetch from FxTwitter API
        const response = await fetch(`https://api.fxtwitter.com/status/${postId}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch tweet: ${response.status}`)
        }

        const data: FxTwitterResponse = await response.json()

        if (data?.tweet) {
          // Cache the result
          localStorage.setItem(cacheKey, JSON.stringify(data.tweet))
          setTweetData(data.tweet)
        } else {
          throw new Error('Invalid response from FxTwitter')
        }
      } catch (err) {
        console.error('Error fetching tweet data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch tweet')
      } finally {
        setLoading(false)
      }
    }

    fetchTweetData()
  }, [url])

  return { tweetData, loading, error }
}