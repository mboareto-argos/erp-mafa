import { parseCsv, rowsToRecords, stringifyCsv } from './csv';

describe('csv — parse/stringify (RFC 4180 mínimo)', () => {
  it('parseia linhas simples separadas por vírgula', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('lida com campo entre aspas contendo vírgula e aspas escapada', () => {
    const csv = 'name,note\n"Silva, João","Disse ""oi"""';
    expect(parseCsv(csv)).toEqual([
      ['name', 'note'],
      ['Silva, João', 'Disse "oi"'],
    ]);
  });

  it('ignora linhas totalmente vazias', () => {
    expect(parseCsv('a,b\n1,2\n\n3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('stringifyCsv escapa campos com vírgula/aspas/quebra de linha', () => {
    expect(stringifyCsv([['a', 'b,c', 'd"e']])).toBe('a,"b,c","d""e"');
  });

  it('rowsToRecords numera a partir da linha 2 (linha 1 é cabeçalho)', () => {
    const records = rowsToRecords([
      ['name', 'email'],
      ['Ana', 'ana@example.com'],
      ['Beto', ''],
    ]);
    expect(records).toEqual([
      { rowNumber: 2, cells: { name: 'Ana', email: 'ana@example.com' } },
      { rowNumber: 3, cells: { name: 'Beto', email: '' } },
    ]);
  });

  it('rowsToRecords devolve vazio para CSV sem cabeçalho', () => {
    expect(rowsToRecords([])).toEqual([]);
  });
});
