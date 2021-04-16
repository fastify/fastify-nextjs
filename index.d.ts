/// <reference types="next" />

import {
  FastifyReply,
  FastifyRequest,
  FastifyPluginCallback,
  FastifySchema,
  HTTPMethods
} from 'fastify';
import { NextServer } from 'next/dist/server/next';
import underPressure from 'under-pressure';

declare module 'fastify' {
  type FastifyNextCallback = (
    app: NextServer,
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

// Infer options type, because not exported from Next.
type NextServerConstructor = ConstructorParameters<typeof NextServer>[0]

declare namespace fastifyNext {
  interface FastifyNextOptions extends NextServerConstructor {
    underPressure?: boolean | underPressure.UnderPressureOptions;
    noServeAssets?: boolean;
  }
}

declare const fastifyNext: FastifyPluginCallback<fastifyNext.FastifyNextOptions>;

export default fastifyNext;
