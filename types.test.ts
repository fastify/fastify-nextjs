import fastify from 'fastify';
import fastifyNext from './index';

const app = fastify();

app.register(fastifyNext, {
  logLevel: "error", // option from Fastify.js, RegisterOptions
  underPressure: false, // option from fastify-nextjs, FastifyNextOptions
  noServeAssets: false, // option from fastify-nextjs, FastifyNextOptions
  dev: true, // option from Next.js,
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
