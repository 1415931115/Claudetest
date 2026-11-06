import { defineConfig } from 'vitest/config'

export default defineConfig({
  // GitHub Pages 把项目部署在 /<repo>/ 子路径下，相对路径让本地和线上都能跑。
  base: './',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
