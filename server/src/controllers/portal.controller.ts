import { Response as Resp } from "express";
import { Controller, Get, Response } from "@nestjs/common";
import { ConfigService } from "../services/config.service";
import { UseRolesAuthentication } from "../utils/roles";

@Controller("portal")
@UseRolesAuthentication({ roles: ["admin"] })
export class PortalController {
  constructor(private readonly configs: ConfigService) {}

  @Get(["", "/*", "/**/*"])
  getIndex(@Response() resp: Resp) {
    const config = this.configs.getConfig();
    if (config.portal.type === "redirect") {
      return resp.redirect(config.portal.uri);
    }
    return resp.render(config.portal.uri);
  }
}
