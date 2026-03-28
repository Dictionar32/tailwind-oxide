import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tailwindStyled } from "@tailwind-styled/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()
    tailwindStyled(),
  ],
})
