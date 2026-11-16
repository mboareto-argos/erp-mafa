import { describe, expect, it } from 'vitest';
import { computeInstallState, isIOS } from './install-prompt';

describe('estado da instalação do app', () => {
  it('já instalado (aberto pelo ícone) não oferece instalar', () => {
    expect(
      computeInstallState({
        standalone: true,
        installedNow: false,
        hasPrompt: true,
        ios: false,
      }),
    ).toEqual({
      installed: true,
      platform: 'none',
    });
  });

  it('Android/Chrome com pedido disponível usa o pedido nativo; iPhone usa o passo a passo', () => {
    expect(
      computeInstallState({
        standalone: false,
        installedNow: false,
        hasPrompt: true,
        ios: false,
      }).platform,
    ).toBe('prompt');
    expect(
      computeInstallState({
        standalone: false,
        installedNow: false,
        hasPrompt: false,
        ios: true,
      }).platform,
    ).toBe('ios');
    expect(
      computeInstallState({
        standalone: false,
        installedNow: false,
        hasPrompt: false,
        ios: false,
      }).platform,
    ).toBe('none');
  });

  it('reconhece iPhone e iPad (inclusive iPad que se diz Mac)', () => {
    expect(
      isIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5),
    ).toBe(true);
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(
      true,
    );
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(
      false,
    );
    expect(isIOS('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5)).toBe(false);
  });
});
