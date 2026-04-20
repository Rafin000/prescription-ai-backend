import { SetMetadata } from '@nestjs/common';
import { Role } from 'src/base/base.constants';

export const ROLES_KEY = 'roles';

/** Restrict a route to one or more roles. Works alongside the global JwtGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
