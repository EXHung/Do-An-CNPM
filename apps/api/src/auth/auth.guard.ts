import { CanActivate, ExecutionContext, Injectable, Inject } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthedRequest } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    request.user = await this.auth.currentUser(request);
    return true;
  }
}
