'use strict'

const { test } = require('node:test')
const fs = require('node:fs')
const Fastify = require('fastify')
const proxyquire = require('proxyquire')
const { trackNextWatchers } = require('../lib/next-dev-watchers')

test('trackNextWatchers patches fs.watch and restores it on release', () => {
  const original = fs.watch
  const release = trackNextWatchers()

  release()
  if (fs.watch !== original) {
    release()
  }
})

test('trackNextWatchers release is idempotent', () => {
  const release = trackNextWatchers()

  release()
  release()
})

test('stopCollecting restores fs.watch but release still closes captured watchers', (t) => {
  const original = fs.watch
  const release = trackNextWatchers()
  const watcher = fs.watch(__filename)
  let closed = false
  const close = watcher.close.bind(watcher)

  watcher.close = () => {
    closed = true
    close()
  }

  release.stopCollecting()
  t.assert.equal(fs.watch, original)

  const later = fs.watch(__filename)
  let laterClosed = false
  const laterClose = later.close.bind(later)

  later.close = () => {
    laterClosed = true
    laterClose()
  }

  release()
  t.assert.equal(closed, true)
  t.assert.equal(laterClosed, false)
  later.close()
})

test('stops collecting watchers after prepare and closes them on fastify.close', async t => {
  delete require.cache[require.resolve('..')]

  const plugin = proxyquire('..', {
    next: () => ({
      getRequestHandler: () => async (_req, res) => {
        res.end()
      },
      prepare: () => Promise.resolve(),
      close: () => Promise.resolve()
    })
  })

  const fastify = await Fastify().register(plugin, { dev: true, noServeAssets: true })
  await fastify.close()
})

test('releases watchers when prepare fails in development', async t => {
  delete require.cache[require.resolve('..')]

  const error = new Error('boom')
  const plugin = proxyquire('..', {
    next: () => ({
      getRequestHandler: () => {},
      prepare: () => Promise.reject(error)
    })
  })

  await t.assert.rejects(Fastify().register(plugin, { dev: true, noServeAssets: true }).ready(), error)
})
