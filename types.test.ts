import fastify = require('fastify');
import fastifyReact = require('./index');

const app = fastify();

app.register(fastifyReact).after(() => {});
