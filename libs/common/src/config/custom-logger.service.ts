import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class CustomLogger implements LoggerService {
  log(message: any, context?: string) {
    console.log(`[LOG] [${context || 'App'}]`, message);
  }

  error(message: any, trace?: string, context?: string) {
    console.error(`[ERROR] [${context || 'App'}]`, message, trace || '');
  }

  warn(message: any, context?: string) {
    console.warn(`[WARN] [${context || 'App'}]`, message);
  }

  debug?(message: any, context?: string) {
    console.debug(`[DEBUG] [${context || 'App'}]`, message);
  }

  verbose?(message: any, context?: string) {
    console.info(`[VERBOSE] [${context || 'App'}]`, message);
  }
}
