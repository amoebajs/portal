import { BaseMysqlService } from "./base.service";
import { IListQueryResult, IVersionListQueryOptions, IVersionQueryOptions } from "#global/services/worker.service";
import { PageVersion } from "#database/entity/page-version.entity";

export interface ICreateOptions {
  name?: string;
  pageId?: string | number;
  data?: string;
  creator: string;
}

export interface IUpdateOptions extends Partial<Omit<ICreateOptions, "creator">> {
  id: number | string;
  dist?: string;
}

export class VersionService extends BaseMysqlService {
  protected get repository() {
    return this.connection.getRepository(PageVersion);
  }

  public async queryVersionList(
    options: IVersionListQueryOptions,
    repo = this.repository,
  ): Promise<IListQueryResult<PageVersion>> {
    return this.invokeListQuery(repo, options);
  }

  public async queryVersion(options: IVersionQueryOptions, repo = this.repository): Promise<PageVersion> {
    const queries: Partial<PageVersion> = {};
    if (options.id !== void 0) queries.id = options.id;
    if (options.name !== void 0) queries.name = options.name;
    return this.queryEntry(repo, queries);
  }

  public async createVersion(options: ICreateOptions, repo = this.repository): Promise<string> {
    return this.createEntry(repo, options);
  }

  public async updateVersion(
    options: IUpdateOptions,
    where: (keyof IUpdateOptions)[],
    repo = this.repository,
  ): Promise<boolean> {
    const [w, o] = this.useSkipOmit(options, where);
    return this.updateEntry(repo, w, o);
  }
}
