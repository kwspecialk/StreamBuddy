const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.get('/api/stream/*', async (req, res) => {
  try {
    const streamPath = req.params[0];
    const response = await fetch(`https://streamed.su/api/stream/${streamPath}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Stream API error:', error);
    res.status(500).json({ error: 'Failed to fetch stream' });
  }
});