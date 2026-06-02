import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = mode === "development" ? [inspectAttr(), react()] : [react()]

  return {
    base: '/',
    plugins,
    server: {
      port: 3000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;

            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router') ||
              id.includes('/scheduler/')
            ) {
              return 'vendor-react';
            }

            if (
              id.includes('/recharts/') ||
              id.includes('/d3-') ||
              id.includes('/lodash/')
            ) {
              return 'vendor-charts';
            }

            if (
              id.includes('/@radix-ui/') ||
              id.includes('/lucide-react/') ||
              id.includes('/cmdk/') ||
              id.includes('/vaul/') ||
              id.includes('/sonner/')
            ) {
              return 'vendor-ui';
            }

            return 'vendor';
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['tests/e2e/**', 'tests/e2e-prod/**', 'node_modules/**', 'dist/**'],
    },
  }
});
