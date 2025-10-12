import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/stations": ["./src/data/**/*.jsonl"],
    "/api/fairest": ["./src/data/**/*.jsonl"],
  },
};

export default nextConfig;
