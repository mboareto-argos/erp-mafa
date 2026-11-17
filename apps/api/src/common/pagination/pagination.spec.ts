import { parsePage, skipTake } from './pagination';

describe('parsePage', () => {
  it('sem page devolve null (listagem completa, retrocompatível)', () => {
    expect(parsePage()).toBeNull();
    expect(parsePage('')).toBeNull();
  });

  it('normaliza página e tamanho, com teto de 100', () => {
    expect(parsePage('2')).toEqual({ page: 2, pageSize: 20 });
    expect(parsePage('0', '500')).toEqual({ page: 1, pageSize: 100 });
    expect(parsePage('abc', '-3')).toEqual({ page: 1, pageSize: 1 });
    expect(skipTake({ page: 3, pageSize: 20 })).toEqual({ skip: 40, take: 20 });
  });
});
