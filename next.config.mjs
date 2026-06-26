import createMDX from "@next/mdx";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export so the whole site can be served as static files (Vercel, etc.).
  output: "export",
  // Allow .mdx files to be treated as pages/modules.
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  images: { unoptimized: true },
  // Helpful for static hosting that serves /path/ as /path/index.html.
  trailingSlash: true,
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

export default withMDX(nextConfig);
