/// <reference types="next" />

import {
  FastifyReply,
  FastifyRequest,
  FastifyPlugin,
  FastifySchema,
  HTTPMethods
} from 'fastify';
import DevServer from 'next/dist/server/next-dev-server';
import { Router } from 'next/router';

declare module 'fastify' {
  type FastifyNextCallback = (
    app: DevServer,
    req: FastifyRequest,
    reply: FastifyReply
  ) => Promise<void>;

  interface FastifyInstance {
    next(
      path: string,
      opts?:
        | {
            method: HTTPMethods;
            schema: FastifySchema;
          }
        | FastifyNextCallback,
      handle?: FastifyNextCallback
    ): void;
  }
}

declare const fastifyNext: FastifyPlugin<{ [key: string]: any }>;

export default fastifyNext;
