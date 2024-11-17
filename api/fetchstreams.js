import fetch from 'node-fetch';

// pages/api/stream/[...path].js
export default async function handler(req, res) {
  try {
    const { path } = req.query;
    const streamId = path.join('/');
    
    const response = await fetch(`https://streamed.su/api/stream/${streamId}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Stream API error:', error);
    res.status(500).json({ error: 'Failed to fetch stream', details: error.message });
  }
}