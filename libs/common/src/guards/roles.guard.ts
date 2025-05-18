import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user } = context.switchToHttp().getRequest();

    // 사용자 정보가 없으면 차단
    if (!user) {
      throw new ForbiddenException('권한 정보가 없습니다.');
    }

    // ADMIN은 모든 권한 허용
    if (user.role === 'ADMIN') {
      return true;
    }

    // 다른 역할의 경우, 해당 역할 포함 여부 검사
    if (!requiredRoles) return true;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return true;
  }
}
