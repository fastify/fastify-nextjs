# fastify-react
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)  [![Build Status](https://travis-ci.org/fastify/fastify-react.svg?branch=master)](https://travis-ci.org/fastify/fastify-react)

React server side rendering support for Fastify with [Next](https://github.com/zeit/next.js/#custom-server-and-routing) Framework.

## Install
```
npm i fastify-react --save
```

## Usage
Since Next needs some time to be ready on the first launch, you must declare your routes inside the `after` callback, after you registered the plugin.
```js
const fastify = require('fastify')()

fastify
  .register(require('fastify-react'))
  .after(() => {
    fastify.next('/hello')
  })

fastify.listen(3000, err => {
  if (err) throw err
  console.log('Server listenging on http://localhost:3000')
})
```
Or you can use the `ready` callback:
```js
const fastify = require('fastify')()

fastify.register(require('fastify-react'))

fastify.ready(() => {
  fastify.next('/hello')
})

fastify.listen(3000, err => {
  if (err) throw err
  console.log('Server listenging on http://localhost:3000')
})
```

If you need to pass custom options to `next` just pass them to register as second parameter.
```js
fastify.register(require('fastify-react'), { dev: true })
```

## Acknowledgements

This project is kindly sponsored by:
- [nearForm](http://nearform.com)
- [LetzDoIt](http://www.letzdoitapp.com/)

## License

Licensed under [MIT](./LICENSE).
