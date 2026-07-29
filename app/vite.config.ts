import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// https://vite.dev/config/
export default defineConfig(() => {
  const plugins = [react()]

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
      chunkSizeWarningLimit: 380,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replaceAll('\\', '/');

            if (normalizedId.includes('/src/features/data-manage/catalog-core.tsx')) {
              return 'data-manage-catalog-core';
            }

            if (normalizedId.includes('/src/features/data-manage/catalog-erp.tsx')) {
              return 'data-manage-catalog-erp';
            }

            if (normalizedId.includes('/src/features/data-manage/governance.ts')) {
              return 'data-manage-governance';
            }

            if (!normalizedId.includes('/node_modules/')) return undefined;

            if (
              normalizedId.includes('/react/') ||
              normalizedId.includes('/react-dom/') ||
              normalizedId.includes('/react-router') ||
              normalizedId.includes('/scheduler/')
            ) {
              return 'vendor-react';
            }

            if (
              normalizedId.includes('/recharts/') ||
              normalizedId.includes('/d3-') ||
              normalizedId.includes('/lodash/')
            ) {
              // Keep the shared Cartesian runtime stable, while allowing Vite to
              // split chart families into the lazy routes that actually use them.
              if (normalizedId.endsWith('/recharts/es6/chart/CartesianChart.js')) {
                return 'vendor-chart-core';
              }

              return undefined;
            }

            if (
              normalizedId.includes('/@radix-ui/') ||
              normalizedId.includes('/lucide-react/') ||
              normalizedId.includes('/cmdk/') ||
              normalizedId.includes('/vaul/') ||
              normalizedId.includes('/sonner/')
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
