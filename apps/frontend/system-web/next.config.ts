import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  env: {
    AUTHENTICATED_USER_ID: process.env.AUTHENTICATED_USER_ID || "taro",
  },
  publicRuntimeConfig: {
    authenticatedUserId: process.env.AUTHENTICATED_USER_ID || "taro",
  },
};

export default nextConfig;
