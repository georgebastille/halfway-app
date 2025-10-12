import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/stations": ["./src/data/**/*.jsonl"],
      "/api/fairest": ["./src/data/**/*.jsonl"],
    },
  },
};

export default nextConfig;
