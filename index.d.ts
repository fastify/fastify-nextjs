import { Plugin } from "fastify";
import { Server, IncomingMessage, ServerResponse } from "http"

declare const fastifyReact: Plugin<
  Server,
  IncomingMessage,
  ServerResponse,
  { [key: string]: any }
>;

export = fastifyReact;
