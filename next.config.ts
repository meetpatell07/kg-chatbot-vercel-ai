import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@chroma-core/default-embed',
    '@huggingface/transformers',
    'onnxruntime-node',
    'sharp',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize native dependencies for server-side
      config.externals = config.externals || [];
      config.externals.push({
        '@chroma-core/default-embed': 'commonjs @chroma-core/default-embed',
        '@huggingface/transformers': 'commonjs @huggingface/transformers',
        'onnxruntime-node': 'commonjs onnxruntime-node',
        'sharp': 'commonjs sharp',
      });
    }
    return config;
  },
};

export default nextConfig;
