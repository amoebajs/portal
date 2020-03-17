import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { Compiler } from "#global/services/compile.service";
import { User } from "#global/services/user.service";
import { SetRoles, UseRolesAuthentication } from "#utils/roles";

@Controller("api")
@UseRolesAuthentication({ roles: ["admin"] })
export class ApiController {
  constructor(private readonly compiler: Compiler, private readonly user: User) {}

  @Get("user")
  @SetRoles("admin")
  public getUserInfos() {
    return {
      code: 0,
      data: this.user.infos,
    };
  }

  @Get("templates")
  @SetRoles("admin")
  public queryTemplateGroup() {
    return {
      code: 0,
      data: this.compiler.getTemplateGroup(),
    };
  }

  @Post("preview")
  @SetRoles("super-admin")
  public async createSourcePreview(@Body() data: any) {
    console.log("create preview ==> ");
    console.log(data);
    const { configs: others } = data;
    const { source, dependencies } = await this.compiler.createSourceString(others, {
      enabled: true,
      jsx: "react",
      target: "es2015",
      module: "es2015",
    });
    return {
      code: 0,
      data: {
        source,
        dependencies,
        configs: data,
      },
    };
  }

  @Post("task")
  @SetRoles("super-admin")
  public async createtask(@Body() data: any) {
    console.log("create task ==> ");
    console.log(data);
    const { name, configs: options } = data;
    const id = await this.compiler.createTask({ name, options, creator: String(this.user.infos.id) });
    return {
      code: 0,
      data: {
        id,
        creator: String(this.user.infos.id),
        configs: options,
      },
    };
  }

  @Get("task")
  @SetRoles("admin")
  public async gettask(@Query("id") id: string) {
    console.log("query task ==> " + id);
    const result = await this.compiler.queryTask(id);
    console.log(result);
    if (!result) {
      return {
        code: 404,
        data: {
          id: -1,
          errorMsg: `task[${id}] not found`,
        },
      };
    }
    return { code: 0, data: result };
  }
}
