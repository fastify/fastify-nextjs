# fastify-nextjs

![CI](https://github.com/fastify/fastify-nextjs/workflows/CI/badge.svg)
[![NPM version](https://img.shields.io/npm/v/fastify-nextjs.svg?style=flat)](https://www.npmjs.com/package/fastify-nextjs)
[![Known Vulnerabilities](https://snyk.io/test/github/fastify/fastify-nextjs/badge.svg)](https://snyk.io/test/github/fastify/fastify-nextjs)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://standardjs.com/)

React server side rendering support for Fastify with [Next](https://nextjs.org/docs/advanced-features/custom-server) Framework.

## Install
```
npm i fastify-nextjs next react react-dom --save
```

## Usage
Since Next needs some time to be ready on the first launch, you must declare your routes inside the `after` callback, after you registered the plugin.  
The plugin will expose the api `next` in Fastify that will handle the rendering for you.  
```js
const fastify = require('fastify')()

fastify
  .register(require('fastify-nextjs'))
  .after(() => {
    fastify.next('/hello')
  })

fastify.listen(3000, err => {
  if (err) throw err
  console.log('Server listening on http://localhost:3000')
})
```

All you server rendered pages must be saved in the folder `pages`, as you can see in the [next documentation](https://nextjs.org/docs/advanced-features/custom-server).
```js
// /pages/hello.js
export default () => <div>hello world</div>
```
If you need to pass [custom options](https://nextjs.org/docs/advanced-features/custom-server) to `next` just pass them to register as second parameter.
```js
fastify.register(require('fastify-nextjs'), { dev: true })
```

If you need to handle the render part yourself, just pass a callback to `next`:
```js
fastify.next('/hello', (app, req, reply) => {
  // your code
  // `app` is the Next instance
  app.render(req.raw, reply.raw, '/hello', req.query, {})
})
```

If you need to render with Next from within a custom handler (such as an error handler), use `reply.renderNext`

```js
app.setErrorHandler((err, req, reply) => {
  reply.status(err.statusCode || 500)
  return reply.nextRender('/_error')
})
```

If you need to handle POST routes, you can define the HTTP method:
```js
fastify.next('/api/*', { method: 'GET' });
fastify.next('/api/*', { method: 'POST' });
```

### under-pressure

The plugin includes [under-pressure](https://github.com/fastify/under-pressure), which can be configured by providing an `underPressure` property to the plugin options. 

Using `under-pressure` allows implementing a circuit breaker which returns an error when the health metrics are not respected. 
Because React server side rendering is a blocking operation for the Node.js server, returning an error to the client allows signalling that the server is under too much load.

The available options are the same as those accepted by `under-pressure`.

For example:

```js
fastify.register(require('fastify-nextjs'), { 
  underPressure: {
    exposeStatusRoute: true
  }
})
```

- `underPressure` - `bool|object`

  - (default) when false, `under-pressure` is not registered
  - when true, `under-pressure` is registered with default options
  - when it is an object, `under-pressure` is registered with the provided options

## Acknowledgements

This project is kindly sponsored by:
- [NearForm](https://nearform.com)
- [LetzDoIt](https://www.letzdoitapp.com/)

## License

Licensed under [MIT](./LICENSE).
