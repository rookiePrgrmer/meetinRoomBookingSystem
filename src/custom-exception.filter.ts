import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class CustomExceptionFilter<T> implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response: Response = host.switchToHttp().getResponse();
    response.statusCode = exception.getStatus();

    const res = exception.getResponse() as { message: string | string[] };

    response.json({
      code: exception.getStatus(),
      message: 'fail',
      data: res?.message || exception.message
    }).end();
  }
}
