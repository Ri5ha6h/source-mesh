import { ArgumentsHost, Catch, HttpException, type ExceptionFilter, Logger } from '@nestjs/common';
import {
  AuthenticationError,
  AuthorizationError,
  ConfigurationError,
  ContextMismatchError,
} from '@source-mesh/contracts';
import type { FastifyReply } from 'fastify';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    if (error instanceof AuthenticationError) {
      if (error.reason === 'identity_provider_unavailable') {
        return reply.status(503).send({ error: 'identity_provider_unavailable' });
      }
      return reply.status(401).send({ error: 'authentication_required' });
    }
    if (error instanceof AuthorizationError) {
      return reply.status(403).send({ error: 'operation_not_permitted' });
    }
    if (error instanceof ContextMismatchError) {
      return reply.status(404).send({ error: 'workspace_not_found' });
    }
    if (error instanceof ConfigurationError) {
      const status = error.reason.startsWith('duplicate_') ? 409 : 422;
      return reply.status(status).send({ error: error.reason });
    }
    if (error instanceof HttpException) {
      return reply.status(error.getStatus()).send(error.getResponse());
    }
    this.logger.error(error instanceof Error ? error.message : 'Unknown unhandled error');
    return reply.status(500).send({ error: 'internal_error' });
  }
}
