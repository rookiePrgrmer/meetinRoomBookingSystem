import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

export class UnloginException {
  message: string;

  constructor(message?) {
    this.message = message;
  }
}

@Catch(UnloginException)
export class UnloginFilter<T> implements ExceptionFilter {
  catch(exception: UnloginException, host: ArgumentsHost) {
    const response: Response = host.switchToHttp().getResponse();
    response.json({
      code: HttpStatus.UNAUTHORIZED,
      message: 'fail',
      data: exception.message || '用户未登录'
    }).end();
  }
}
