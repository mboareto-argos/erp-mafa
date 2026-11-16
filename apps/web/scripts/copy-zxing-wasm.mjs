// Copia o decodificador de código de barras (WebAssembly do zxing, usado no
// iPhone, que não tem leitor nativo no navegador) para public/, para o app
// servir o arquivo ele mesmo em vez de baixar de um CDN externo.
// Roda antes de `dev` e `build` (ver package.json).
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// zxing-wasm é dependência do barcode-detector: resolve a partir dele.
const require = createRequire(import.meta.url);
const detectorEntry = require.resolve('barcode-detector/ponyfill');
const source = createRequire(detectorEntry).resolve(
  'zxing-wasm/reader/zxing_reader.wasm',
);
const targetDir = join(here, '..', 'public', 'vendor', 'zxing');
mkdirSync(targetDir, { recursive: true });
copyFileSync(source, join(targetDir, 'zxing_reader.wasm'));
console.log('zxing_reader.wasm copiado para public/vendor/zxing');
