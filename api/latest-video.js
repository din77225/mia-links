// Vercel serverless function — YouTube Data API v3
const https = require('https');

const CHANNEL_ID  = 'UCbeTqbTXZgokTvLN2KDK3uw';
const PLAYLIST_ID = 'UU' + CHANNEL_ID.slice(2);

// Collab IDs are fetched live from collabs.json in the meow-web repo.
// To add a new collab: edit meow-web/src/data/collabs.json and push — both sites update.
const COLLABS_JSON_URL = 'https://raw.githubusercontent.com/din77225/meow-web/main/src/data/collabs.json';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function formatCount(n) {
  n = parseInt(n, 10);
  if (isNaN(n))       return null;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M+';
  if (n >= 1_000)     return Math.floor(n / 1_000) + 'K+';
  return String(n);
}

function parseDuration(iso = '') {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1]||0)*3600) + (parseInt(m[2]||0)*60) + parseInt(m[3]||0);
}

function thumbFromSnippet(s) {
  return s?.thumbnails?.maxres?.url || s?.thumbnails?.standard?.url || s?.thumbnails?.high?.url || null;
}

function videoFromItem(item) {
  return {
    videoId:     item.id,
    title:       item.snippet.title,
    url:         `https://www.youtube.com/watch?v=${item.id}`,
    thumbnail:   thumbFromSnippet(item.snippet),
    publishedAt: item.snippet.publishedAt,
  };
}

module.exports = async function handler(req, res) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) { res.status(500).json({ error: 'Missing YOUTUBE_API_KEY' }); return; }

  try {
    const [playlistRes, collabsJson] = await Promise.all([
      fetchJson(
        `https://www.googleapis.com/youtube/v3/playlistItems` +
        `?part=snippet&playlistId=${PLAYLIST_ID}&maxResults=15&key=${key}`
      ),
      fetchJson(COLLABS_JSON_URL),
    ]);
    const playlistIds = (playlistRes.items || []).map(i => i.snippet.resourceId.videoId).join(',');
    const collabIds   = (Array.isArray(collabsJson) ? collabsJson : []).map(v => v.id).join(',');

    const [videoRes, channelRes, collabRes] = await Promise.all([
      fetchJson(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${playlistIds}&key=${key}`),
      fetchJson(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${CHANNEL_ID}&key=${key}`),
      collabIds ? fetchJson(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${collabIds}&key=${key}`) : Promise.resolve({ items: [] }),
    ]);

    const channelVideos = (videoRes.items || [])
      .filter(item => parseDuration(item.contentDetails?.duration) > 60)
      .map(videoFromItem);

    const top2Collabs = (collabRes.items || [])
      .map(videoFromItem)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 2);

    const videos = [...channelVideos, ...top2Collabs]
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 5);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    res.json({ videos, subscribers: formatCount(channelRes.items?.[0]?.statistics?.subscriberCount) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
