/// <reference types="next" />

import type {
  ContextConfigDefault,
  FastifyPluginCallback,
  FastifyRequest,
  FastifySchema,
  HTTPMethods
} from 'fastify';
import type { RouteGenericInterface, RouteShorthandOptions } from 'fastify/types/route';
import { NextServer } from 'next/dist/server/next';
import underPressure from '@fastify/under-pressure';

declare module 'fastify' {
  type FastifyNextCallback = (
    app: NextServer,
    req: FastifyRequest,
    reply: FastifyReply
  ) => Promise<void>;

  interface FastifyInstance<RawServer, RawRequest, RawReply> {
    next<
      RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
      ContextConfig = ContextConfigDefault,
      SchemaCompiler extends FastifySchema = FastifySchema
    >(
      path: string,
      opts?:
        | (RouteShorthandOptions<
            RawServer,
            RawRequest,
            RawReply,
            RouteGeneric,
            ContextConfig,
            SchemaCompiler
          > & {
            method?: HTTPMethods;
          })
        | FastifyNextCallback,
      handle?: FastifyNextCallback
    ): void;
  }

  interface FastifyReply {
    nextRender(path: string): Promise<void>;
    nextRenderError(err: any): Promise<void>;
  }
}

// Infer options type, because not exported from Next.
type NextServerConstructor = ConstructorParameters<typeof NextServer>[0];

declare namespace fastifyNext {
  interface FastifyNextOptions extends NextServerConstructor {
    underPressure?: boolean | underPressure.UnderPressureOptions;
    noServeAssets?: boolean;
  }
}

declare const fastifyNext: FastifyPluginCallback<fastifyNext.FastifyNextOptions>;

export default fastifyNext;
