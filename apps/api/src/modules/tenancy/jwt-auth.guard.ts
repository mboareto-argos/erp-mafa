import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard padrao de qualquer endpoint autenticado. Resolve company_id/roleName/
// permissions em request.user via JwtStrategy — TA-SEC-001/TA-TENANT-002.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
