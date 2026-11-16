#!/usr/bin/env node
// Popula o ambiente LOCAL com dados de demonstração da MAFA Store, usando a
// própria API (mesmas regras de negócio do uso real: estoque nasce de
// compra recebida, custo é calculado, venda confirma pagamento).
//
//   docker compose exec app node scripts/dev/seed-demo.mjs
//
// Nunca rodar contra produção. O script se recusa a usar uma API que não
// esteja em localhost.
//
// Credenciais de teste do ambiente local (fictícias, só existem no banco
// local criado por este script):
export const DEMO_LOGIN = {
  name: 'Dona MAFA (teste)',
  email: 'demo@mafa.local',
  password: 'mafa-demo-2026',
  companyName: 'MAFA Store (local)',
};

const API = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(API)) {
  console.error(`Recusado: API_BASE_URL não é local (${API}).`);
  process.exit(1);
}

let token = '';
async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const isoDate = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

async function main() {
  try {
    await call('POST', '/auth/login', {
      email: DEMO_LOGIN.email,
      password: DEMO_LOGIN.password,
    });
    console.log('Dados de demonstração já existem — nada a fazer.');
    console.log('Para recomeçar do zero: docker compose down -v && docker compose up');
    return;
  } catch (error) {
    if (error.status !== 401 && error.status !== 400 && error.status !== 404) throw error;
  }

  const session = await call('POST', '/auth/register', DEMO_LOGIN);
  token = session.accessToken;
  console.log(`Empresa criada: ${session.company.name}`);

  // Contas e formas de pagamento — reflete o dia a dia presencial
  // (Pix, maquininha, dinheiro) e o fiado (venda a prazo).
  const caixa = await call('POST', '/financial-accounts', { name: 'Caixa da loja' });
  const banco = await call('POST', '/financial-accounts', { name: 'Conta PJ' });
  const pix = await call('POST', '/payments/methods', {
    type: 'pix', name: 'Pix', financialAccountId: banco.id,
  });
  const credito = await call('POST', '/payments/methods', {
    type: 'credit_card', name: 'Crédito (maquininha)', feeRate: 0.0349, financialAccountId: banco.id,
  });
  await call('POST', '/payments/methods', {
    type: 'debit_card', name: 'Débito (maquininha)', feeRate: 0.0137, financialAccountId: banco.id,
  });
  const dinheiro = await call('POST', '/payments/methods', {
    type: 'cash', name: 'Dinheiro', financialAccountId: caixa.id,
  });

  // Catálogo
  const cat = {};
  for (const name of ['Perfume árabe', 'Body splash', 'Hidratante', 'Perfume importado']) {
    cat[name] = (await call('POST', '/catalog/categories', { name })).id;
  }
  const brand = {};
  for (const name of ['Lattafa', 'Al Haramain', 'Armaf', 'Bath & Body Works', "Victoria's Secret"]) {
    brand[name] = (await call('POST', '/catalog/brands', { name })).id;
  }

  const catalog = [
    // [sku, nome, categoria, marca, preço de venda, custo unitário, qtd comprada, estoque mínimo]
    ['LAT-KHAMRAH-100', 'Khamrah EDP 100 ml', 'Perfume árabe', 'Lattafa', 289.9, 145, 6, 2],
    ['LAT-YARA-100', 'Yara EDP 100 ml', 'Perfume árabe', 'Lattafa', 249.9, 120, 8, 3],
    ['LAT-ASAD-100', 'Asad EDP 100 ml', 'Perfume árabe', 'Lattafa', 259.9, 125, 5, 2],
    ['ALH-AMBER-100', 'Amber Oud Gold Edition 120 ml', 'Perfume árabe', 'Al Haramain', 459.9, 260, 3, 1],
    ['ARM-CDNIM-105', 'Club de Nuit Intense Man 105 ml', 'Perfume árabe', 'Armaf', 319.9, 170, 4, 2],
    ['BBW-JPS-236', 'Body splash Japanese Cherry Blossom 236 ml', 'Body splash', 'Bath & Body Works', 139.9, 62, 10, 3],
    ['BBW-ATS-236', 'Body splash A Thousand Wishes 236 ml', 'Body splash', 'Bath & Body Works', 139.9, 62, 2, 3],
    ['BBW-JPS-HID', 'Hidratante Japanese Cherry Blossom 226 g', 'Hidratante', 'Bath & Body Works', 119.9, 51, 6, 2],
    ['VS-BOMB-250', 'Body splash Bombshell 250 ml', 'Body splash', "Victoria's Secret", 159.9, 70, 7, 2],
    ['VS-PURE-250', 'Body splash Pure Seduction 250 ml', 'Body splash', "Victoria's Secret", 149.9, 66, 0, 2],
  ];

  const supplier = await call('POST', '/purchasing/suppliers', {
    name: 'Importadora Oriente (teste)', contactName: 'Samir', whatsapp: '11999990000',
  });
  await call('POST', '/purchasing/suppliers', { name: 'Revenda Orlando (teste)' });

  const variants = {};
  const purchaseItems = [];
  for (const [sku, name, category, brandName, salePrice, cost, qty, minStock] of catalog) {
    const product = await call('POST', '/catalog/products', {
      sku, name, unit: 'un', categoryId: cat[category], brandId: brand[brandName], salePrice, minStock,
    });
    variants[sku] = { id: product.variants[0].id, price: salePrice };
    if (qty > 0) purchaseItems.push({ sku, productVariantId: product.variants[0].id, quantity: qty, unitCostOriginCurrency: cost });
  }
  console.log(`${catalog.length} produtos cadastrados`);

  // Uma compra recebida (forma o estoque e o custo médio) …
  const purchase = await call('POST', '/purchasing/purchases', {
    supplierId: supplier.id,
    items: purchaseItems.map(({ sku, ...item }) => item),
  });
  await call('POST', `/purchasing/purchases/${purchase.id}/order`);
  await call('POST', `/purchasing/purchases/${purchase.id}/receive`, {
    items: purchase.items.map((item) => ({ purchaseItemId: item.id, quantityReceived: Number(item.quantity) })),
    additionalCosts: [{ type: 'freight', amount: 180 }],
  });
  // … e outra ainda em trânsito (pedida, não recebida).
  const transit = await call('POST', '/purchasing/purchases', {
    supplierId: supplier.id,
    items: [{ productVariantId: variants['VS-PURE-250'].id, quantity: 6, unitCostOriginCurrency: 66 }],
  });
  await call('POST', `/purchasing/purchases/${transit.id}/order`);
  console.log('Compras: 1 recebida, 1 em trânsito');

  // Clientes
  const clientes = {};
  for (const name of ['Ana Paula', 'Juliana Costa', 'Marcos Lima', 'Fernanda Rocha']) {
    clientes[name] = (await call('POST', '/customers', { name })).id;
  }

  // Vendas: à vista (Pix, cartão, dinheiro) e fiado parcelado.
  const sell = async ({ customer, items, payments = [], installmentPlan }) => {
    const sale = await call('POST', '/sales', {
      channel: 'presencial',
      ...(customer ? { customerId: clientes[customer] } : {}),
      items: items.map(([sku, quantity]) => ({
        productVariantId: variants[sku].id, quantity, unitPrice: variants[sku].price,
      })),
    });
    await call('POST', `/sales/${sale.id}/confirm`, {
      payments: payments.map(([method, amount]) => ({ paymentMethodId: method.id, amount: amount ?? Number(sale.total) })),
      ...(installmentPlan ? { installmentPlan } : {}),
    });
    return sale;
  };
  await sell({ customer: 'Ana Paula', items: [['LAT-YARA-100', 1]], payments: [[pix]] });
  await sell({ items: [['BBW-JPS-236', 2]], payments: [[dinheiro]] });
  await sell({ customer: 'Marcos Lima', items: [['ARM-CDNIM-105', 1]], payments: [[credito]] });
  await sell({ customer: 'Juliana Costa', items: [['LAT-KHAMRAH-100', 1], ['BBW-JPS-HID', 1]], installmentPlan: { count: 3, firstDueDate: isoDate(-5) } });
  await sell({ customer: 'Fernanda Rocha', items: [['VS-BOMB-250', 1]], installmentPlan: { count: 2, firstDueDate: isoDate(10) } });
  console.log('Vendas: 3 à vista, 2 no fiado (uma com parcela vencida)');

  // Uma despesa paga e uma conta a pagar futura.
  await call('POST', '/expenses', {
    description: 'Sacolas e embalagens', amount: 85, category: 'embalagem',
    competenceDate: isoDate(-2), paidNow: true, financialAccountId: caixa.id,
  });
  await call('POST', '/expenses', {
    description: 'Anúncios Instagram', amount: 150, category: 'publicidade',
    competenceDate: isoDate(0), paidNow: false, dueDate: isoDate(12),
  });
  console.log('Despesas: 1 paga, 1 a pagar');

  console.log('\nPronto! Acesse http://localhost:3000/entrar');
  console.log('Login de teste: veja DEMO_LOGIN em scripts/dev/seed-demo.mjs');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
