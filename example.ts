import fastify from 'fastify'
import fastNext from './index';
const fastifyApp = fastify();

fastifyApp
  .register(fastNext)
  .after(() => {
    fastifyApp.next('/hello')
  })

fastifyApp.listen(3000, err => {
  if (err) throw err
  console.log('Server listenging on http://localhost:3000')
})