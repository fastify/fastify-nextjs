'use strict'

const { test } = require('node:test')
const Fastify = require('fastify')
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const { request } = require('undici')

function loadPlugin (version, nextFactory) {
  delete require.cache[require.resolve('..')]

  return proxyquire('..', {
    'next/package.json': { version },
    next: nextFactory
  })
}

function createNextApp ({ render, renderError }) {
  return {
    getRequestHandler: () => async (_req, res) => {
      res.end()
    },
    prepare: () => Promise.resolve(),
    close: () => Promise.resolve(),
    render,
    renderError
  }
}

async function requestErrorPage (plugin) {
  const fastify = Fastify()
    .register(plugin, { dev: true, noServeAssets: true })
    .get('/hello', (_, reply) => reply.nextRenderError(new Error('boom')))

  const origin = await fastify.listen({ port: 0 })
  const { statusCode, body } = await request({ path: '/hello', origin })
  const text = await body.text()

  await fastify.close()

  return { statusCode, text }
}

test('nextRenderError renders /_error through app.render on Next 13 dev', async t => {
  const render = sinon.stub().callsFake(async (_req, res) => {
    res.statusCode = 200
    res.end('err')
  })
  const renderError = sinon.stub().rejects(new Error('renderError must not run'))
  const plugin = loadPlugin('13.1.0', () => createNextApp({ render, renderError }))

  const { statusCode, text } = await requestErrorPage(plugin)

  t.assert.deepStrictEqual(statusCode, 200)
  t.assert.deepStrictEqual(text, 'err')
  sinon.assert.calledOnce(render)
  sinon.assert.match(render.firstCall.args[2], '/_error')
  sinon.assert.notCalled(renderError)
})

test('nextRenderError renders /_error through app.render on Next 14 dev', async t => {
  const render = sinon.stub().callsFake(async (_req, res) => {
    res.statusCode = 200
    res.end('err')
  })
  const renderError = sinon.stub().rejects(new Error('renderError must not run'))
  const plugin = loadPlugin('14.2.35', () => createNextApp({ render, renderError }))

  const { statusCode, text } = await requestErrorPage(plugin)

  t.assert.deepStrictEqual(statusCode, 200)
  t.assert.deepStrictEqual(text, 'err')
  sinon.assert.calledOnce(render)
  sinon.assert.notCalled(renderError)
})

test('nextRenderError still calls app.renderError on Next 15 dev', async t => {
  const render = sinon.stub().rejects(new Error('render must not run'))
  const renderError = sinon.stub().callsFake(async (_err, _req, res) => {
    res.statusCode = 200
    res.end('err')
  })
  const plugin = loadPlugin('15.0.0', () => createNextApp({ render, renderError }))

  const { statusCode, text } = await requestErrorPage(plugin)

  t.assert.deepStrictEqual(statusCode, 200)
  t.assert.deepStrictEqual(text, 'err')
  sinon.assert.notCalled(render)
  sinon.assert.calledOnce(renderError)
})
