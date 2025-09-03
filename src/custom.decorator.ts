import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import { Request } from "express";
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export const RequireLogin = () => SetMetadata('require-login', true);

export const RequirePermission = (...permissions: string[]) => SetMetadata('require-permission', permissions);

export const UserInfo = createParamDecorator(
  (key: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.user) return null;
    return key ? request.user[key] : request.user;
  }
);

export function MinLengthIfNotEmpty(min: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'minLengthIfNotEmpty',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (value === null || value === undefined || value === '') {
            return true; // 允许空
          }
          return typeof value === 'string' && value.length <= min;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} 长度至少为 ${min} 位`;
        },
      },
    });
  };
}