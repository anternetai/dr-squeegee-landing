import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
        destination: "/squeegee-portal",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "host", value: "www.drsqueegeeclt.com" }],
        destination: "/squeegee-portal",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
