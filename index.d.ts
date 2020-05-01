/// <reference types="next" />

import {
  FastifyReply,
  FastifyRequest,
  FastifyPlugin,
  HTTPMethod,
  Plugin,
  RouteSchema,
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
            method: HTTPMethod;
            schema: RouteSchema;
            next: Router;
          }
        | FastifyNextCallback,
      handle?: FastifyNextCallback
    ): void;
  }
}

declare const fastifyReact: FastifyPlugin<{ [key: string]: any }>;

export default fastifyReact;
