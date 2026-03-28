import { withTailwindStyled } from "@tailwind-styled/next"
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['tailwind-styled-v4'],
  turbopack: {
    root: __dirname,
  },
}

export default withTailwindStyled()(nextConfig)