# fastify-react

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)  [![Build Status](https://travis-ci.org/fastify/fastify-react.svg?branch=master)](https://travis-ci.org/fastify/fastify-react)

React server side rendering support for Fastify with [Next](https://github.com/zeit/next.js/#custom-server-and-routing) Framework.

## Install
```
npm i fastify-react --save
```

## Usage
Since Next needs some time to be ready on the first launch, you must declare your routes inside the `after` callback, after you registered the plugin.  
The plugin will expose the api `next` in Fastify that will handle the rendering for you.  
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
All you server rendered pages must be saved in the folder `pages`, as you can see in the [next documentation](https://github.com/zeit/next.js/#custom-server-and-routing).
```js
// /pages/hello.js
export default () => <div>hello world</div>
```
If you need to pass [custom options](https://github.com/zeit/next.js/#custom-configuration) to `next` just pass them to register as second parameter.
```js
fastify.register(require('fastify-react'), { dev: true })
```

If you need to handle yourself the render part, just pass a callback to `next`:
```js
fastify.next('/hello', (app, req, reply) => {
  // your code
  // `app` is the Next instance
  app.render(req.req, reply.res, '/hello', req.query, {}})
})
```
## Acknowledgements

This project is kindly sponsored by:
- [nearForm](http://nearform.com)
- [LetzDoIt](http://www.letzdoitapp.com/)

## License

Licensed under [MIT](./LICENSE).
