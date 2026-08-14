import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Don't auto-generate AGENTS.md/CLAUDE.md on every `next dev` run.
  agentRules: false,
};

export default nextConfig;
