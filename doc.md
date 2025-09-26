oEmbed API
The oEmbed API returns simple embed HTML in an oEmbed-compatible format. You can use the oEmbed API to programmatically return embedded content, such as Tweets and timelines. 

The response from the oEmbed API will return an HTML snippet that will be automatically recognized when X's widget JavaScript is included on the page.

Please note that the API is recommended for performing tasks in bulk, and we advise using our robust publish.twitter.com tool for embedding content.

Embedded timelines
Embedded Tweets







The returned HTML snippet will be automatically recognized as an embedded Tweet when X's widget JavaScript is included on the page. 

The oEmbed endpoint allows customization of the final appearance of an Embedded Tweet by setting the corresponding properties in HTML markup to be interpreted by X's JavaScript bundled with the HTML response by default. The format of the returned markup may change over time as X adds new features or adjusts its Tweet representation.

The Tweet fallback markup is meant to be cached on your servers for up to the suggested cache lifetime specified by the cache_age property.

Resource URL
https://publish.twitter.com/oembed

Resource Information
Response formats	JSON
Requires authentication?	No
Rate limited	No
Parameters
Name	Default	Description
urlrequired
String	 	The URL of the Tweet to be embedded
maxwidth
Int [220..550]	325	The maximum width of a rendered Tweet in whole pixels. A supplied value under or over the allowed range will be returned as the minimum or maximum supported width respectively; the reset width value will be reflected in the returned width property. Note that X does not support the oEmbed maxheight parameter. Tweets are fundamentally text, and are therefore of unpredictable height that cannot be scaled like an image or video. Relatedly, the oEmbed response will not provide a value for height. Implementations that need consistent heights for Tweets should refer to the hide_thread and hide_media parameters below.
hide_media
Boolean, String or Int	false	When set to true, "t", or 1 links in a Tweet are not expanded to photo, video, or link previews.
hide_thread
Boolean, String or Int	false	When set to true, "t", or 1 a collapsed version of the previous Tweet in a conversation thread will not be displayed when the requested Tweet is in reply to another Tweet.
omit_script
Boolean, String or Int	false	When set to true, "t", or 1 the <script> responsible for loading widgets.js will not be returned. Your webpages should include their own reference to widgets.js for use across all X widgets including Embedded Tweets.
align
Enum {left,right,center,none}	none	Specifies whether the embedded Tweet should be floated left, right, or center in the page relative to the parent element.
lang
Enum(Language)	en	Request returned HTML and a rendered Tweet in the specified X language supported by embedded Tweets.
theme
Enum {light, dark}	light	When set to dark, the Tweet is displayed with light text over a dark background.
dnt
Boolean	false	When set to true, the Tweet and its embedded page on your site are not used for purposes that include personalized suggestions and personalized ads.
Example Requests
curl --request GET --url 'https://publish.twitter.com/oembed?url=https%3A%2F%2Ftwitter.com%2Ftwiterdev'
twurl -H publish.twitter.com "/oembed?url=https://twitter.com/TwitterDev"
Example Response
{
  "url": "https:\/\/twitter.com\/Interior\/status\/463440424141459456",
  "author_name": "US Department of the Interior",
  "author_url": "https:\/\/twitter.com\/Interior",
  "html": "<blockquote class=\"twitter-tweet\"><p lang=\"en\" dir=\"ltr\">Sunsets don&#39;t get much better than this one over <a href=\"https:\/\/twitter.com\/GrandTetonNPS?ref_src=twsrc%5Etfw\">@GrandTetonNPS<\/a>. <a href=\"https:\/\/twitter.com\/hashtag\/nature?src=hash&amp;ref_src=twsrc%5Etfw\">#nature<\/a> <a href=\"https:\/\/twitter.com\/hashtag\/sunset?src=hash&amp;ref_src=twsrc%5Etfw\">#sunset<\/a> <a href=\"http:\/\/t.co\/YuKy2rcjyU\">pic.twitter.com\/YuKy2rcjyU<\/a><\/p>&mdash; US Department of the Interior (@Interior) <a href=\"https:\/\/twitter.com\/Interior\/status\/463440424141459456?ref_src=twsrc%5Etfw\">May 5, 2014<\/a><\/blockquote>\n<script async src=\"https:\/\/platform.twitter.com\/widgets.js\" charset=\"utf-8\"><\/script>\n",
  "width": 550,
  "height": null,
  "type": "rich",
  "cache_age": "3153600000",
  "provider_name": "Twitter",
  "provider_url": "https:\/\/twitter.com",
  "version": "1.0"
}