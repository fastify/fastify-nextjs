/// <reference types="next" />

import {
  FastifyReply,
  FastifyRequest,
  HTTPMethod,
  Plugin,
  RouteSchema,
} from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
import DevServer from 'next/dist/server/next-dev-server';
import { Router } from 'next/router';

declare module 'fastify' {
  type FastifyNextCallback = (
    app: DevServer,
    req: FastifyRequest<any>,
    reply: FastifyReply<any>
  ) => Promise<void>;

  interface FastifyInstance<
    HttpServer = Server,
    HttpRequest = IncomingMessage,
    HttpResponse = ServerResponse
  > {
    next(
      path: string,
      opts:
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

declare const fastifyReact: Plugin<
  Server,
  IncomingMessage,
  ServerResponse,
  { [key: string]: any }
>;

export = fastifyReact;
