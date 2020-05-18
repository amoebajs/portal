import { ExceptionFilter, SetMetadata, UseFilters, UseGuards } from "@nestjs/common";
import { RolesGuard } from "#guards/roles.guard";
import { ForbiddenExceptionFilter } from "#filters/forbidden";
import { IConstructor } from "./base";

export const ROLES_GUARD__ROLES = "RolesGuard::roles";
export const ROLES_GUARD__CLASS_ROLES = "RolesGuard::classRoles";

export interface IRolesOptions<T> {
  roles: T[];
  catch: boolean | IConstructor<ExceptionFilter>;
}

export function SetRoles<T>(...roles: T[]) {
  return SetMetadata(ROLES_GUARD__ROLES, roles);
}

export function UseRolesAuthentication<T = any>(options: Partial<IRolesOptions<T>> = {}) {
  return function auth(target: any) {
    if (options.roles) {
      SetMetadata(ROLES_GUARD__CLASS_ROLES, options.roles)(target);
    }
    if (options.catch === void 0) {
      options.catch = true;
    }
    if (typeof options.catch === "boolean") {
      options.catch && UseFilters(ForbiddenExceptionFilter)(target);
    } else {
      UseFilters(options.catch)(target);
    }
    return UseGuards(RolesGuard)(target);
  };
}
