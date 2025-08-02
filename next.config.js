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
              "default-src 'self' https://vidsrc.xyz https://*.vidsrc.xyz https://streamed.pk https://embedme.top https://rr.vipstreams.in;",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vidsrc.xyz https://*.vidsrc.xyz;",
              "frame-src 'self' https://vidsrc.xyz https://*.vidsrc.xyz https://embedme.top https://*.embedme.top;",
              "img-src 'self' * data: blob:;",
              "media-src 'self' * blob:;",
              "connect-src 'self' https://vidsrc.xyz https://*.vidsrc.xyz https://streamed.pk https://embedme.top https://rr.vipstreams.in;",
              "style-src 'self' 'unsafe-inline' https://vidsrc.xyz https://*.vidsrc.xyz;",
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
      // Live sports streams
      {
        source: '/api/stream/:source/:id*',
        destination: 'https://streamed.pk/api/stream/:source/:id*'
      },
      {
        source: '/api/stream/:path*',
        destination: '/api/stream/:path*', // This will be handled by your API route
      },
      // Video proxies
      {
        source: '/proxy/embed/:path*',
        destination: 'https://embedme.top/embed/:path*'
      },
      {
        source: '/proxy/vip/:path*',
        destination: 'https://rr.vipstreams.in/:path*'
      },
      {
        source: '/proxy/video',
        destination: '/api/proxy/video'
      },
      // VidSrc routes
      {
        source: '/api/vidsrc/:path*',
        destination: 'https://vidsrc.xyz/:path*'
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