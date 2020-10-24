# fastify-nextjs

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)  ![CI workflow](https://github.com/fastify/fastify-nextjs/workflows/CI%20workflow/badge.svg)

React server side rendering support for Fastify with [Next](https://nextjs.org/docs/advanced-features/custom-server) Framework.

## Install
```
npm i fastify-nextjs next --save
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
## Acknowledgements

This project is kindly sponsored by:
- [nearForm](http://nearform.com)
- [LetzDoIt](http://www.letzdoitapp.com/)

## License

Licensed under [MIT](./LICENSE).
