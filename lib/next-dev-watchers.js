'use strict'

const fs = require('node:fs')

const collectors = []
let originalWatch = null

function restoreWatch () {
  if (collectors.length === 0 && originalWatch && fs.watch === patchedWatch) {
    fs.watch = originalWatch
    originalWatch = null
  }
}

function patchedWatch (...args) {
  const watcher = originalWatch.apply(this, args)
  const owner = collectors[collectors.length - 1]

  if (owner) {
    owner.add(watcher)
  }

  return watcher
}

// Next.js' development server never closes the file watchers it creates during
// `prepare()`, so `app.close()` can resolve while the process stays alive.
// Track only watchers opened while `prepare()` is running.
function trackNextWatchers () {
  const watchers = new Set()

  collectors.push(watchers)

  if (!originalWatch) {
    originalWatch = fs.watch
    fs.watch = patchedWatch
  }

  function stopCollecting () {
    const index = collectors.indexOf(watchers)

    if (index === -1) {
      return
    }

    collectors.splice(index, 1)
    restoreWatch()
  }

  function releaseNextWatchers () {
    stopCollecting()

    for (const watcher of watchers) {
      watcher.close()
    }

    watchers.clear()
  }

  releaseNextWatchers.stopCollecting = stopCollecting

  return releaseNextWatchers
}

module.exports = { trackNextWatchers }
