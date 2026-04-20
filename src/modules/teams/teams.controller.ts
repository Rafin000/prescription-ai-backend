import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';
import { Roles } from 'src/decorators/roles.decorator';
import { ROLES } from 'src/base/base.constants';
import {
  TeamMemberWithUser,
  TeamsRepository,
} from './teams.repository';

class UpdateRoleDto {
  @IsString() @Length(2, 60)
  role!: string;
}

@Controller('team')
export class TeamsController {
  constructor(private readonly repo: TeamsRepository) {}

  @Get()
  async getCurrent(@CurrentUser() u: AuthedUser) {
    const team = await this.repo.findTeam(u.teamId);
    if (!team) throw new NotFoundException('Team not found');
    // Find the owner member so we can expose ownerId.
    const members = await this.repo.listMembers(u.teamId);
    const owner = members.find((m) => m.is_owner);
    return {
      id: team.id,
      name: team.data?.name ?? 'Your clinic',
      ownerId: owner?.user_id ?? '',
      createdAt: team.created_at.toISOString(),
    };
  }

  @Get('members')
  async listMembers(@CurrentUser() u: AuthedUser) {
    const rows = await this.repo.listMembers(u.teamId);
    return rows.map(toMemberResource);
  }

  @Patch('members/:userId')
  @Roles(ROLES.OWNER)
  async updateRole(
    @CurrentUser() u: AuthedUser,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const target = await this.repo.findMemberByUserId(u.teamId, userId);
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === ROLES.OWNER) {
      throw new ForbiddenException('The workspace admin cannot be demoted');
    }
    if (dto.role === ROLES.OWNER) {
      throw new ForbiddenException('Cannot promote to admin');
    }
    await this.repo.updateMemberRole(u.teamId, userId, dto.role);
    const all = await this.repo.listMembers(u.teamId);
    const updated = all.find((m) => m.user_id === userId);
    return toMemberResource(updated!);
  }

  @Delete('members/:userId')
  @HttpCode(204)
  @Roles(ROLES.OWNER)
  async remove(
    @CurrentUser() u: AuthedUser,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    const target = await this.repo.findMemberByUserId(u.teamId, userId);
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === ROLES.OWNER) {
      throw new ForbiddenException('The workspace admin cannot be removed');
    }
    if (target.user_id === u.userId) {
      throw new ForbiddenException('You cannot remove yourself');
    }
    await this.repo.disableMember(u.teamId, userId);
  }
}

function toMemberResource(m: TeamMemberWithUser) {
  return {
    id: m.id,
    teamId: m.team_id,
    userId: m.user_id,
    name: m.name ?? '',
    email: m.email ?? '',
    phone: m.phone ?? undefined,
    avatarUrl: m.avatar_url ?? undefined,
    role: m.role,
    status: m.status === 'disabled' ? 'suspended' : 'active',
    joinedAt: m.created_at.toISOString(),
    isOwner: m.is_owner,
  };
}
