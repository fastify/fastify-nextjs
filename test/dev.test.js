'use strict'

const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')

test('dev mode serves pages, nextRenderError, and allows the process to exit after close', { timeout: 180_000 }, async t => {
  if (process.env.RUN_DEV_TESTS !== '1') {
    t.skip('set RUN_DEV_TESTS=1 to run the development-mode integration test')
    return
  }

  fs.rmSync(path.join(__dirname, '..', '.next-dev-integration'), { recursive: true, force: true })

  const child = spawn(process.execPath, [path.join(__dirname, '..', 'scripts', 'dev-exit-child.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  let stderr = ''

  child.stderr.on('data', chunk => {
    stderr += chunk
  })

  const exitCode = await new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', resolve)
  })

  t.assert.deepStrictEqual(exitCode, 0, stderr)
})
