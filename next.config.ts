import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // drsqueegeeclt.com/crm → /crm (same path, no conflict)
      // drsqueegeeclt.com/portal → /crm (legacy alias)
      {
        source: "/portal",
        has: [{ type: "host", value: "drsqueegeeclt.com" }],
        destination: "/crm",
      },
      {
        source: "/portal/:path*",
        has: [{ type: "host", value: "drsqueegeeclt.com" }],
        destination: "/crm/:path*",
      },
      {
        source: "/portal",
        has: [{ type: "host", value: "www.drsqueegeeclt.com" }],
        destination: "/crm",
      },
      {
        source: "/portal/:path*",
        has: [{ type: "host", value: "www.drsqueegeeclt.com" }],
        destination: "/crm/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "homefieldhub.com" }],
        destination: "/call",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "host", value: "www.homefieldhub.com" }],
        destination: "/call",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "host", value: "drsqueegeeclt.com" }],
        destination: "/crm",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "host", value: "www.drsqueegeeclt.com" }],
        destination: "/crm",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
