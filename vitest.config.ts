import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
})
