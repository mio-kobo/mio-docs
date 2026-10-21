import { createMDX } from 'fumadocs-mdx/next';
export default createMDX()({ reactStrictMode: true, ...(process.env.MIO_DOCS_DIST_DIR ? { distDir: process.env.MIO_DOCS_DIST_DIR } : {}) });
