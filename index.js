'use strict'

const assert = require('assert')
const fp = require('fastify-plugin')
const Next = require('next')

function fastifyNext (fastify, options, next) {
  const app = Next(Object.assign({}, options, { dev: process.env.NODE_ENV !== 'production' }))
  const handleNextRequests = app.getRequestHandler()

  app
    .prepare()
    .then(() => {
      fastify
        .decorate('next', route.bind(fastify))
        .addHook('onClose', function () {
          app.close()
        })
        .after(() => {
          fastify.next('/_next/*',
            (app, req, reply) => handleNextRequests(req.raw, reply.raw)
              .then(() => {
                reply.sent = true
              })
          )
        })
      next()
    })
    .catch(err => next(err))

  function route (path, opts, callback) {
    opts = opts || {}
    if (typeof opts === 'function') {
      callback = opts
      opts = {}
    }

    assert(typeof path === 'string', 'path must be a string')
    if (opts.method) { assert(typeof opts.method === 'string', 'options.method must be a string') }
    if (opts.schema) { assert(typeof opts.schema === 'object', 'options.schema must be an object') }
    if (opts.next) { assert(typeof opts.next === 'object', 'options.next must be an object') }
    if (callback) { assert(typeof callback === 'function', 'callback must be a function') }

    const method = opts.method || 'get'
    this[method.toLowerCase()](path, opts, handler)

    function handler (req, reply) {
      if (callback) {
        return callback(app, req, reply)
      }

      app.render(req.raw, reply.res, path, req.query, opts.next || {})
    }
  }
}

module.exports = fp(fastifyNext, {
  fastify: '>=1.0.0',
  name: 'fastify-nextjs'
})
