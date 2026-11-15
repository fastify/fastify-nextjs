'use strict'

const assert = require('node:assert')
const fp = require('fastify-plugin')
const Next = require('next')

const nextMajor = parseInt(require('next/package.json').version, 10)

function noop () {}

function readBasePath (server) {
  return (server && server.nextConfig && server.nextConfig.basePath) || ''
}

// Reads the basePath Next itself resolved (including next.config.js).
// Next 12/13 expose it through `getServer()`; Next 14+ custom servers expose
// it through `app.server`, which throws until `prepare()` has finished.
function resolveRuntimeBasePath (app) {
  try {
    if (typeof app.getServer === 'function') {
      return Promise.resolve(app.getServer()).then(readBasePath)
    }

    return Promise.resolve(readBasePath(app.server))
  } catch {
    return Promise.resolve('')
  }
}

// Removes `prefix` from `url` only when it matches whole path segments, so that
// `/app` strips `/app/x` and `/app?y=1` but leaves `/application` untouched.
function stripBasePath (url, prefix) {
  if (!prefix || !url.startsWith(prefix)) {
    return url
  }

  const rest = url.slice(prefix.length)

  if (rest === '' || rest[0] === '?') {
    return '/' + rest
  }

  return rest[0] === '/' ? rest : url
}

function fastifyNext (fastify, options, next) {
  const { underPressure, noServeAssets, ...nextOptions } = options

  if (underPressure) {
    const opts = typeof underPressure === 'object' ? underPressure : Object.create(null)

    fastify.register(require('@fastify/under-pressure'), opts)
  }

  const dev = nextOptions.dev === undefined ? process.env.NODE_ENV !== 'production' : nextOptions.dev
  const app = Next(Object.assign({}, { dev }, nextOptions))
  const handleNextRequests = app.getRequestHandler()
  // `app.renderError()` never settles in the Next 13/14 dev server (still true
  // on current 14.x custom servers; Next has not shipped a patch).
  const renderErrorWithHandler = dev && (nextMajor === 13 || nextMajor === 14)
  const configuredBasePath = (nextOptions.conf && nextOptions.conf.basePath) || ''
  let stripBasePathPrefix = ''

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

      if (noServeAssets) {
        return next()
      }

      return resolveRuntimeBasePath(app).then(runtimeBasePath => {
        const basePath = runtimeBasePath || configuredBasePath

        // Next 14+ ignores `conf.basePath` on custom servers (it only honours
        // next.config.js, which is detected above). Register the prefixed assets
        // route from the plugin option, then strip the prefix before handing the
        // request to Next.
        if (configuredBasePath && !runtimeBasePath) {
          stripBasePathPrefix = configuredBasePath
        }

        const nextAssetsPath = `${basePath}/_next/*`

        fastify
          .after(() => {
            fastify.next(nextAssetsPath)
          })

        next()
      })
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

      // Next may ignore `conf.basePath`, so hand it the URL without the prefix,
      // and restore the original afterwards for Fastify hooks and logging.
      const originalUrl = req.raw.url
      req.raw.url = stripBasePath(originalUrl, stripBasePathPrefix)

      return handleNextRequests(req.raw, reply.raw)
        .then(() => {
          reply.hijack()
        })
        .finally(() => {
          req.raw.url = originalUrl
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

    if (renderErrorWithHandler) {
      const { statusCode } = reply

      Object.defineProperty(reply.raw, 'statusCode', { configurable: true, get: () => statusCode, set: noop })

      await app.render(request.raw, reply.raw, '/_error', request.query)
    } else {
      await app.renderError(err, request.raw, reply.raw, request.url, request.query)
    }

    reply.hijack()
  }
}

module.exports = fp(fastifyNext, {
  fastify: '5.x',
  name: '@fastify/nextjs'
})
