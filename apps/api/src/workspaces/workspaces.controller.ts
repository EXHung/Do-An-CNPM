import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthedRequest } from '../auth/auth.types';
import { WorkspacesService } from './workspaces.service';

const roles = z.enum(['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER']);
const workspaceCreate = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().min(3).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(1000).optional(),
}).strict();
const workspaceUpdate = z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().max(1000), version: z.number().int().positive() }).strict();
const invitationCreate = z.object({ email: z.string().trim().toLowerCase().email().max(254), role: roles }).strict();
const invitationAccept = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
const roleUpdate = z.object({ role: roles }).strict();

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new BadRequestException({ message: 'Dữ liệu không hợp lệ.', details: result.error.flatten() });
  return result.data;
}

@Controller('api/v1')
@UseGuards(AuthGuard)
export class WorkspacesController {
  constructor(@Inject(WorkspacesService) private readonly service: WorkspacesService) {}

  @Get('workspaces') list(@Req() req: AuthedRequest) { return this.service.list(req.user); }
  @Post('workspaces') create(@Req() req: AuthedRequest, @Body() body: unknown) { return this.service.create(req.user, parse(workspaceCreate, body)); }
  @Get('workspaces/:workspaceId') get(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string) { return this.service.get(req.user, id); }
  @Patch('workspaces/:workspaceId') update(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Body() body: unknown) { return this.service.update(req.user, id, parse(workspaceUpdate, body)); }
  @Get('workspaces/:workspaceId/members') members(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string) { return this.service.members(req.user, id); }
  @Get('workspaces/:workspaceId/invitations') invitations(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string) { return this.service.invitations(req.user, id); }
  @Post('workspaces/:workspaceId/invitations') invite(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Body() body: unknown) { return this.service.invite(req.user, id, parse(invitationCreate, body)); }
  @Post('invitations/accept') accept(@Req() req: AuthedRequest, @Body() body: unknown) { return this.service.accept(req.user, parse(invitationAccept, body).token); }
  @Patch('workspaces/:workspaceId/members/:memberId') changeRole(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('memberId', ParseUUIDPipe) memberId: string, @Body() body: unknown) { return this.service.changeRole(req.user, id, memberId, parse(roleUpdate, body).role); }
  @Delete('workspaces/:workspaceId/members/:memberId') remove(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('memberId', ParseUUIDPipe) memberId: string) { return this.service.remove(req.user, id, memberId); }
  @Delete('workspaces/:workspaceId/invitations/:invitationId') revoke(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('invitationId', ParseUUIDPipe) invitationId: string) { return this.service.revoke(req.user, id, invitationId); }
  @Get('workspaces/:workspaceId/audit') audit(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string) { return this.service.audit(req.user, id); }
}
