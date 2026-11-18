import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: ["pg", "@prisma/adapter-pg", "bcryptjs"],
    images: {
        remotePatterns: [],
    },
    experimental: {
        agentUpgrade: "security",
    },
};

export default nextConfig;
