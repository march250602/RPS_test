/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['ioredis', 'ws'],
};

module.exports = nextConfig;
