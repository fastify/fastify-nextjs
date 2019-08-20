import fastify from 'fastify';
import fastifyReact from './index';

const app = fastify();

app.register(fastifyReact).after(() => {
  app.next('/*', (nextApp, req, reply) => {
    return nextApp.handleRequest(req.req, reply.res).then(() => {
      reply.sent = true;
    });
  });
});
