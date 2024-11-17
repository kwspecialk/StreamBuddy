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
              "default-src 'self' https://vidsrc.xyz https://*.vidsrc.xyz;",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vidsrc.xyz https://*.vidsrc.xyz;",
              "frame-src 'self' https://vidsrc.xyz https://*.vidsrc.xyz;",
              "img-src 'self' * data: blob:;",
              "media-src 'self' * blob:;",
              "connect-src 'self' https://vidsrc.xyz https://*.vidsrc.xyz;",
              "style-src 'self' 'unsafe-inline' https://vidsrc.xyz https://*.vidsrc.xyz;",
              "frame-ancestors 'self';",
              "worker-src 'self' blob: *;"
            ].join(' ')
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          }
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/proxy/stream/:path*',
        destination: 'https://streamed.su/api/stream/:path*'
      },
      {
        source: '/proxy/embed/:path*',
        destination: 'https://embedme.top/embed/:path*'
      },
      {
        source: '/proxy/vip/:path*',
        destination: 'https://rr.vipstreams.in/:path*'
      },
      {
        source: '/api/vidsrc/:path*',
        destination: 'https://vidsrc.xyz/:path*'
      }
    ]
  },
  async additionalHeaders() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      }
    ]
  }
}

module.exports = {
  async rewrites() {
    return [
      {
        source: '/proxy/video',
        destination: '/api/proxy/video'
      }
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
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
          }
        ],
      },
    ];
  }
};