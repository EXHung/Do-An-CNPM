import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';

const codes: Record<number, string> = { 400: 'VALIDATION_ERROR', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 429: 'RATE_LIMITED' };

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại.';
    let details: unknown;
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = codes[status] ?? 'REQUEST_ERROR';
      const body = exception.getResponse();
      if (typeof body === 'string') message = body;
      else if (body && typeof body === 'object') {
        const fields = body as Record<string, unknown>;
        if (typeof fields.code === 'string') code = fields.code;
        if (typeof fields.message === 'string') message = fields.message;
        details = fields.details;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
      status = 409; code = 'CONFLICT'; message = 'Thông tin này đã được sử dụng.';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2025') {
      status = 404; code = 'NOT_FOUND'; message = 'Không tìm thấy dữ liệu.';
    }
    const requestId = randomUUID();
    response.setHeader('X-Request-Id', requestId);
    response.status(status).json({ code, message, ...(details !== undefined ? { details } : {}), requestId });
  }
}
