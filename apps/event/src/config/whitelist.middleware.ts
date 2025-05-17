import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class IpWhitelistMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const remoteAddress = req.connection.remoteAddress;

    console.log('Request from:', remoteAddress); // 확인용

    if (!remoteAddress?.includes('172.19.0.100')) {
      throw new ForbiddenException('Only gateway can access auth');
    }

    next();
  }
}
