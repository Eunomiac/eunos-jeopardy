import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import istanbul from 'vite-plugin-istanbul'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Add Istanbul coverage instrumentation for E2E tests
    // Only instruments when VITE_COVERAGE=true is set
    istanbul({
      include: 'src/*',
      exclude: ['node_modules', 'test/', 'e2e/', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      extension: ['.ts', '.tsx', '.js', '.jsx'],
      requireEnv: true, // Only instrument when VITE_COVERAGE env var is set
      cypress: false,
      forceBuildInstrument: false,
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        // Use modern Dart Sass API
        api: 'modern-compiler'
      }
    },
    devSourcemap: true
  },
  resolve: {
    alias: {
      '@': '/src',
      '@styles': '/src/styles',
      '@components': '/src/components',
      '@hooks': '/src/hooks',
      '@services': '/src/services',
      '@types': '/src/types',
      '@utils': '/src/utils'
    }
  }
})
