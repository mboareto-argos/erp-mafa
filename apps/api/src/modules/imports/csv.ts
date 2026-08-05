// Parser CSV mínimo (RFC 4180): aspas para campos com vírgula/quebra de
// linha, "" como aspas escapada. Evita dependência externa para um formato
// determinístico e fixo (BR §10.19 — cabeçalho fixo por modelo baixável,
// sem UI de mapeamento livre nesta rodada).
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => !(cells.length === 1 && cells[0] === ''));
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function stringifyCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\n');
}

// Converte as linhas cruas (com cabeçalho na primeira posição) em objetos
// `{coluna: valor}`, um por linha de dados — pronto para cada importer
// validar os campos que interessa.
export function rowsToRecords(
  rows: string[][],
): { rowNumber: number; cells: Record<string, string> }[] {
  const [header, ...dataRows] = rows;
  if (!header) return [];
  return dataRows.map((cells, index) => ({
    rowNumber: index + 2, // linha 1 é o cabeçalho
    cells: Object.fromEntries(
      header.map((column, columnIndex) => [
        column.trim(),
        (cells[columnIndex] ?? '').trim(),
      ]),
    ),
  }));
}
