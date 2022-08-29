'use strict'

const assert = require('assert')
const fp = require('fastify-plugin')
const Next = require('next')

function fastifyNext (fastify, options, next) {
  const { underPressure, noServeAssets, ...nextOptions } = options

  if (underPressure) {
    const opts = typeof underPressure === 'object' ? underPressure : Object.create(null)

    fastify.register(require('@fastify/under-pressure'), opts)
  }

  const app = Next(Object.assign({}, { dev: process.env.NODE_ENV !== 'production' }, nextOptions))
  const handleNextRequests = app.getRequestHandler()

  app
    .prepare()
    .then(() => {
      fastify
        .decorate('next', route.bind(fastify))
        .decorateReply('nextRender', render)
        .decorateReply('nextRenderError', renderError)
        .addHook('onClose', function () {
          return app.close()
        })

      if (!noServeAssets) {
        const basePath = app.server.nextConfig.basePath || ''
        const nextAssetsPath = `${basePath}/_next/*`

        fastify
          .after(() => {
            fastify.next(nextAssetsPath)
          })
      }
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
          reply.hijack()
        })
    }
  }

  async function render (path) {
    assert(typeof path === 'string', 'path must be a string')

    const reply = this
    const { request } = reply

    // set custom headers as next will finish the request
    for (const [headerName, headerValue] of Object.entries(reply.getHeaders())) {
      reply.raw.setHeader(headerName, headerValue)
    }

    await app.render(request.raw, reply.raw, path, request.query)

    reply.hijack()
  }

  async function renderError (err) {
    const reply = this
    const { request } = reply

    // set custom headers as next will finish the request
    for (const [headerName, headerValue] of Object.entries(reply.getHeaders())) {
      reply.raw.setHeader(headerName, headerValue)
    }

    await app.renderError(err, request.raw, reply.raw, request.url, request.query)

    reply.hijack()
  }
}

module.exports = fp(fastifyNext, {
  fastify: '4.x',
  name: '@fastify/nextjs'
})
