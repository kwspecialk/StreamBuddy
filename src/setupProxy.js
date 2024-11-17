// In setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Existing proxy setup
  app.use(
    '/vidsrc',
    createProxyMiddleware({
      target: 'https://vidsrc.xyz',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/vidsrc': ''
      },
      onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('Referer', 'https://vidsrc.xyz');
        proxyReq.setHeader('Origin', 'https://vidsrc.xyz');
        // Add additional headers that might help
        proxyReq.setHeader('sec-fetch-site', 'same-origin');
        proxyReq.setHeader('sec-fetch-mode', 'cors');
      },
      onProxyRes: (proxyRes, req, res) => {
        // Handle CORS
        proxyRes.headers['access-control-allow-origin'] = '*';
        
        // Handle sandbox check specifically
        if (req.url.includes('sbx.html') || req.url.includes('sbx.js')) {
          // Provide a minimal response instead of 404
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('');
          return;
        }
      },
      onError: (err, req, res) => {
        console.warn('Proxy error:', err);
        // Don't fail completely, send an empty response
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('');
      }
    })
  );

  // Add specific handler for sandbox checks
  app.use(
    '/sbx',
    createProxyMiddleware({
      target: 'https://vidsrc.xyz',
      changeOrigin: true,
      secure: false,
      onProxyRes: (proxyRes, req, res) => {
        // Always return success for sandbox checks
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('');
      }
    })
  );
};