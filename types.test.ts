import fastify from 'fastify';
import fastifyReact from './index';

const app = fastify();

app.register(fastifyReact).after(() => {
  app.next('/a');
  
  app.next('/*', (nextApp, req, reply) => {
    return nextApp
      .getRequestHandler()(req.req, reply.res)
      .then(() => {
        reply.sent = true;
      });
  });
});
