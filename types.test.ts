import fastify from 'fastify';
import fastifyNext from './index';

const app = fastify();

app.register(fastifyNext, {
  logLevel: "error"
}).after(() => {
  app.next('/a');

  app.next('/*', (nextApp, req, reply) => {
    return nextApp
      .getRequestHandler()(req.raw, reply.raw)
      .then(() => {
        reply.sent = true;
      });
  });
});
