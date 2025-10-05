// Utility to enrich existing posts with tweet data from FxTwitter
export async function enrichPostsWithTweetData(posts: any[]) {
  const enriched = await Promise.all(
    posts.map(async (post) => {
      // Skip if already has content
      if (post.content && post.content.trim()) {
        return post
      }

      // Extract tweet ID
      const match = post.url.match(/status\/(\d+)/)
      const tweetId = match ? match[1] : null

      if (!tweetId) {
        return post
      }

      try {
        // Fetch from FxTwitter
        const response = await fetch(`https://api.fxtwitter.com/status/${tweetId}`)
        if (!response.ok) throw new Error('Failed to fetch')

        const data = await response.json()
        const tweetData = data?.tweet

        if (tweetData) {
          return {
            ...post,
            content: tweetData.text || '',
            author: tweetData.author?.screen_name ? `@${tweetData.author.screen_name}` : post.author,
            authorName: tweetData.author?.name
          }
        }
      } catch (err) {
        console.error(`Failed to enrich post ${post.url}:`, err)
      }

      return post
    })
  )

  return enriched
}