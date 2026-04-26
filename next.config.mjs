/** @type {import('next').NextConfig} */
import path from "path";

const nextConfig = {
  output: 'export',
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@huggingface/transformers": path.join(
        process.cwd(),
        "node_modules/@huggingface/transformers/dist/transformers.web.js",
      ),
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },
};

export default nextConfig;
