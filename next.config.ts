import type { NextConfig } from "next";
import path from "path";

// Public Square identifiers (they ship to the browser anyway). Inlined so builds work
// even when the host does not expose env vars at build time.
const SQUARE_APPLICATION_ID = "sq0idp-JwmqyloKvtwtpkaG7uxBEQ";
const SQUARE_LOCATION_ID = "LZK9WKQA940XN";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  env: {
    NEXT_PUBLIC_SQUARE_APPLICATION_ID: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || SQUARE_APPLICATION_ID,
    NEXT_PUBLIC_SQUARE_LOCATION_ID: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || SQUARE_LOCATION_ID,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
