/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' https://vidsrc.sh https://*.vidsrc.sh;",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vidsrc.sh https://*.vidsrc.sh;",
              "frame-src 'self' https:;",
              "img-src 'self' * data: blob:;",
              "media-src 'self' * blob:;",
              "connect-src 'self' https://vidsrc.sh https://*.vidsrc.sh https://api.ppv.st;",
              "style-src 'self' 'unsafe-inline' https://vidsrc.sh https://*.vidsrc.sh;",
              "frame-ancestors 'self';",
              "worker-src 'self' blob: *;"
            ].join(' ')
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: '*'
          },
          {
            key: 'Access-Control-Expose-Headers',
            value: '*'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
      // Additional specific headers for API routes
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: '*' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      }
    ]
  },
  async rewrites() {
    return [
      // Video proxies
      {
        source: '/proxy/video',
        destination: '/api/proxy/video'
      },
      // VidSrc routes
      {
        source: '/api/vidsrc/:path*',
        destination: 'https://vidsrc.sh/:path*'
      },
      // Security bypass
      {
        source: '/cdn.vidsrc.stream/disable-devtool.min.js',
        destination: '/empty.js' // A blank file
      }
    ]
  },
  // Add response limit config for video proxying
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

module.exports = nextConfig;