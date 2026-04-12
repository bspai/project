/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "media-src 'self' https:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
