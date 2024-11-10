// pages/api/stream/[...path].js
export default async function handler(req, res) {
    const { path } = req.query;
    const url = `https://streamed.su/api/stream/${path.join('/')}`;
  
    try {
      const response = await fetch(url, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error('Error proxying stream request:', error);
      res.status(500).json({ error: 'Failed to fetch stream data' });
    }
  }