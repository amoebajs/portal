import { Injectable, Scope } from "@nestjs/common";
import { UserRepo } from "#database/repos/user.repo";
import { User, getUserDelegate } from "./user";
import { AuthService } from "./auth";

@Injectable({ scope: Scope.REQUEST })
export class FakeAuthService extends AuthService<string> {
  constructor(private readonly user: User, private users: UserRepo) {
    super();
  }

  public async hasAccess(
    host: import("@nestjs/common/interfaces").HttpArgumentsHost,
    roles: string[],
  ): Promise<boolean> {
    const userinfo = await this.users.query({ key: "12345678" });
    if (!userinfo) {
      await this.users.create({
        key: "12345678",
        name: "fakeUser",
        account: "fakeUserAccount",
        extends: JSON.stringify({}),
      });
      getUserDelegate(this.user)
        .setLogined(true)
        .setUserId("12345678")
        .setUserName("fakeUser")
        .setUserAccount("fakeUserAccount")
        .setUserRoles(roles)
        .setExtendInfos({});
      return true;
    }
    getUserDelegate(this.user)
      .setLogined(true)
      .setUserId(userinfo.key)
      .setUserName(userinfo.name)
      .setUserAccount(userinfo.account)
      .setUserRoles(roles)
      .setExtendInfos(JSON.parse(userinfo.extends ?? "{}"));
    return true;
  }
}
