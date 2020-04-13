import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { IPageCreateOptions } from "@amoebajs/builder";
import { Compiler } from "#services/compiler";
import { User } from "#services/authentication";
import { SetRoles, UseRolesAuthentication } from "#utils/roles";
import { MysqlWorker } from "#services/database";

@Controller("api")
@UseRolesAuthentication({ roles: ["admin"] })
export class ApiController {
  constructor(private readonly compiler: Compiler, private readonly worker: MysqlWorker, private readonly user: User) {}

  @Get("user")
  @SetRoles("admin")
  public getUserInfos() {
    return {
      code: 0,
      data: this.user.infos,
    };
  }

  @Get("pages")
  @SetRoles("admin")
  public async queryPagelist(
    @Query("current") current: string,
    @Query("size") size: string,
    @Query("name") name: string,
  ) {
    return {
      code: 0,
      data: await this.worker.queryList("PAGE", {
        name,
        current: +current,
        size: +size,
        orderKey: "updatedAt",
        orderBy: "DESC",
      }),
    };
  }

  @Get("page/:id/configs")
  @SetRoles("admin")
  public async queryPageConfiglist(
    @Param("id") pageId: string,
    @Query("current") current: string,
    @Query("size") size: string,
  ) {
    return {
      code: 0,
      data: await this.worker.querySelectList(
        "CONFIG",
        {
          pageId,
          current: +current,
          size: +size,
          orderKey: "updatedAt",
          orderBy: "DESC",
        },
        ["id", "name", "pageId", "createdAt", "updatedAt", "creator"],
      ),
    };
  }

  @Get("page/:id/versions")
  @SetRoles("admin")
  public async queryPageVersionlist(
    @Param("id") pageId: string,
    @Query("current") current: string,
    @Query("size") size: string,
    @Query("name") name: string,
  ) {
    return {
      code: 0,
      data: await this.worker.querySelectList(
        "VERSION",
        {
          name,
          current: +current,
          size: +size,
          orderKey: "updatedAt",
          orderBy: "DESC",
        },
        ["id", "name", "pageId", "configId", "taskId", "creator", "createdAt", "updatedAt"],
      ),
    };
  }

  @Get("page/:id")
  @SetRoles("admin")
  public async getPageDetails(@Param("id") id: string) {
    const page = await this.worker.query("PAGE", { id });
    if (!page) {
      return {
        code: 404,
        data: {
          errorMsg: `Page[${id}] not found`,
        },
      };
    }
    return {
      code: 0,
      data: await this.worker.query("PAGE", { id }),
    };
  }

  @Get("page/:id/version/:vid")
  @SetRoles("admin")
  public async getPageVersionDetails(@Param("id") _: string, @Param("vid") id: string) {
    return {
      code: 0,
      data: await this.worker.query("VERSION", { id }),
    };
  }

  @Get("page/:id/config/:cid")
  @SetRoles("admin")
  public async getPageConfigDetails(@Param("id") pageId: string, @Param("cid") id: string) {
    return {
      code: 0,
      data: await this.worker.query("CONFIG", { id, pageId }),
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

  @Post("page")
  @SetRoles("super-admin")
  public async createPage(
    @Body("name") name?: string,
    @Body("displayName") displayName?: string,
    @Body("description") description?: string,
  ) {
    try {
      return {
        code: 0,
        data: await this.worker.createPage({
          name,
          displayName,
          description,
          operator: String(this.user.infos.id),
        }),
      };
    } catch (error) {
      console.log(error);
      return {
        code: 500,
        data: {
          id: -1,
          errorMsg: error.message,
        },
      };
    }
  }

  @Post("task")
  @SetRoles("super-admin")
  public async createtask(
    @Body("name") name: string,
    @Body("configs") options: IPageCreateOptions,
    @Body("displayName") displayName?: string,
    @Body("description") description?: string,
    @Body("configName") configName?: string,
  ) {
    try {
      return {
        code: 0,
        data: {
          id: await this.compiler.createCompileTask({
            name,
            displayName,
            description,
            configName,
            options,
            creator: String(this.user.infos.id),
          }),
          creator: String(this.user.infos.id),
          configs: options,
        },
      };
    } catch (error) {
      console.log(error);
      return {
        code: 500,
        data: {
          id: -1,
          errorMsg: error.message,
        },
      };
    }
  }

  @Get("task/:id")
  @SetRoles("admin")
  public async gettask(@Param("id") id: string) {
    const result = await this.compiler.queryCompileTask(id);
    if (!result) {
      return {
        code: 404,
        data: {
          id: -1,
          errorMsg: `Task[${id}] not found`,
        },
      };
    }
    return { code: 0, data: result };
  }

  @Get("task/:id/logs")
  @SetRoles("admin")
  public async getTaskLogs(@Param("id") id: string) {
    const result = await this.compiler.queryCompileTaskLogs(id);
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
