import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthedRequest } from '../auth/auth.types';
import { parse } from '../common/validation';
import { ProjectsService } from './projects.service';

// Dates are calendar days. Keeping them at UTC midnight stops time zones from moving a deadline.
const day = z.string().date().transform(value => new Date(`${value}T00:00:00.000Z`));
const version = z.number().int().positive();
const projectFields = {
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000),
  ownerId: z.string().uuid().nullable(),
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
  startAt: day.nullable(),
  targetAt: day.nullable(),
};
const projectCreate = z.object(projectFields).partial().required({ name: true }).strict();
const projectUpdate = z.object(projectFields).partial().extend({ version }).strict();
const taskFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000),
  assigneeId: z.string().uuid().nullable(),
  dueAt: day.nullable(),
};
const taskCreate = z.object(taskFields).partial().required({ title: true }).strict();
const taskUpdate = z.object(taskFields).partial().extend({ version }).strict();
const deleteQuery = z.object({ version: z.coerce.number().int().positive() }).strict();

@Controller('api/v1/workspaces/:workspaceId')
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly service: ProjectsService) {}

  @Get('projects') listProjects(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string) { return this.service.listProjects(req.user, id); }
  @Post('projects') createProject(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Body() body: unknown) { return this.service.createProject(req.user, id, parse(projectCreate, body)); }
  @Get('projects/:projectId') getProject(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('projectId', ParseUUIDPipe) projectId: string) { return this.service.getProject(req.user, id, projectId); }
  @Patch('projects/:projectId') updateProject(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() body: unknown) { return this.service.updateProject(req.user, id, projectId, parse(projectUpdate, body)); }
  @Get('projects/:projectId/tasks') listTasks(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('projectId', ParseUUIDPipe) projectId: string) { return this.service.listTasks(req.user, id, projectId); }
  @Post('projects/:projectId/tasks') createTask(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() body: unknown) { return this.service.createTask(req.user, id, projectId, parse(taskCreate, body)); }
  @Get('my-tasks') myTasks(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string) { return this.service.myTasks(req.user, id); }
  @Get('tasks/:taskId') getTask(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('taskId', ParseUUIDPipe) taskId: string) { return this.service.getTask(req.user, id, taskId); }
  @Patch('tasks/:taskId') updateTask(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('taskId', ParseUUIDPipe) taskId: string, @Body() body: unknown) { return this.service.updateTask(req.user, id, taskId, parse(taskUpdate, body)); }
  @Delete('tasks/:taskId') deleteTask(@Req() req: AuthedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('taskId', ParseUUIDPipe) taskId: string, @Query() query: unknown) { return this.service.deleteTask(req.user, id, taskId, parse(deleteQuery, query).version); }
}
