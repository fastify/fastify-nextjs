import fastify, { FastifyInstance } from 'fastify';
import { expectError, expectType } from 'tsd';
import fastifyNext from './index';

const app = fastify();

app
  .register(fastifyNext, {
    logLevel: 'error', // option from Fastify.js, RegisterOptions
    underPressure: false, // option from fastify-nextjs, FastifyNextOptions
    noServeAssets: false, // option from fastify-nextjs, FastifyNextOptions
    dev: true // option from Next.js,
  })
  .after(() => {
    app.next('/a');

    app.next('/*', (nextApp, req, reply) => {
      if (!nextApp.options) {
        throw new Error("nextApp hasn't options!");
      }

      return nextApp
        .getRequestHandler()(req.raw, reply.raw)
        .then(() => {
          reply.sent = true;
        });
    });

    app.next('/options-without-schema', {
      method: 'GET'
    });

    app.next(
      '/options-with-schema',
      {
        method: 'POST',
        schema: {}
      },
      async (_, __, reply) => {
        reply.send('OK');
      }
    );
  });
