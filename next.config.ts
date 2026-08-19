import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pins the Turbopack project root explicitly: this repo lives directly under the
  // Windows user profile directory, which Next.js otherwise refuses to infer as the
  // root (it would risk pulling in unrelated files from the home directory).
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
