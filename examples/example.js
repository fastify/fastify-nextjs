'use strict'

const fastify = require('fastify')()

fastify
  .register(require('..'))
  .after(() => {
    fastify.next('/hello')
  })

fastify.listen({ port: 3000 }, err => {
  if (err) throw err
  console.log('Server listening on http://localhost:3000')
})
