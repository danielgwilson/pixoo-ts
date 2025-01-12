/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pixoo-ts/core'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to load Node.js modules on the client side
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        dns: false,
        http2: false,
        path: false,
        stream: false,
        http: false,
        crypto: false,
        zlib: false,
        querystring: false,
        buffer: false,
        timers: false,
        destroy: false,
        send: false,
        express: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
