import { Injectable, Scope } from "@nestjs/common";
import { Observable } from "rxjs";
import { AuthService } from "#global/services/auth.service";
import { UserService, getUserDelegate } from "#global/services/user.service";
import { createToken } from "#utils/di";

export type Authentication = AuthService<string>;
export const Authentication = createToken<Authentication>(AuthService);

@Injectable({ scope: Scope.REQUEST })
export class FakeAuthService extends Authentication {
  constructor(private readonly user: UserService<number, string, {}>) {
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
