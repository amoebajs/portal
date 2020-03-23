import { ArgumentsHost, Catch, ExceptionFilter, ForbiddenException, HttpException } from "@nestjs/common";
import { Request, Response } from "express";
import { Authentication } from "#services/authentication/auth.service";
import { User } from "#services/authentication/user.service";

@Catch(ForbiddenException)
export class ForbiddenExceptionFilter implements ExceptionFilter {
  constructor(private readonly auth: Authentication, private readonly user: User) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    if (this.auth.handleWhenUnauthentication) {
      this.auth.handleWhenUnauthentication(ctx);
      return;
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: "403 Forbidden",
      infos: this.user.infos,
    });
  }
}
