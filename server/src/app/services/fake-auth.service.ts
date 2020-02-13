import { Injectable, Scope } from "@nestjs/common";
import { Observable } from "rxjs";
import { AuthService } from "#global/services/auth.service";
import { getUserDelegate, User } from "#global/services/user.service";

@Injectable({ scope: Scope.REQUEST })
export class FakeAuthService extends AuthService<string> {
  constructor(private readonly user: User) {
    super();
  }

  public hasAccess(
    host: import("@nestjs/common/interfaces").HttpArgumentsHost,
    roles: string[],
  ): boolean | Promise<boolean> | Observable<boolean> {
    getUserDelegate(this.user)
      .setLogined(true)
      .setUserId(new Date().getTime())
      .setUserName("fakeUser")
      .setUserAccount("fakeUserAccount")
      .setUserRoles(roles)
      .setExtendInfos({});
    return true;
  }
}
