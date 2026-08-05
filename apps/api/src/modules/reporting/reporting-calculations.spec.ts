import {
  calculateAverageTicket,
  calculatePercentChange,
  calculateMargin,
  calculateDre,
} from './reporting-calculations';

describe('calculateMargin (RN 11.8)', () => {
  it('calcula a margem percentual', () => {
    expect(calculateMargin(150, 300)?.toString()).toBe('50');
  });

  it('nunca gera erro matemático quando a receita líquida é zero', () => {
    expect(calculateMargin(0, 0)).toBeNull();
  });
});

describe('calculateAverageTicket (RN 11.9)', () => {
  it('divide a receita líquida pela quantidade de vendas', () => {
    expect(calculateAverageTicket(1000, 5)?.toString()).toBe('200');
  });

  it('nunca gera erro matemático quando não há vendas no período', () => {
    expect(calculateAverageTicket(0, 0)).toBeNull();
  });
});

describe('calculatePercentChange (RN 10.17)', () => {
  it('calcula a variação percentual entre dois períodos', () => {
    expect(calculatePercentChange(150, 100)?.toString()).toBe('50');
    expect(calculatePercentChange(50, 100)?.toString()).toBe('-50');
  });

  it('nunca gera erro matemático quando o período anterior é zero', () => {
    expect(calculatePercentChange(100, 0)).toBeNull();
  });
});

describe('calculateDre (RN 11.5/11.6/11.7)', () => {
  it('monta a DRE gerencial simplificada com os números esperados', () => {
    const dre = calculateDre({
      grossRevenue: 1000,
      discountsAndReturns: 100,
      cmv: 400,
      paymentFees: 20,
      expenses: 150,
    });

    expect(dre.netRevenue.toString()).toBe('900');
    expect(dre.grossProfit.toString()).toBe('500');
    expect(dre.netProfit.toString()).toBe('330');
  });
});
