import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';

@Injectable()
export class FTAuthGuard extends AuthGuard('ft') implements CanActivate {
  constructor(private readonly userService: UserService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Retrieve the current session's user information.
    const request = context.switchToHttp().getRequest();
    const userData = JSON.parse(request?.cookies?.userData);
    const session_key = request?.cookies?.session_key;

    // If the user is authenticated,
    if (
      userData &&
      session_key === this.userService.getSession(userData.intraid)
    ) {
      // Assign the authenticated user information to the Req.user object.
      //request.user = userData;
      //console.log('authenticated!');
      return true;
    }

    // If the user is not authenticated,
    //console.log('not authenticated!');
    return false;
  }
}
