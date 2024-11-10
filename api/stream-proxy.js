import httpProxyMiddleware from 'next-http-proxy-middleware';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    await httpProxyMiddleware(req, res, {
      target: 'https://rr.vipstreams.in',
      pathRewrite: {
        '^/api/stream-proxy': '', // remove the api prefix
      },
      changeOrigin: true,
      headers: {
        'Referer': 'https://embedme.top/',
        'Origin': 'https://embedme.top'
      },
    });
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error' });
  }
}