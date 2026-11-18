import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: ["pg", "@prisma/adapter-pg", "bcryptjs"],
    images: {
        remotePatterns: [],
    },
};

export default nextConfig;
