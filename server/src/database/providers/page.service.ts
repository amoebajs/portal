import { BaseMysqlService } from "./base.service";
import { IPageListQueryOptions, IListQueryResult, IPageQueryOptions } from "#global/services/worker.service";
import { Page } from "#database/entity/page.entity";

export interface ICreateOptions {
  name: string;
  displayName?: string;
  creator: string;
}

export interface IUpdateOptions extends Partial<Omit<ICreateOptions, "creator">> {
  id: number | string;
  versionId?: string;
}

export class PageService extends BaseMysqlService {
  protected get repository() {
    return this.connection.getRepository(Page);
  }

  public async queryPageList(options: IPageListQueryOptions, repo = this.repository): Promise<IListQueryResult<Page>> {
    return this.invokeListQuery(repo, options);
  }

  public async queryPage(options: IPageQueryOptions, repo = this.repository): Promise<Page> {
    const queries: Partial<Page> = {};
    if (options.id !== void 0) queries.id = options.id;
    if (options.name !== void 0) queries.name = options.name;
    return this.queryEntry(repo, queries);
  }

  public async createPage(options: ICreateOptions, repo = this.repository): Promise<string> {
    return this.createEntry(repo, options);
  }

  public async updatePage(
    options: IUpdateOptions,
    where: (keyof IUpdateOptions)[],
    repo = this.repository,
  ): Promise<boolean> {
    const [w, o] = this.useSkipOmit(options, where);
    return this.updateEntry(repo, w, o);
  }
}
