/** @type {import('next').NextConfig} */
// Proxy /api/v1/* → BACKEND_URL (see `.env`, or host env).
const backendBase = (
  process.env.BACKEND_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendBase}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;