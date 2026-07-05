/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // /prompts/analyze.md is read at runtime by the analysis pipeline — ensure
    // it is included in the serverless bundle (F3: prompts as editable files).
    outputFileTracingIncludes: {
      "/api/analyze": ["./prompts/**"],
      "/posts/new": ["./prompts/**"],
      "/posts/[handle]/edit": ["./prompts/**"],
    },
  },
};

export default nextConfig;
