// Reduz a foto no próprio celular antes de enviar: lado maior até 1600 px,
// JPEG ~82%. Foto de celular tem 3–12 MB; vira ~200–400 KB — envio rápido no
// 4G, abaixo do limite das funções do Vercel e barato de armazenar.
// createImageBitmap com imageOrientation respeita a rotação (EXIF) do iPhone.

export const MAX_SIDE = 1600;

export function fitWithin(width: number, height: number, maxSide = MAX_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

export async function resizeImage(
  file: File,
  maxSide = MAX_SIDE,
  quality = 0.82,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context)
    throw new Error('Não foi possível processar a foto neste navegador.');
  context.fillStyle = '#ffffff'; // PNG transparente vira fundo branco no JPEG
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('Não foi possível processar a foto.')),
      'image/jpeg',
      quality,
    ),
  );
}
