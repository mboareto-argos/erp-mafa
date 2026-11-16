import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductPhotoEditor } from './product-photo-editor';

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/components/ui/toaster', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));
const resized = new Blob(['jpg'], { type: 'image/jpeg' });
vi.mock('@/lib/image-resize', () => ({
  resizeImage: vi.fn(async () => resized),
}));

afterEach(() => vi.unstubAllGlobals());

describe('ProductPhotoEditor', () => {
  it('reduz a foto e envia para a rota do produto; mostra a foto salva', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ imageUrl: '/uploads/x/foto.jpg' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(
      <ProductPhotoEditor
        productId="p1"
        productName="Yara"
        imageUrl={null}
        canManage
      />,
    );
    const input = container.querySelector(
      'input[type=file]',
    ) as HTMLInputElement;
    await userEvent.upload(
      input,
      new File(['raw'], 'IMG_0001.HEIC', { type: 'image/jpeg' }),
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/catalog/products/p1/image');
    expect(init.method).toBe('POST');
    expect((init.body as FormData).get('file')).toBeInstanceOf(Blob);
    expect(
      await screen.findByRole('img', { name: 'Foto de Yara' }),
    ).toHaveAttribute('src', '/uploads/x/foto.jpg');
    expect(
      screen.getByRole('button', { name: /Trocar foto/ }),
    ).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
  });

  it('remove a foto (DELETE)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ imageUrl: null }) });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <ProductPhotoEditor
        productId="p1"
        productName="Yara"
        imageUrl="/uploads/x/foto.jpg"
        canManage
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remover foto' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/catalog/products/p1/image', {
      method: 'DELETE',
    });
    expect(screen.queryByRole('img', { name: 'Foto de Yara' })).toBeNull();
  });

  it('sem permissão de catálogo, só mostra a foto (DS-PERM-001)', () => {
    render(
      <ProductPhotoEditor
        productId="p1"
        productName="Yara"
        imageUrl="/uploads/x/foto.jpg"
        canManage={false}
      />,
    );
    expect(
      screen.getByRole('img', { name: 'Foto de Yara' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
