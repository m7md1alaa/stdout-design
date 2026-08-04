import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  serverExternalPackages: ["takumi-js", "@takumi-rs/core"],
  async rewrites() {
    return [
      {
        source: "/docs/:path*.md",
        destination: "/llms.mdx/docs/:path*/content.md",
      },
    ];
  },
};

export default withMDX(config);
