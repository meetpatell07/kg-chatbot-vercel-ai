import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@chroma-core/default-embed',
    '@huggingface/transformers',
    'onnxruntime-node',
    'sharp',
  ],
  // Add empty turbopack config to silence the error
  // The serverExternalPackages above should handle externalization
  turbopack: {},
};

export default nextConfig;
