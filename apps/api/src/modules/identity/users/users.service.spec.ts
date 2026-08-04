import { UsersService } from './users.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('UsersService — hash de senha', () => {
  // hashPassword/verifyPassword não tocam o banco — PrismaService pode ser
  // um stub aqui.
  const service = new UsersService({} as PrismaService);

  it('nunca guarda a senha em formato reversível (RN 10.1.7) — hash é diferente do texto original', async () => {
    const hash = await service.hashPassword('minha-senha-123');
    expect(hash).not.toBe('minha-senha-123');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('verifica a senha correta e rejeita a incorreta', async () => {
    const hash = await service.hashPassword('minha-senha-123');
    await expect(service.verifyPassword(hash, 'minha-senha-123')).resolves.toBe(
      true,
    );
    await expect(service.verifyPassword(hash, 'senha-errada')).resolves.toBe(
      false,
    );
  });
});
