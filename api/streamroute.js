import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const { path } = req.query;
    
    // Ensure path is properly formatted
    if (!Array.isArray(path) || path.length < 2) {
      return res.status(400).json({ error: 'Invalid path format' });
    }

    // Extract source and id from path
    const [source, ...idParts] = path;
    const id = idParts.join('/');

    console.log('Fetching stream:', { source, id });

    const response = await fetch(`https://streamed.su/api/stream/${source}/${id}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://streamed.su/',
        'Origin': 'https://streamed.su'
      }
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Stream API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stream', 
      details: error.message,
      path: req.query.path 
    });
  }
}