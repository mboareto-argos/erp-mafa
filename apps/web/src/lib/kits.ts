import { toCents } from '@/lib/money';

// Kit como a API devolve em GET /kits/:productId (BR §10.3, regras 11 a 13).
export type KitMode = 'assembled' | 'on_demand';

export type KitPiece = {
  productVariantId: string;
  productId: string;
  name: string;
  sku: string;
  quantity: string;
  unitCost: string;
  salePrice: string;
  available: string;
};

export type KitDetail = {
  productId: string;
  mode: KitMode | null;
  components: KitPiece[];
  kitSalePrice: string;
  kitStock: string;
  kitUnitCost: string;
  piecesCost: string;
  piecesPrice: string;
  savings: string;
  canAssemble: number;
};

export const KIT_MODE_LABEL: Record<KitMode, string> = {
  assembled: 'Montado antes',
  on_demand: 'Montado na hora',
};

export const KIT_MODE_HINT: Record<KitMode, string> = {
  assembled:
    'Você monta os kits com antecedência: as peças saem do estoque na montagem e o kit tem estoque próprio.',
  on_demand:
    'Você monta na hora da venda: o kit não tem estoque próprio e a venda baixa as peças.',
};

/** Linha do editor de composição. */
export type DraftPiece = {
  productVariantId: string;
  name: string;
  quantity: number;
  salePriceCents: number;
  available: number;
};

/**
 * Prévia do editor: quanto as peças custariam avulsas e quanto o cliente
 * economiza com o preço do kit (regra 11). Em centavos.
 */
export function kitPreview(pieces: DraftPiece[], kitPriceCents: number) {
  const separate = pieces.reduce(
    (sum, piece) => sum + piece.salePriceCents * piece.quantity,
    0,
  );
  const canAssemble =
    pieces.length === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            ...pieces.map((piece) =>
              Math.floor(piece.available / piece.quantity),
            ),
          ),
        );
  return {
    separate,
    savings: Math.max(0, separate - kitPriceCents),
    canAssemble,
  };
}

export function piecesFromDetail(detail: KitDetail): DraftPiece[] {
  return detail.components.map((piece) => ({
    productVariantId: piece.productVariantId,
    name: piece.name,
    quantity: Number(piece.quantity),
    salePriceCents: toCents(piece.salePrice),
    available: Number(piece.available),
  }));
}
