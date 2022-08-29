# @fastify/nextjs

![CI](https://github.com/fastify/fastify-nextjs/workflows/CI/badge.svg)
[![NPM version](https://img.shields.io/npm/v/@fastify/nextjs.svg?style=flat)](https://www.npmjs.com/package/@fastify/nextjs)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://standardjs.com/)

React server-side rendering support for Fastify with [Next.js](https://nextjs.org/docs/advanced-features/custom-server) framework. This library is for letting an existing Fastify server utilize NextJS, not for replacing NextJS' internal webserver with Fastify.

## Install
```
npm i @fastify/nextjs next react react-dom
```

## Usage
Since Next.js needs some time to be ready on the first launch, you must declare your routes inside the `after` callback, after you registered the plugin.
The plugin will expose the `next` API in Fastify that will handle the rendering for you.
```js
const fastify = require('fastify')()

fastify
  .register(require('@fastify/nextjs'))
  .after(() => {
    fastify.next('/hello')
  })

fastify.listen(3000, err => {
  if (err) throw err
  console.log('Server listening on http://localhost:3000')
})
```

All your server rendered pages must be saved in the folder `pages`, as you can see in the [Next.js documentation](https://nextjs.org/docs/advanced-features/custom-server).
```js
// /pages/hello.js
export default () => <div>hello world</div>
```
If you need to pass [custom options](https://nextjs.org/docs/advanced-features/custom-server) to `next` just pass them to register as second parameter.
```js
fastify.register(require('@fastify/nextjs'), { dev: true })
```

If you need to handle the render part yourself, just pass a callback to `next`:
```js
fastify.next('/hello', (app, req, reply) => {
  // your code
  // `app` is the Next instance
  app.render(req.raw, reply.raw, '/hello', req.query, {})
})
```

If you need to render with Next.js from within a custom handler, use `reply.nextRender`

```js
app.setErrorHandler((err, req, reply) => {
  return reply.nextRender('/a')
})
```

If you need to render a Next.js error page, use `reply.nextRenderError`

```js
app.setErrorHandler((err, req, reply) => {
  return reply.status(err.statusCode || 500).nextRenderError(err)
})
```

If you need to handle HEAD routes, you can define the HTTP method:
```js
fastify.next('/api/*', { method: 'GET' });
fastify.next('/api/*', { method: 'HEAD' });
```

### Assets serving

By default plugin handle route `${basePath}/_next/*` and forward to Next.js.

If you have custom preprocessing for `_next/*` requests, you can prevent this this handling with `noServeAssets: true` property for plugin options:

```js
fastify
  .register(require('@fastify/nextjs'), {
    noServeAssets: true
  })
  .after(() => {
    fastify.next(`${process.env.BASE_PATH || ''}/_next/*`, (app, req, reply) => {
      // your code
      app.getRequestHandler()(req.raw, reply.raw).then(() => {
        reply.hijack()
      })
    })
  })
```

### under-pressure

The plugin includes [under-pressure](https://github.com/fastify/under-pressure), which can be configured by providing an `underPressure` property to the plugin options.

Using `under-pressure` allows implementing a circuit breaker that returns an error when the health metrics are not respected.
Because React server side rendering is a blocking operation for the Node.js server, returning an error to the client allows signalling that the server is under too much load.

The available options are the same as those accepted by `under-pressure`.

For example:

```js
fastify.register(require('@fastify/nextjs'), {
  underPressure: {
    exposeStatusRoute: true
  }
})
```

- `underPressure` - `bool|object`

  - (default) when false, `under-pressure` is not registered
  - when true, `under-pressure` is registered with default options
  - when it is an object, `under-pressure` is registered with the provided options

## Custom properties on the request object
If you want to share custom objects (for example other fastify plugin instances - e.g. @fastify/redis) across the server/client with each page request, you can use the `onRequest` hook to add it to the request object.
Here is an example on how to do it:

```js
const Fastify = require('fastify')
const FastifyRedis = require('@fastify/redis')
const FastifyNextJS = require('@fastify/nextjs')

const fastify = Fastify()
fastify.register(FastifyRedis, { host: '127.0.0.1' })
fastify.register(FastifyNextJS)

fastify.register(function(instance) {
  // for performance reasons we do not want it to run on every request
  // only the nextjs one should run
  instance.addHook('onRequest', function(request, reply, done) {
    // define a custom property on the request
    request.raw.customProperty = { hello: "world" }
    // OR make the instance of @fastify/redis available in the request
    request.raw.redisInstance = instance.redis
    done()
  })

  instance.next('/', function(app, request, reply) {
    // your custom property containing the object will be available here
    // request.raw.customProperty
    // OR the redis instance
    // request.raw.redisInstance
    app.render(request.raw, reply.raw, '/hello', request.query, {})
  })
}, { prefix: '/hello' })
```
In the example above we made the `customProperty` and `redisInstance` accessible in every request that is made to the server. On the client side it can be accessed like in this example:
```js
const CustomPropPage = ({ cp, ri }) => <div>custom property value: {cp} | redis instance: {ri}</div>;

export default CustomPropPage;

export const getServerSideProps = async function (ctx) {
  return {
    props: {
      cp: ctx.req.customProperty,
      ri: ctx.req.redisInstance,
    }
  };
};
```

## Plugin Timeout and Next.js development mode
The default timeout for plugins in Fastify is 10000ms, which can be a problem for huge Next.js Projects where the initial build time is higher than that.
Usually, you will get an error like this:
```
Error: ERR_AVVIO_PLUGIN_TIMEOUT: plugin did not start in time: /app/node_modules/@fastify/nextjs/index.js. You may have forgotten to call 'done' function or to resolve a Promise
```

The workaround or fix is to increase the plugin timeout:
```js
const isDev = process.env.NODE_ENV !== 'production';
const fastify = Fastify({ pluginTimeout: isDev ? 120_000 : undefined });
```

## Development
CI currently runs npm@6 so when upgrading packages, please use this version.

## Acknowledgements

This project is kindly sponsored by:
- [NearForm](https://nearform.com)
- [LetzDoIt](https://www.letzdoitapp.com/)

## License

Licensed under [MIT](./LICENSE).
