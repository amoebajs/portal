import { Response as Resp } from "express";
import { Controller, Get, Param, Response } from "@nestjs/common";
import { ConfigService } from "#services/configs";
import { Compiler } from "#services/compiler";

@Controller("site")
export class SiteController {
  constructor(private readonly appService: ConfigService, private readonly compiler: Compiler) {}

  @Get("/:templateName")
  async getIndexHtml(@Param("templateName") name: string, @Response() resp: Resp) {
    const template = await this.compiler.queryPageUri(name);
    if (!template) {
      throw new Error(`page[${name}] is not found`);
    }
    return resp.render(template);
  }
}
