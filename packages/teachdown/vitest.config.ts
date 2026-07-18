import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Parser tests run in node; component tests opt into jsdom with a
    // `// @vitest-environment jsdom` pragma so they also pass under the
    // repo-root vitest run (which is node by default).
    environment: 'node',
  },
})
