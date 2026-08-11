import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { UsersService } from './users.service';
import {
  acceptInvitationSchema,
  type AcceptInvitationDto,
} from './dto/accept-invitation.schema';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly users: UsersService) {}

  @Get(':token')
  get(@Param('token') token: string) {
    return this.users.invitation(token);
  }

  @Post(':token/accept')
  accept(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(acceptInvitationSchema))
    dto: AcceptInvitationDto,
  ) {
    return this.users.acceptInvitation(token, dto);
  }
}
