/* eslint-disable @typescript-eslint/no-unused-vars */

import { QueryResultCache } from "typeorm/cache/QueryResultCache";
import { QueryResultCacheOptions } from "typeorm/cache/QueryResultCacheOptions";

export class MemoryQueryCache implements QueryResultCache {
  private idCache: Map<string, Record<string, QueryResultCacheOptions>> = new Map();
  private queryCache: Map<string, QueryResultCacheOptions> = new Map();

  async connect(): Promise<void> {
    // Do Nothing
  }

  async disconnect(): Promise<void> {
    this.clear();
  }

  async synchronize(): Promise<void> {
    // Do Nothing
  }

  async getFromCache(options: QueryResultCacheOptions): Promise<QueryResultCacheOptions> {
    if (options.identifier === void 0) {
      const data = this._getIdCacheContainer(options);
      return data[options.query];
    }
    return this.queryCache.get(options.query);
  }

  async storeInCache(options: QueryResultCacheOptions, savedCache: QueryResultCacheOptions): Promise<void> {
    if (options.identifier === void 0) {
      const data = this._getIdCacheContainer(options);
      data[options.query] = options;
      this.idCache.set(options.identifier, data);
    } else {
      this.queryCache.set(options.query, options);
    }
  }

  isExpired(savedCache: QueryResultCacheOptions): boolean {
    const { time, duration } = savedCache;
    const expires = time + duration;
    return new Date().getTime() > expires;
  }

  async clear(): Promise<void> {
    this.idCache = new Map();
    this.queryCache = new Map();
  }

  async remove(identifiers: string[]): Promise<void> {
    for (const id of identifiers) {
      this.idCache.delete(id);
    }
  }

  private _getIdCacheContainer(options: QueryResultCacheOptions) {
    let data = this.idCache.get(options.identifier);
    if (!data) this.idCache.set(options.identifier, (data = {}));
    return data;
  }
}
