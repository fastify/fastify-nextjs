/// <reference types="next" />

import {
  FastifyReply,
  FastifyRequest,
  FastifyPluginCallback,
  FastifySchema,
  HTTPMethods
} from 'fastify';
import DevServer from 'next/dist/server/next-dev-server';

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

  interface FastifyReply {
    nextRender(path: string): Promise<void>;
  }
}

declare const fastifyNext: FastifyPluginCallback<{ [key: string]: any }>;

export default fastifyNext;
