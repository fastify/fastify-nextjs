'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const Next = require('next')
const pino = require('pino')
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const { Agent, setGlobalDispatcher, request } = require('undici')

const fastifyNext = require('..')

const port = 0
const agent = new Agent({
  keepAliveTimeout: 1,
  keepAliveMaxTimeout: 1
})

setGlobalDispatcher(agent)

test('should construct next with proper environment', async t => {
  process.env.NODE_ENV = 'production'

  const dev = process.env.NODE_ENV !== 'production'
  const app = Next(Object.assign({}, { dev }))

  await app.prepare()

  t.equal(dev, false)
  t.equal(app.dev, undefined)

  app.close()
})

test('should return an html document', async t => {
  const fastify = await Fastify().register(fastifyNext)
  fastify.next('/hello')

  const origin = await fastify.listen({ port })
  const { statusCode, headers } = await request({ path: '/hello', origin })

  t.equal(statusCode, 200)
  t.equal(headers['content-type'], 'text/html; charset=utf-8')

  fastify.close()
})

test('should support HEAD method', async t => {
  const fastify = await Fastify().register(fastifyNext)
  fastify.next('/hello', { method: 'head' })

  const origin = await fastify.listen({ port })
  const { statusCode, headers } = await request({ path: '/hello', origin, method: 'HEAD' })

  t.equal(statusCode, 200)
  t.equal(headers['content-type'], 'text/html; charset=utf-8')

  fastify.close()
})

test('should support a custom handler', async t => {
  const fastify = await Fastify().register(fastifyNext)
  fastify.next('/hello', (app, req, reply) => {
    app.render(req.raw, reply.raw, '/hello', req.query, {})
  })

  const origin = await fastify.listen({ port })
  const { statusCode, headers } = await request({ path: '/hello', origin })

  t.equal(statusCode, 200)
  t.equal(headers['content-type'], 'text/html; charset=utf-8')

  fastify.close()
})

test('should return 404 on undefined route', async t => {
  const fastify = await Fastify().register(fastifyNext)
  fastify.next('/hello')

  const origin = await fastify.listen({ port })
  const { statusCode } = await request({ path: '/test', origin })

  t.equal(statusCode, 404)

  fastify.close()
})

test('should throw if path is not a string', async t => {
  const fastify = await Fastify().register(fastifyNext)

  t.throws(() => fastify.next(null), 'path must be a string')
})

test('should throw if opts.method is not a string', async t => {
  const fastify = await Fastify().register(fastifyNext)

  t.throws(() => fastify.next('/hello', { method: 1 }), 'options.method must be a string')
})

test('should throw if opts.schema is not an object', async t => {
  const fastify = await Fastify().register(fastifyNext)

  t.throws(() => fastify.next('/hello', { schema: 1 }), 'options.schema must be an object')
})

test('should throw if callback is not a function', async t => {
  const fastify = await Fastify().register(fastifyNext)

  t.throws(() => fastify.next('/hello', {}, 1), 'callback must be a function')
})

test('should serve /_next/* static assets', async t => {
  const fastify = await Fastify().register(fastifyNext)
  fastify.next('/hello')

  const origin = await fastify.listen({ port })
  const manifest = require('../.next/build-manifest.json')
  const assets = manifest.pages['/hello']

  t.ok(assets.length > 0)

  for await (const asset of assets) {
    await testNextAsset(t, `/_next/${asset}`, origin)
  }

  fastify.close()
})

test('should serve /base_path/_next/* static assets when basePath defined', async t => {
  const fastify = await Fastify().register(fastifyNext, {
    conf: {
      basePath: '/base_path'
    }
  })
  fastify.next('/hello')

  const origin = await fastify.listen({ port })
  const manifest = require('../.next/build-manifest.json')
  const assets = manifest.pages['/hello']

  t.ok(assets.length > 0)

  for await (const asset of assets) {
    await testNextAsset(t, `/base_path/_next/${asset}`, origin)
  }

  fastify.close()
})

test('should not serve static assets with provided option noServeAssets: true', async t => {
  const fastify = await Fastify().register(fastifyNext, {
    noServeAssets: true,
    underPressure: false
  })
  fastify.next('/hello')

  const origin = await fastify.listen({ port })
  const manifest = require('../.next/build-manifest.json')
  const assets = manifest.pages['/hello']

  t.ok(assets.length > 0)

  for await (const asset of assets) {
    const { statusCode, headers } = await request({ path: `/_next/${asset}`, origin })

    t.equal(statusCode, 404)
    t.equal(headers['content-type'], 'application/json; charset=utf-8')
  }

  fastify.close()
})

test('should return a json data on api route', async t => {
  const fastify = await Fastify().register(fastifyNext)
  fastify.next('/api/*')

  const origin = await fastify.listen({ port })
  const { statusCode, headers } = await request({ path: '/api/user', origin })

  t.equal(statusCode, 200)
  t.equal(headers['content-type'], 'application/json')

  fastify.close()
})

test('should not log any errors', async t => {
  let didLog = false

  const logger = pino({
    level: 'error',
    formatters: {
      log: (obj) => {
        didLog = true
        return obj
      }
    }
  })

  const fastify = await Fastify({ logger }).register(fastifyNext)
  fastify.next('/hello')

  const origin = await fastify.listen({ port })
  const { statusCode, headers, body } = await request({ path: '/hello', origin })

  t.equal(statusCode, 200)
  t.equal(headers['content-type'], 'text/html; charset=utf-8')
  t.match(await body.text(), '<div>hello world</div>')
  t.equal(didLog, false, 'Should not show any error')

  fastify.close()
})

test('should preserve Fastify response headers set by plugins and hooks', async t => {
  const fastify = await Fastify()
    .register(fastifyNext)
    .addHook('onRequest', (_, reply, done) => {
      reply.header('test-header', 'hello')

      done()
    })

  fastify.next('/hello', (app, req, reply) => {
    app.render(req.raw, reply.raw, '/hello', req.query, {})
  })

  const origin = await fastify.listen({ port })
  const { statusCode, headers } = await request({ path: '/hello', origin })

  t.equal(statusCode, 200)
  t.equal(headers['test-header'], 'hello')

  fastify.close()
})

test('should handle Next initialization errors', async t => {
  const error = new Error('boom')
  const plugin = proxyquire('..', {
    next: () => ({
      getRequestHandler: () => { },
      prepare: () => Promise.reject(error)
    })
  })

  t.rejects(() => Fastify().register(plugin), error)
})

test('should not register under-pressure by default', async t => {
  const underPressureStub = sinon.stub().resolves()
  const plugin = proxyquire('..', {
    'under-pressure': underPressureStub
  })
  const fastify = await Fastify().register(plugin)
  const registerSpy = sinon.spy(fastify, 'register')

  sinon.assert.neverCalledWith(registerSpy, underPressureStub)

  t.end()
})

test('should register under-pressure with default options when underPressure: true', async t => {
  const plugin = proxyquire('..', {
    'under-pressure': async (_, opts) => {
      t.same(opts, {})
    }
  })

  await Fastify().register(plugin, { underPressure: true })
})

test('should register under-pressure with provided options when it is an object', async t => {
  const plugin = proxyquire('..', {
    'under-pressure': async (_, opts) => {
      t.same(opts, { some: 'option' })
    }
  })

  await Fastify().register(plugin, { underPressure: { some: 'option' } })
})

test('should register under-pressure with underPressure: true - and expose route if configured', async t => {
  const fastify = await Fastify()
    .register(fastifyNext, {
      underPressure: {
        exposeStatusRoute: true,
        maxEventLoopDelay: 10000,
        maxHeapUsedBytes: 100000000,
        maxRssBytes: 100000000,
        maxEventLoopUtilization: 0.98
      }
    })

  const origin = await fastify.listen({ port })
  const { statusCode } = await request({ path: '/status', origin })

  t.equal(statusCode, 200)

  fastify.close()
})

test('should decorate with next render function', async t => {
  const fastify = Fastify()
    .register(fastifyNext)
    .addHook('onRequest', (_, reply, done) => {
      reply.header('test-header', 'hello')

      done()
    })
    .get('/hello', (_, reply) => reply.nextRender('/hello'))

  const origin = await fastify.listen({ port })
  const { statusCode, headers } = await request({ path: '/hello', origin })

  t.equal(statusCode, 200)
  t.equal(headers['test-header'], 'hello')

  fastify.close()
})

test('should decorate with next render error function', async t => {
  const fastify = Fastify()
    .register(fastifyNext)
    .addHook('onRequest', (_, reply, done) => {
      reply.header('test-header', 'hello')

      done()
    })
    .get('/hello', (_, reply) => reply.nextRenderError(new Error('Test error message')))

  const origin = await fastify.listen({ port })
  const { statusCode, headers } = await request({ path: '/hello', origin })

  t.equal(statusCode, 200)
  t.equal(headers['test-header'], 'hello')

  fastify.close()
})

test('should let next render any page in fastify error handler', async t => {
  const fastify = Fastify()
    .register(fastifyNext)
    .addHook('onRequest', (_, reply, done) => {
      reply.header('test-header', 'hello')

      done()
    })
    .get('/hello', () => {
      throw new Error('boom')
    })
    .setErrorHandler((err, _, reply) => {
      reply.status(err.statusCode || 500)

      return reply.nextRender('/hello')
    })

  const origin = await fastify.listen({ port })
  const { statusCode, headers, body } = await request({ path: '/hello', origin })

  t.equal(statusCode, 500)
  t.equal(headers['test-header'], 'hello')
  t.equal(headers['content-type'], 'text/html; charset=utf-8')
  t.match(await body.text(), '<div>hello world</div>')

  fastify.close()
})

test('should let next render error page in fastify error handler', async t => {
  const fastify = Fastify()
    .register(fastifyNext)
    .addHook('onRequest', (_, reply, done) => {
      reply.header('test-header', 'hello')

      done()
    })
    .get('/hello', () => {
      throw new Error('boom')
    })
    .setErrorHandler((err, _, reply) => {
      reply.status(err.statusCode || 500)

      return reply.nextRenderError(err)
    })

  const origin = await fastify.listen({ port })
  const { statusCode, headers, body } = await request({ path: '/hello', origin })

  t.equal(statusCode, 500)
  t.equal(headers['test-header'], 'hello')
  t.equal(headers['content-type'], 'text/html; charset=utf-8')
  t.match(await body.text(), '<div>error</div>')

  fastify.close()
})

test('should preserve custom properties on the request when using onRequest hook', async t => {
  const customProperty = { value: 'test' }
  const fastify = await Fastify()
    .register(fastifyNext)
    .addHook('onRequest', (req, _, done) => {
      req.raw.customProperty = customProperty

      done()
    })

  fastify.next('/hello', (app, req, reply) => {
    t.same(req.raw.customProperty, { value: 'test' })
    app.render(req.raw, reply.raw, '/hello', req.query, {})
  })

  fastify.next('/custom_prop_page', (app, req, reply) => {
    t.same(req.raw.customProperty, { value: 'test' })
    app.render(req.raw, reply.raw, '/custom_prop_page', req.query, {})
  })

  const origin = await fastify.listen({ port })

  let res = await request({ path: '/hello', origin })

  t.equal(res.statusCode, 200)
  t.equal(res.headers['content-type'], 'text/html; charset=utf-8')
  t.match(await res.body.text(), '<div>hello world</div>')

  res = await request({ path: '/custom_prop_page', origin })

  t.equal(res.statusCode, 200)
  t.equal(res.headers['content-type'], 'text/html; charset=utf-8')
  // For some reason React (or Next.js) adds <!-- --> in front of the property that is being evaluated on the page
  t.match(await res.body.text(), '<div>another hello world page, customProperty value: <!-- -->test</div>')

  fastify.close()
})

async function testNextAsset (t, path, origin) {
  const { statusCode, headers, body } = await request({ path, origin })

  t.equal(statusCode, 200)
  t.equal(headers['content-type'], 'application/javascript; charset=UTF-8')

  // Force body consumption as explained in https://github.com/nodejs/undici#garbage-collection
  // Please note that using the HEAD method in Next produces a 400 Bad Request error
  await body.text()
}
