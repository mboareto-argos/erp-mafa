// Payload do access token — unica fonte confiavel de company_id numa
// requisicao autenticada (TA-TENANT-002). Emitido so depois de validar o
// Membership em /auth/select-company, nunca a partir de parametro cru.
export interface AccessTokenPayload {
  type: 'access';
  sub: string; // userId
  companyId: string;
  roleName: string;
  permissions: string[];
}

export interface CurrentTenantContext {
  userId: string;
  companyId: string;
  roleName: string;
  permissions: string[];
}

// Shape do request depois do JwtAuthGuard/JwtStrategy popularem request.user.
export interface RequestWithTenant {
  user: CurrentTenantContext;
}
