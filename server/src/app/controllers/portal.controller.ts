import { Response as Resp } from "express";
import { Controller, Get, Response } from "@nestjs/common";
import { ConfigService } from "#global/services/config.service";
import { User } from "#global/services/user.service";
import { UseRolesAuthentication } from "#utils/roles";

@Controller("portal")
@UseRolesAuthentication({ roles: ["admin"] })
export class PortalController {
  constructor(private readonly configs: ConfigService, private readonly user: User) {}

  @Get(["", "/*", "/**/*"])
  getIndex(@Response() resp: Resp) {
    const config = this.configs.getConfig().uriGroup;
    if (config.portal.type === "redirect") {
      return resp.redirect(config.portal.uri);
    }
    return resp.render(config.portal.uri);
  }
}
