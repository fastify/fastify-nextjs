'use strict'

const Fastify = require('fastify')

const fastify = Fastify({ pluginTimeout: 120_000 })

fastify
  .register(require('..'), { dev: true, distDir: '.next-dev-integration', webpack: true })
  .after(() => {
    fastify.next('/hello')
    fastify.get('/err', (_, reply) => reply.nextRenderError(new Error('boom')))
  })

fastify.listen({ port: 0 }).then(async () => {
  const base = 'http://localhost:' + fastify.server.address().port

  for (const path of ['/hello', '/err']) {
    const response = await fetch(base + path, { signal: AbortSignal.timeout(60_000) })
    await response.text()

    if (response.status !== 200) {
      console.error('unexpected status for', path, response.status)
      process.exit(1)
    }
  }

  await fastify.close()

  setTimeout(() => {
    console.error('process still alive 5s after close()')
    process.exit(1)
  }, 5000).unref()
})
