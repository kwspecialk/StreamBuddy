import httpProxyMiddleware from 'next-http-proxy-middleware';

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
    responseLimit: false
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
        'Referer': baseUrl,
        'Origin': baseUrl,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      pathRewrite: {
        '^/api/proxy/video': '',
      },
      // Enhanced response handling
      onProxyRes: (proxyRes, req, res) => {
        // Set CORS headers
        proxyRes.headers['access-control-allow-origin'] = '*';
        proxyRes.headers['access-control-allow-methods'] = 'GET, OPTIONS';
        proxyRes.headers['access-control-allow-headers'] = '*';
        proxyRes.headers['access-control-expose-headers'] = '*';
        
        // Remove problematic headers
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];
        
        // Handle HLS content specifically
        if (req.url.endsWith('.m3u8') || req.url.endsWith('.ts')) {
          proxyRes.headers['content-type'] = 'application/vnd.apple.mpegurl';
        }

        // Handle JavaScript files
        if (req.url.endsWith('.js')) {
          proxyRes.headers['content-type'] = 'application/javascript';
        }
      },
      // Enhanced error handling
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        
        // Send a more graceful error response
        if (!res.headersSent) {
          res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
        }
        
        res.end(JSON.stringify({
          error: 'Stream temporarily unavailable',
          code: 'PROXY_ERROR',
          details: err.message
        }));
      },
      // Add buffer handling for large responses
      buffer: {
        enabled: true,
        maxSize: 100 * 1024 * 1024 // 100MB buffer
      },
      // Add retry logic
      proxyTimeout: 10000,
      retry: {
        attempts: 3,
        delay: 1000
      }