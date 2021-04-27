'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const Next = require('next')
const pino = require('pino')
const proxyquire = require('proxyquire')
const sinon = require('sinon')

test('should construct next with proper environment', t => {
  t.plan(2)

  process.env.NODE_ENV = 'production'

  let options
  const dev = process.env.NODE_ENV !== 'production'

  t.equal(dev, false)

  const app = Next(Object.assign({}, { dev }, options))
  app.prepare()
    .then(() => {
      t.equal(app.dev, undefined)
    })
  app.close()
})

test('should return an html document', t => {
  t.plan(3)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  fastify
    .register(require('./index'))
    .after(() => {
      fastify.next('/hello')
    })

  fastify.inject({
    url: '/hello',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/html; charset=utf-8')
  })
})

test('should support different methods', t => {
  t.plan(3)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  fastify
    .register(require('./index'))
    .after(() => {
      fastify.next('/hello', { method: 'options' })
    })

  fastify.inject({
    url: '/hello',
    method: 'OPTIONS'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/html; charset=utf-8')
  })
})

test('should support a custom handler', t => {
  t.plan(3)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  fastify
    .register(require('./index'))
    .after(() => {
      fastify.next('/hello', (app, req, reply) => {
        app.render(req.raw, reply.raw, '/hello', req.query, {})
      })
    })

  fastify.inject({
    url: '/hello',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/html; charset=utf-8')
  })
})

test('should return 404 on undefined route', t => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  fastify
    .register(require('./index'))
    .after(() => {
      fastify.next('/hello')
    })

  fastify.inject({
    url: '/test',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

test('should throw if path is not a string', t => {
  t.plan(2)

  const fastify = Fastify()
  fastify
    .register(require('./index'))
    .after(err => {
      t.error(err)
      try {
        fastify.next(null)
        t.fail()
      } catch (e) {
        t.equal(e.message, 'path must be a string')
      }
    })

  fastify.close()
})

test('should throw if opts.method is not a string', t => {
  t.plan(2)

  const fastify = Fastify()
  fastify
    .register(require('./index'))
    .after(err => {
      t.error(err)
      try {
        fastify.next('/hello', { method: 1 })
        t.fail()
      } catch (e) {
        t.equal(e.message, 'options.method must be a string')
      }
    })

  fastify.close()
})

test('should throw if opts.schema is not an object', t => {
  t.plan(2)

  const fastify = Fastify()
  fastify
    .register(require('./index'))
    .after(err => {
      t.error(err)
      try {
        fastify.next('/hello', { schema: 1 })
        t.fail()
      } catch (e) {
        t.equal(e.message, 'options.schema must be an object')
      }
    })

  fastify.close()
})

test('should throw if callback is not a function', t => {
  t.plan(2)

  const fastify = Fastify()
  fastify
    .register(require('./index'))
    .after(err => {
      t.error(err)
      try {
        fastify.next('/hello', {}, 1)
        t.fail()
      } catch (e) {
        t.equal(e.message, 'callback must be a function')
      }
    })

  fastify.close()
})

test('should serve /_next/* static assets', async t => {
  const manifest = require('./.next/build-manifest.json')

  const fastify = Fastify()

  fastify
    .register(require('./index'))
    .after(() => {
      fastify.next('/hello')
    })

  t.teardown(() => fastify.close())

  const commonAssets = manifest.pages['/hello']

  t.ok(commonAssets.length > 0)

  await Promise.all(commonAssets.map(suffix => testNextAsset(t, fastify, `/_next/${suffix}`)))
})

test('should serve /base_path/_next/* static assets when basePath defined', async t => {
  const manifest = require('./.next/build-manifest.json')

  const fastify = Fastify()

  fastify
    .register(require('./index'), {
      conf: {
        basePath: '/base_path'
      }
    })
    .after(() => {
      fastify.next('/hello')
    })

  t.teardown(() => fastify.close())

  const commonAssets = manifest.pages['/hello']

  t.ok(commonAssets.length > 0)

  await Promise.all(commonAssets.map(suffix => testNextAsset(t, fastify, `/base_path/_next/${suffix}`)))
})

test('should not serve static assets with provided option noServeAssets: true', async t => {
  const manifest = require('./.next/build-manifest.json')

  const fastify = Fastify()

  fastify
    .register(require('./index'), {
      noServeAssets: true,
      underPressure: false
    })
    .after(() => {
      fastify.next('/hello')
    })

  t.teardown(() => fastify.close())

  const commonAssets = manifest.pages['/hello']

  t.ok(commonAssets.length > 0)

  await Promise.all(commonAssets.map(suffix => testNoServeNextAsset(t, fastify, `/_next/${suffix}`)))
})

test('should return a json data on api route', t => {
  t.plan(3)

  const fastify = Fastify()
  fastify
    .register(require('./index'))
    .after(() => {
      fastify.next('/api/*')
    })

  t.teardown(() => fastify.close())

  fastify.inject({
    url: '/api/user',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/json')
  })
})

test('should not log any errors', t => {
  t.plan(5)

  let showedError = false
  const logger = pino({
    level: 'error',
    formatters: {
      log: (obj) => {
        showedError = true
        return obj
      }
    }
  })

  const fastify = Fastify({
    logger
  })

  fastify
    .register(require('./index')).after(() => {
      fastify.next('/hello')
    })

  fastify.inject({
    url: '/hello',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/html; charset=utf-8')
    t.match(res.payload, '<div>hello world</div>')
    t.equal(showedError, false, 'Should not show any error')
  })
})

test('should respect plugin logLevel', t => {
  t.plan(9)

  let didLog = false
  const logger = pino({
    formatters: {
      log: (obj) => {
        didLog = true
        return obj
      }
    }
  })

  const fastify = Fastify({
    logger
  })

  fastify
    .register(require('./index'), {
      logLevel: 'error'
    })
    .after(() => {
      fastify.next('/hello')

      fastify.next('/api/user', (nextApp, req, reply) => {
        return nextApp
          .getRequestHandler()(req.raw, reply.raw)
          .then(() => {
            reply.sent = true
          })
      })
    })

  t.teardown(() => fastify.close())

  fastify.inject({
    url: '/hello',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/html; charset=utf-8')
    t.match(res.payload, '<div>hello world</div>')
    t.equal(didLog, false)
  })

  fastify.inject({
    url: '/api/user',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/json')
    t.equal(didLog, false)
  })
})

test('should preserve Fastify response headers set by plugins and hooks', t => {
  t.plan(3)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  fastify
    .register(require('./index'))
    .after(() => {
      fastify.addHook('onRequest', (req, reply, done) => {
        reply.header('test-header', 'hello')
        done()
      })

      fastify.next('/hello', (app, req, reply) => {
        app.render(req.raw, reply.raw, '/hello', req.query, {})
      })
    })

  fastify.inject({
    url: '/hello',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['test-header'], 'hello')
  })
})

test('should handle Next initialization errors', t => {
  t.plan(1)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  const error = new Error('boom')

  const plugin = proxyquire('./', {
    next: function () {
      return {
        getRequestHandler () { },
        prepare () { return Promise.reject(error) }
      }
    }
  })

  fastify
    .register(plugin)
    .ready(err => {
      t.strictSame(err, error)
    })
})

test('should not register under-pressure by default', t => {
  const fastify = Fastify()
  t.teardown(() => fastify.close())

  const registerSpy = sinon.spy(fastify, 'register')
  const underPressureStub = sinon.stub().resolves()

  const plugin = proxyquire('./index', {
    'under-pressure': underPressureStub
  })

  fastify.register(plugin)

  sinon.assert.neverCalledWith(registerSpy, underPressureStub)

  t.end()
})

test('should register under-pressure with default options when underPressure: true', async t => {
  t.plan(1)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  const plugin = proxyquire('./index', {
    'under-pressure': async function (app, opts) {
      t.same(opts, {})
    }
  })

  await fastify.register(plugin, { underPressure: true })
})

test('should register under-pressure with provided options when it is an object', async t => {
  t.plan(1)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  const plugin = proxyquire('./index', {
    'under-pressure': async function (app, opts) {
      t.same(opts, { some: 'option' })
    }
  })

  await fastify.register(plugin, { underPressure: { some: 'option' } })
})

test('should register under-pressure with underPressure: true - and expose route if configured', t => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  fastify.register(require('./index'), {
    underPressure: {
      exposeStatusRoute: true,
      maxEventLoopDelay: 10000,
      maxHeapUsedBytes: 100000000,
      maxRssBytes: 100000000,
      maxEventLoopUtilization: 0.98
    }
  })

  fastify.inject({
    url: '/status',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })
})

test('should decorate with next render function', async t => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  await fastify.register(require('./index'))

  fastify.addHook('onRequest', (req, reply, done) => {
    reply.header('test-header', 'hello')
    done()
  })

  fastify.get('/hello', (req, reply) => {
    return reply.nextRender('/hello')
  })

  const res = await fastify.inject({
    url: '/hello',
    method: 'GET'
  })

  t.equal(res.statusCode, 200)
  t.equal(res.headers['test-header'], 'hello')
})

test('should let next render error page', async t => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  await fastify.register(require('./index'))

  fastify.addHook('onRequest', (req, reply, done) => {
    reply.header('test-header', 'hello')
    done()
  })

  fastify.get('/hello', (req, reply) => {
    throw new Error('boom')
  })

  fastify.setErrorHandler((err, req, reply) => {
    reply.status(err.statusCode || 500)
    return reply.nextRender('/hello')
  })

  const res = await fastify.inject({
    url: '/hello',
    method: 'GET'
  })

  t.equal(res.statusCode, 500)
  t.equal(res.headers['test-header'], 'hello')
  t.equal(res.headers['content-type'], 'text/html; charset=utf-8')
  t.match(res.payload, '<div>hello world</div>')
})

async function testNextAsset (t, fastify, url) {
  const res = await fastify.inject(url)
  t.equal(res.statusCode, 200)
  t.equal(res.headers['content-type'], 'application/javascript; charset=UTF-8')
}

async function testNoServeNextAsset (t, fastify, url) {
  const res = await fastify.inject(url)
  t.equal(res.statusCode, 404)
  t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
}
