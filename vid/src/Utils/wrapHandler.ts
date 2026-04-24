/**
 * Express-to-Fastify compatibility layer.
 * Allows Express-style controllers (req, res, next) to work
 * inside Fastify without any changes to controller code.
 */
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ExpressHandler, ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";

function createResProxy(reply: FastifyReply, onSend?: () => void): ExpressResponse {
  const proxy: ExpressResponse = {
    statusCode: 200,
    status(code: number) {
      reply.code(code);
      proxy.statusCode = code;
      return proxy;
    },
    json(data: unknown) {
      onSend?.();
      return reply.send(data);
    },
    send(data: unknown) {
      onSend?.();
      return reply.send(data);
    },
    sendStatus(code: number) {
      onSend?.();
      return reply.code(code).send();
    },
    setHeader(name: string, value: string) {
      reply.header(name, value);
      return proxy;
    },
    header(name: string, value: string) {
      reply.header(name, value);
      return proxy;
    },
    end(data?: unknown) {
      onSend?.();
      return reply.send(data || "");
    },
    redirect(url: string) {
      onSend?.();
      return reply.redirect(url);
    },
  };

  return new Proxy(proxy, {
    get(target, prop) {
      if (prop in target) {
        return (target as unknown as Record<string | symbol, unknown>)[prop as string];
      }
      const val = (reply as unknown as Record<string | symbol, unknown>)[prop as string];
      return typeof val === "function" ? (val as (...a: unknown[]) => unknown).bind(reply) : val;
    },
    set(target, prop, value) {
      (target as unknown as Record<string | symbol, unknown>)[prop as string] = value;
      return true;
    },
  }) as ExpressResponse;
}

/**
 * Wraps an Express route handler (req, res, next) for Fastify.
 * Controllers need ZERO changes.
 */
export function wrapHandler(handler: ExpressHandler) {
  return async function fastifyHandler(request: FastifyRequest, reply: FastifyReply) {
    const next: NextFunction = (err) => {
      if (err) throw err;
    };
    const res = createResProxy(reply);
    return handler(request as ExpressRequest, res, next);
  };
}

/**
 * Wraps an Express middleware (req, res, next) for use as Fastify preHandler.
 * Handles both the "call next()" and "send response early" patterns.
 */
export function wrapMiddleware(middleware: ExpressHandler) {
  return function fastifyPreHandler(
    request: FastifyRequest,
    reply: FastifyReply,
    done: (err?: Error) => void
  ) {
    let responseSent = false;
    const res = createResProxy(reply, () => {
      responseSent = true;
    });

    const result = middleware(request as ExpressRequest, res, (err) => {
      if (err) return done(err instanceof Error ? err : new Error(String(err)));
      done();
    });

    if (result instanceof Promise) {
      void result.catch((err: unknown) => {
        if (!responseSent) {
          const e = err instanceof Error ? err : new Error(String(err));
          done(e);
        }
      });
    }
  };
}

/**
 * Wraps an Express middleware factory (e.g., validateBody(schema))
 * into a Fastify preHandler factory.
 */
export function wrapMiddlewareFactory(
  factory: (...args: unknown[]) => ExpressHandler
): (...args: unknown[]) => ReturnType<typeof wrapMiddleware> {
  return (...args: unknown[]) => wrapMiddleware(factory(...args));
}
