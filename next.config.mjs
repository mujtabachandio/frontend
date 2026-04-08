/** @type {import('next').NextConfig} */
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
