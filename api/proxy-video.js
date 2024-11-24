import httpProxyMiddleware from 'next-http-proxy-middleware';

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default async function handler(req, res) {
  const targetUrl = decodeURIComponent(req.query.url);
  
  try {
    const baseUrl = new URL(targetUrl).origin;
    
    await httpProxyMiddleware(req, res, {
      target: baseUrl,
      changeOrigin: true,
      headers: {
        'Referer': 'https://vidsrc.xyz',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      pathRewrite: (path) => {
        return path.replace('/api/proxy-video', '');
      },
      onProxyReq: (proxyReq) => {
        // Remove origin and referer to avoid CORS issues
        proxyReq.removeHeader('origin');
        proxyReq.removeHeader('referer');
      },
      onProxyRes: (proxyRes) => {
        // Add CORS headers
        proxyRes.headers['access-control-allow-origin'] = '*';
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];
      },
    });
  } catch (error) {
    console.error('Error in video proxy:', error);
    res.status(500).json({ error: 'Failed to proxy video' });
  }
}