import { Injectable, Scope } from "@nestjs/common";
import { Observable } from "rxjs";
import { AuthService } from "#services/authentication/auth.service";
import { getUserDelegate, User } from "#services/authentication/user.service";

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
      .setUserId(12345678)
      .setUserName("fakeUser")
      .setUserAccount("fakeUserAccount")
      .setUserRoles(roles)
      .setExtendInfos({});
    return true;
  }
}
