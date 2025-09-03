import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class PermissionGuard implements CanActivate {

  @Inject()
  private reflector: Reflector;

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    if (!request.user) return true;

    const userPermissions = request.user.permissions;
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('require-permission', [
      context.getClass(),
      context.getHandler()
    ]);
    if (!requiredPermissions) return true;

    const hasNoPermission = requiredPermissions.some(requiredPermission => {
      return !userPermissions.find(userPermission => userPermission.code === requiredPermission);
    });
    if (hasNoPermission) {
      throw new UnauthorizedException('您没有访问该接口的权限');
    }

    return true;
  }
}
