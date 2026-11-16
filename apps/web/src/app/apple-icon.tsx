import { appIconImage } from '@/lib/app-icon-image';

// Ícone da Tela de Início do iPhone ("Adicionar à Tela de Início"). O iOS
// arredonda sozinho, então vai quadrado.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return appIconImage(180, { rounded: false });
}
