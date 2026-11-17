import { Controller, Get, Param } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';

// Única rota sem login do sistema (BR §10.10, regra 26): o recibo da venda
// pelo token secreto do link. Sem JwtAuthGuard de propósito; só lê os campos
// do recibo (ver ReceiptsService.publicReceipt).
@Controller('public/receipts')
export class PublicReceiptsController {
  constructor(private readonly receipts: ReceiptsService) {}

  @Get(':token')
  get(@Param('token') token: string) {
    return this.receipts.publicReceipt(token);
  }
}
