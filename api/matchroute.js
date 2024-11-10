// pages/api/matches/[...path].js
export default async function handler(req, res) {
    const { path } = req.query;
    const url = `https://streamed.su/api/matches/${path.join('/')}`;
  
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
      console.error('Error proxying matches request:', error);
      res.status(500).json({ error: 'Failed to fetch matches data' });
    }
  }