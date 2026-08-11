import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next'in her açılışta AGENTS.md / CLAUDE.md üretmesini kapatıyoruz;
  // bu projede işimize yaramıyor ve depoyu kirletiyor.
  agentRules: false,
};

export default nextConfig;
