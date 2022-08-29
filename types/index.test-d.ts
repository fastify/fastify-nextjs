import fastify, { FastifyInstance } from 'fastify';
import { expectError } from 'tsd';
import fastifyNext from '..';

// Declaration merging for custom property injection
declare module 'http' {
  interface IncomingMessage {
    server: FastifyInstance
  }
}

const app = fastify();

app
  .register(fastifyNext, {
    logLevel: 'error', // option from Fastify.js, RegisterOptions
    underPressure: false, // option from fastify-nextjs, FastifyNextOptions
    noServeAssets: false, // option from fastify-nextjs, FastifyNextOptions
    dev: true // option from Next.js,
  })
  .after(() => {
    app.setErrorHandler((err, req, reply) => {
      reply.log.error({ req, res: reply, err }, 'Internal server error');
      return reply.code(500).nextRenderError(err);
    });

    app.next('/a');

    app.next('/*', (nextApp, req, reply) => {
      if (!nextApp.options) {
        throw new Error("nextApp hasn't options!");
      }

      return nextApp
        .getRequestHandler()(req.raw, reply.raw)
        .then(() => {
          reply.hijack()
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

    app.next('/options-with-hook-injecting-custom-property', {
      onRequest: (req, _, done) => {
        req.raw.server = req.server;
        done();
      },
    });

    expectError(app.next('/unknown-option', {
      invalid: 'unknown-option'
    }))
  });
