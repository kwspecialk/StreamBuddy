// /api/stream-proxy/[...path].js
import httpProxyMiddleware from 'next-http-proxy-middleware';

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(200).end();
  }

  try {
    await httpProxyMiddleware(req, res, {
      target: 'https://rr.vipstreams.in',
      changeOrigin: true,
      pathRewrite: path => path.replace('/api/stream-proxy', ''),
      headers: {
        'Referer': 'https://embedme.top/',
        'Origin': 'https://embedme.top',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
      },
      onProxyRes: (proxyRes, req, res) => {
        // Add CORS headers
        proxyRes.headers['access-control-allow-origin'] = '*';
        proxyRes.headers['access-control-allow-methods'] = 'GET, HEAD, OPTIONS';
        proxyRes.headers['access-control-allow-headers'] = '*';
        proxyRes.headers['access-control-expose-headers'] = '*';
        
        // Remove restrictive headers
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];
        
        // Handle HLS content
        if (req.url.endsWith('.m3u8')) {
          proxyRes.headers['content-type'] = 'application/vnd.apple.mpegurl';
          
          // Modify m3u8 playlist contents to use our proxy
          let body = '';
          proxyRes.on('data', chunk => { body += chunk; });
          proxyRes.on('end', () => {
            // Replace all vipstreams URLs with our proxy URL
            const modifiedBody = body.replace(
              /https:\/\/rr\.vipstreams\.in\//g,
              '/api/stream-proxy/'
            );
            res.end(modifiedBody);
          });
          return;
        }
      },
      onError: (err, req, res) => {
        console.error('Stream proxy error:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          error: 'Stream proxy error',
          message: err.message
        }));
      }
    });
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy error' });
  }
}