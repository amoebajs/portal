import { Provider, Module } from "@nestjs/common";
import { ModuleMetadata } from "@nestjs/common/interfaces";

export interface IConstructor<T> {
  new (...args: any[]): T;
  prototype: T;
}

export interface IAbstractType<T> {
  prototype: T;
}

export type InjectToken<T> = IConstructor<T> | IAbstractType<T>;

export function useProviders(providers: Provider<any>[]): any[] {
  return providers;
}

export function useExports(providers: Provider<any>[], more: any[] = []): any[] {
  return [].concat(...providers.map(i => ("provide" in i ? i.provide : i))).concat(...more);
}

export function ProvidersModule(metadata: ModuleMetadata) {
  return Module({
    ...metadata,
    exports: [...metadata.exports, ...useProviders(metadata.providers)],
  });
}
