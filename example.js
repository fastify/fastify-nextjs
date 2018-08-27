'use strict'

const fastify = require('fastify')()

fastify
  .register(require('./index'))
  .after(() => {
    // Add this to serve the _next assets
    fastify.next('/_next/*', (app, req, reply) => {
      return app.handleRequest(req.req, reply.res)
        .then(() => {
          reply.sent = true
        })
    })
    // Then register your routes
    fastify.next('/hello')
  })

fastify.listen(3000, err => {
  if (err) throw err
  console.log('Server listenging on http://localhost:3000')
})
