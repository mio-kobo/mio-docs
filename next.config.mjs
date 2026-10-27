import { createMDX } from 'fumadocs-mdx/next';

export default createMDX()({
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // The custom domain serves the site at /; no repository basePath or assetPrefix.
  ...(process.env.MIO_DOCS_DIST_DIR ? { distDir: process.env.MIO_DOCS_DIST_DIR } : {}),
});
