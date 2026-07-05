/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Next.js 14 `after()` for fire-and-forget async work (LLM pipeline enqueue, M2)
    after: true,
  },
};

export default nextConfig;
