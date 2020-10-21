'use strict'

const assert = require('assert')
const fp = require('fastify-plugin')
const Next = require('next')

function fastifyNext (fastify, options, next) {
  const app = Next(Object.assign({}, { dev: process.env.NODE_ENV !== 'production' }, options))
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
          fastify.next('/_next/*')
        })
      next()
    })
    .catch(err => next(err))

  function route (path, opts, callback) {
    opts = opts || {
      logLevel: options.logLevel
    }
    if (typeof opts === 'function') {
      callback = opts
      opts = {
        logLevel: options.logLevel
      }
    }

    assert(typeof path === 'string', 'path must be a string')
    if (opts.method) { assert(typeof opts.method === 'string', 'options.method must be a string') }
    if (opts.schema) { assert(typeof opts.schema === 'object', 'options.schema must be an object') }
    if (callback) { assert(typeof callback === 'function', 'callback must be a function') }

    const method = opts.method || 'get'
    this[method.toLowerCase()](path, opts, handler)

    function handler (req, reply) {
      for (const [headerName, headerValue] of Object.entries(reply.getHeaders())) {
        reply.raw.setHeader(headerName, headerValue)
      }

      if (callback) {
        return callback(app, req, reply)
      }

      return handleNextRequests(req.raw, reply.raw)
        .then(() => {
          reply.sent = true
        })
    }
  }
}

module.exports = fp(fastifyNext, {
  fastify: '>=1.0.0',
  name: 'fastify-nextjs'
})
