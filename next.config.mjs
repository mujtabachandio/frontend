/** @type {import('next').NextConfig} */
const backendBase = (
  process.env.BACKEND_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

// Browser must call the API directly for SSE/streaming — Next rewrites buffer the body until complete.
// Mirror BACKEND_URL so one env var works for both rewrites and fetch/EventSource (see lib/api.js).
const publicBackend = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

const nextConfig = {
  env: {
    NEXT_PUBLIC_BACKEND_URL: publicBackend,
  },
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${backendBase}/api/v1/:path*` },
      { source: "/auth/:path*", destination: `${backendBase}/auth/:path*` },
      { source: "/pdf/:path*", destination: `${backendBase}/pdf/:path*` },
      { source: "/conversations", destination: `${backendBase}/conversations` },
      {
        source: "/conversations/:path*",
        destination: `${backendBase}/conversations/:path*`,
      },
      { source: "/chat", destination: `${backendBase}/chat` },
      { source: "/chat/:path*", destination: `${backendBase}/chat/:path*` },
      { source: "/saas/:path*", destination: `${backendBase}/saas/:path*` },
      { source: "/health", destination: `${backendBase}/health` },
    ];
  },
};

export default nextConfig;
