import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailService } from '../mail/mail.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({ imports: [AuthModule], controllers: [WorkspacesController], providers: [WorkspacesService, MailService] })
export class WorkspacesModule {}
