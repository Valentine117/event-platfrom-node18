import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { CustomLogger } from '@lib/common';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: CustomLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl } = req;

    this.logger.log(`Incoming Request: ${method} ${originalUrl}`, 'Request');

    return next.handle().pipe(
      tap(() => {
        this.logger.log(`Handled: ${method} ${originalUrl}`, 'Response');
      }),
    );
  }
}
