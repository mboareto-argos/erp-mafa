# Documento de Negócio — ERP Simplificado para Pequenos Vendedores

**Nome provisório do produto:** a definir  
**Projeto-piloto:** MAFA Store  
**Versão do documento:** 1.0  
**Data:** 04/08/2026  
**Status:** Planejamento inicial  
**Público-alvo deste documento:** Product Owner, analistas de negócio, UX/UI designers, desenvolvedores, arquitetos, QA, agentes de IA e demais responsáveis pela implementação.

---

## 1. Objetivo deste documento

Este documento descreve a visão de negócio, o escopo funcional, as regras de negócio, os principais fluxos, os requisitos, os critérios de aceite e as premissas do produto.

Ele deve servir como fonte principal de contexto para que um time técnico, humano ou composto por agentes de inteligência artificial, consiga:

1. compreender o problema a ser resolvido;
2. identificar o público-alvo e os objetivos do produto;
3. elaborar a arquitetura da solução;
4. produzir a documentação técnica;
5. modelar o banco de dados;
6. planejar a experiência do usuário;
7. criar um backlog de desenvolvimento;
8. implementar e testar o sistema;
9. evoluir o produto de uma operação individual para uma plataforma multiempresa.

Este documento não define uma arquitetura técnica fechada. Decisões como frameworks, provedores de nuvem, padrões de mensageria, estratégias de cache e serviços de infraestrutura deverão ser registradas posteriormente na documentação técnica.

---

# 2. Resumo executivo

O produto será um ERP simplificado, responsivo e de fácil utilização, voltado inicialmente para pequenos vendedores que realizam o controle de suas operações por meio de planilhas, cadernos, aplicativos de mensagens ou anotações manuais.

A primeira operação atendida será a MAFA Store, loja especializada em perfumes árabes, body splashes, perfumed sprays, cremes, decants, kits e outros produtos importados.

O sistema deverá centralizar e automatizar atividades como:

- cadastro de produtos;
- registro de compras;
- entrada e saída de mercadorias;
- controle de estoque;
- registro de vendas;
- controle de recebimentos;
- contas a pagar;
- registro de despesas;
- fluxo de caixa;
- cálculo de CMV;
- cálculo de lucro bruto;
- cálculo de lucro líquido;
- acompanhamento de indicadores;
- gestão de clientes e fornecedores;
- emissão de relatórios;
- importação e exportação de dados.

A experiência deverá ser simples o suficiente para que uma pessoa sem conhecimento contábil, financeiro ou técnico consiga utilizar o sistema.

O produto deverá começar atendendo a MAFA Store, mas sua fundação de negócio deverá permitir a evolução para um modelo SaaS multiempresa, no qual diferentes lojistas possam utilizar a mesma plataforma mantendo total isolamento de dados.

---

# 3. Contexto do problema

## 3.1 Situação atual

Atualmente, pequenos vendedores costumam utilizar múltiplas planilhas para controlar:

- produtos comprados;
- estoque disponível;
- custo de aquisição;
- preços de venda;
- faturamento;
- vendas;
- despesas;
- fluxo de caixa;
- lucro;
- clientes;
- fornecedores;
- contas futuras;
- taxas de pagamento.

Esse processo apresenta problemas recorrentes:

- necessidade de atualização manual em vários arquivos;
- duplicidade de informações;
- risco de fórmulas incorretas;
- perda de histórico;
- divergência entre estoque físico e estoque registrado;
- dificuldade para calcular o custo real dos produtos;
- dificuldade para visualizar o lucro real;
- ausência de integração entre vendas, estoque e financeiro;
- pouca mobilidade;
- alto risco de erro humano;
- baixa rastreabilidade das alterações;
- dificuldade de uso por pessoas sem familiaridade com planilhas.

## 3.2 Problema central

O lojista precisa registrar a mesma operação em diferentes locais.

Exemplo: ao realizar uma venda, pode ser necessário:

1. reduzir a quantidade na planilha de estoque;
2. registrar a venda em outra planilha;
3. atualizar o faturamento;
4. calcular o CMV;
5. calcular o lucro bruto;
6. registrar a taxa da maquininha;
7. atualizar o fluxo de caixa;
8. registrar o recebimento;
9. atualizar a conta do cliente;
10. revisar os relatórios.

O produto deverá substituir esse processo por uma operação centralizada.

## 3.3 Solução proposta

Uma única ação realizada pelo usuário deverá produzir todos os efeitos relacionados.

Exemplo: ao registrar uma venda, o sistema deverá, conforme as configurações e o status da operação:

- criar o registro da venda;
- criar os itens da venda;
- reservar ou baixar o estoque;
- registrar movimentações de estoque;
- calcular receita bruta;
- calcular descontos;
- calcular receita líquida;
- calcular o CMV;
- calcular o lucro bruto;
- calcular taxas e demais custos variáveis;
- calcular o lucro estimado da venda;
- criar contas a receber;
- registrar recebimentos imediatos;
- atualizar o fluxo de caixa;
- atualizar indicadores;
- manter histórico para auditoria.

---

# 4. Visão do produto

## 4.1 Declaração de visão

Criar a plataforma de gestão mais simples e acessível para pequenos vendedores controlarem estoque, vendas e dinheiro sem depender de planilhas complexas ou conhecimento contábil.

## 4.2 Proposta de valor

O produto deverá permitir que o usuário saiba, de forma rápida e confiável:

- o que possui em estoque;
- quanto investiu em mercadorias;
- quanto vendeu;
- quanto recebeu;
- quanto ainda tem a receber;
- quanto gastou;
- quanto lucrou;
- quais produtos vendem mais;
- quais produtos estão parados;
- quais produtos precisam ser repostos;
- quais compromissos financeiros estão próximos.

## 4.3 Princípios do produto

### Simplicidade

O sistema deve utilizar linguagem cotidiana e evitar termos técnicos sempre que possível.

### Automação

Uma operação deve atualizar automaticamente todas as áreas relacionadas.

### Rastreabilidade

Toda alteração relevante deve possuir histórico.

### Confiabilidade

Cálculos financeiros e movimentações de estoque devem ser consistentes, auditáveis e reproduzíveis.

### Mobilidade

O sistema deve funcionar bem em celulares, tablets e computadores.

### Evolução progressiva

O usuário deve conseguir começar com poucos recursos e adotar funcionalidades mais avançadas conforme sua operação crescer.

### Isolamento de dados

No modelo multiempresa, os dados de uma empresa jamais poderão ser acessados por outra empresa sem autorização explícita.

### Orientação por contexto

As telas devem ajudar o usuário a concluir tarefas, em vez de apenas exibir cadastros e tabelas.

---

# 5. Público-alvo

## 5.1 Público principal

Pequenos vendedores e microempreendedores que:

- vendem produtos físicos;
- possuem estoque próprio ou parcial;
- utilizam planilhas ou cadernos;
- vendem presencialmente, por WhatsApp, Instagram ou outros canais;
- possuem pouca ou nenhuma equipe;
- precisam controlar entradas, saídas, vendas e despesas;
- não desejam utilizar ERPs complexos;
- não possuem conhecimento contábil avançado.

## 5.2 Segmentos iniciais possíveis

- perfumarias;
- lojas de cosméticos;
- vendedores de importados;
- lojas de roupas;
- vendedores de acessórios;
- pequenos comércios;
- vendedores autônomos;
- lojas online de pequeno porte;
- operações baseadas em Instagram e WhatsApp;
- revendedores;
- negócios familiares.

## 5.3 Persona inicial

### Persona: proprietário-operador

**Perfil:** dono de uma pequena loja que também compra, vende, atende clientes, organiza estoque e controla o dinheiro.

**Dores:**

- atualiza várias planilhas;
- não confia totalmente nos números;
- não sabe o lucro real de cada venda;
- perde tempo com tarefas administrativas;
- esquece contas ou recebimentos;
- possui dificuldade para acompanhar o estoque;
- deseja enxergar o negócio pelo celular.

**Objetivos:**

- registrar vendas rapidamente;
- visualizar o lucro;
- saber o que precisa comprar;
- diminuir erros;
- acompanhar o caixa;
- centralizar informações;
- crescer sem perder o controle.

---

# 6. Objetivos de negócio

## 6.1 Objetivos da primeira fase

- substituir as principais planilhas da MAFA Store;
- reduzir retrabalho administrativo;
- automatizar cálculos de estoque e rentabilidade;
- oferecer uma visão consolidada da operação;
- validar os fluxos com uma empresa real;
- formar uma base funcional reutilizável;
- identificar necessidades comuns a outros pequenos vendedores.

## 6.2 Objetivos de médio prazo

- transformar a solução em produto SaaS;
- permitir cadastro de múltiplas empresas;
- criar planos de assinatura;
- oferecer recursos opcionais conforme o plano;
- suportar múltiplos usuários por empresa;
- disponibilizar importação facilitada de planilhas;
- oferecer relatórios e alertas acionáveis;
- criar um processo de onboarding autoguiado.

## 6.3 Objetivos de longo prazo

- integrar canais de venda;
- integrar meios de pagamento;
- integrar marketplaces;
- oferecer catálogo online;
- automatizar conciliação financeira;
- oferecer previsões de estoque e vendas;
- sugerir reposições;
- sugerir preços;
- permitir automações com inteligência artificial;
- tornar-se uma plataforma operacional para pequenos vendedores.

---

# 7. Escopo do produto

## 7.1 Escopo funcional consolidado

O produto poderá abranger os seguintes domínios:

1. acesso e autenticação;
2. empresas;
3. usuários e permissões;
4. produtos;
5. categorias;
6. marcas;
7. unidades e variações;
8. fornecedores;
9. compras;
10. estoque;
11. inventário;
12. vendas;
13. clientes;
14. pagamentos;
15. contas a receber;
16. despesas;
17. contas a pagar;
18. fluxo de caixa;
19. indicadores;
20. relatórios;
21. notificações;
22. importação e exportação;
23. configurações;
24. auditoria;
25. assinatura e planos, futuramente;
26. integrações, futuramente.

## 7.2 Escopo do MVP

O MVP deverá contemplar:

- autenticação;
- cadastro da empresa;
- cadastro de categorias;
- cadastro de produtos;
- cadastro de fornecedores;
- registro de compras;
- entrada de estoque;
- movimentação de estoque;
- cadastro simplificado de clientes;
- registro de vendas;
- registro de pagamentos;
- registro de despesas;
- fluxo de caixa;
- contas básicas a pagar e receber;
- dashboard;
- cálculo de faturamento;
- cálculo de CMV;
- cálculo de lucro bruto;
- cálculo de lucro líquido estimado;
- alertas de estoque baixo;
- histórico das principais operações;
- importação inicial por planilha;
- exportação básica;
- interface responsiva.

## 7.3 Fora do escopo do MVP

- emissão fiscal;
- contabilidade oficial;
- escrituração contábil;
- emissão de NF-e ou NFC-e;
- folha de pagamento;
- gestão tributária avançada;
- integração bancária automática;
- conciliação automática de cartão;
- integração com marketplaces;
- integração com transportadoras;
- múltiplos centros de distribuição;
- produção ou manufatura;
- ordem de serviço;
- franquias;
- gestão avançada de comissões;
- inteligência artificial preditiva;
- aplicativo nativo;
- operação offline completa.

Esses recursos poderão ser considerados futuramente.

---

# 8. Glossário de negócio

## Empresa

Organização ou negócio que utiliza o sistema. No futuro, cada empresa será um tenant isolado.

## Usuário

Pessoa autorizada a acessar uma ou mais empresas.

## Produto

Item comercializado ou controlado pela empresa.

## Variação

Versão específica de um produto, como tamanho, volume, cor ou apresentação.

## SKU

Código interno que identifica de maneira única um produto ou variação dentro de uma empresa.

## Estoque disponível

Quantidade que pode ser vendida.

## Estoque reservado

Quantidade comprometida em vendas ou pedidos ainda não concluídos.

## Estoque físico

Quantidade total registrada como existente.

## Movimentação de estoque

Registro imutável que representa entrada, saída, reserva, liberação ou ajuste de uma quantidade.

## Compra

Operação de aquisição de produtos ou mercadorias.

## Custo de aquisição

Valor pago ao fornecedor pelo produto.

## Custo adicional da compra

Frete, imposto, seguro ou outra despesa diretamente atribuída à compra.

## Custo médio

Custo unitário calculado com base no estoque anterior e nas novas entradas.

## CMV

Custo das Mercadorias Vendidas.

## Receita bruta

Valor total vendido antes das deduções.

## Receita líquida

Receita bruta menos descontos, devoluções e outras deduções definidas.

## Lucro bruto

Receita líquida menos CMV.

## Despesa fixa

Despesa recorrente que não depende diretamente de uma venda.

## Despesa variável

Despesa associada ao volume de vendas ou a uma operação específica.

## Lucro líquido estimado

Receitas menos CMV, taxas, despesas e demais deduções consideradas pelo sistema.

## Competência

Período ao qual uma receita ou despesa pertence economicamente.

## Realização financeira

Data em que o dinheiro efetivamente entra ou sai do caixa.

## Conta a receber

Valor que a empresa espera receber.

## Conta a pagar

Valor que a empresa deverá pagar.

## Caixa previsto

Movimentações financeiras futuras.

## Caixa realizado

Movimentações financeiras efetivamente pagas ou recebidas.

## Inventário

Processo de conferência do estoque físico.

## Ajuste de estoque

Movimentação criada para corrigir uma divergência de quantidade.

---

# 9. Perfis de acesso

## 9.1 Proprietário

Pode visualizar e alterar todos os dados da empresa.

Permissões esperadas:

- configurar empresa;
- gerenciar usuários;
- visualizar custos e lucros;
- criar, editar e cancelar operações;
- exportar dados;
- consultar auditoria;
- configurar integrações;
- gerenciar assinatura.

## 9.2 Administrador

Possui acesso operacional amplo, mas determinadas configurações poderão ser exclusivas do proprietário.

## 9.3 Vendedor

Pode:

- consultar produtos;
- consultar disponibilidade;
- cadastrar clientes, conforme permissão;
- registrar vendas;
- registrar recebimentos;
- consultar as próprias vendas.

Pode não ter acesso a:

- custo dos produtos;
- lucro;
- despesas;
- configurações;
- relatórios estratégicos.

## 9.4 Estoquista

Pode:

- consultar estoque;
- registrar recebimentos;
- registrar perdas e avarias;
- realizar inventários;
- consultar compras;
- ajustar estoque mediante autorização.

## 9.5 Financeiro

Pode:

- consultar contas;
- registrar pagamentos;
- registrar recebimentos;
- gerenciar despesas;
- consultar fluxo de caixa;
- gerar relatórios financeiros.

## 9.6 Visualizador

Acesso somente para consulta das áreas autorizadas.

## 9.7 Regra geral de permissões

O sistema deverá suportar permissões por função e, futuramente, permissões personalizadas.

As ações sensíveis deverão ser autorizadas no backend, independentemente das restrições visuais do frontend.

---

# 10. Módulos funcionais

# 10.1 Autenticação e acesso

## Objetivo

Permitir acesso seguro ao sistema e associação do usuário a uma ou mais empresas.

## Funcionalidades

- cadastro de usuário;
- login;
- logout;
- recuperação de senha;
- redefinição de senha;
- confirmação de e-mail, quando aplicável;
- convite de usuário;
- seleção de empresa;
- gestão de sessão;
- bloqueio de usuário;
- autenticação multifator, futuramente.

## Regras de negócio

1. Um e-mail poderá estar associado a mais de uma empresa.
2. Um usuário deverá possuir uma função em cada empresa.
3. Um usuário bloqueado não poderá acessar a empresa.
4. O usuário não poderá acessar dados de empresas às quais não pertence.
5. A troca de empresa deverá alterar integralmente o contexto operacional.
6. O primeiro usuário de uma empresa será considerado proprietário, salvo fluxo administrativo diferente.
7. A senha nunca deverá ser armazenada em formato reversível.

## Critérios de aceite

- Dado um usuário válido, quando informar credenciais corretas, então deverá acessar o sistema.
- Dado um usuário inválido, quando informar credenciais incorretas, então o sistema não deverá revelar qual campo está incorreto.
- Dado um usuário vinculado a duas empresas, quando realizar login, então deverá selecionar ou acessar a empresa padrão.
- Dado um usuário sem vínculo com uma empresa, quando tentar acessar os dados dela, então o acesso deverá ser negado.
- Dado um usuário bloqueado, quando tentar autenticar-se ou acessar a empresa, então deverá receber uma mensagem apropriada.

---

# 10.2 Empresa

## Objetivo

Representar o negócio que utiliza a plataforma.

## Dados mínimos

- nome fantasia;
- razão social, opcional no MVP;
- documento, opcional no MVP;
- e-mail;
- telefone;
- moeda;
- fuso horário;
- endereço;
- logotipo;
- data de início da operação;
- configurações de estoque;
- configurações financeiras;
- status.

## Regras de negócio

1. Toda entidade operacional deverá pertencer a uma empresa.
2. A moeda padrão da empresa deverá ser utilizada nos cálculos.
3. Datas e horários deverão respeitar o fuso horário da empresa.
4. A exclusão de uma empresa deverá ser lógica e controlada.
5. A troca da moeda principal após o início das operações deverá ser restrita.
6. Cada empresa deverá possuir configurações independentes.
7. Dados agregados nunca poderão misturar empresas.

## Critérios de aceite

- Ao criar uma empresa, o sistema deverá criar as configurações iniciais.
- O usuário proprietário deverá ser vinculado automaticamente.
- Produtos, vendas, compras e lançamentos deverão sempre possuir o identificador da empresa.
- Consultas da empresa A não deverão retornar registros da empresa B.

---

# 10.3 Produtos

## Objetivo

Manter o catálogo interno de itens controlados e comercializados.

## Dados do produto

- nome;
- descrição;
- SKU;
- código de barras;
- categoria;
- marca;
- imagem;
- unidade de medida;
- preço de venda padrão;
- custo de referência;
- estoque mínimo;
- controla estoque;
- permite venda sem estoque;
- ativo ou inativo;
- observações;
- tags;
- gênero, opcional;
- família olfativa, opcional;
- volume, opcional;
- validade, opcional;
- localização no estoque, opcional.

## Variações

Um produto poderá possuir variações, como:

- volume;
- tamanho;
- cor;
- fragrância;
- apresentação;
- tipo de embalagem.

Cada variação poderá ter:

- SKU próprio;
- código de barras próprio;
- preço próprio;
- custo próprio;
- estoque próprio;
- imagem própria.

## Regras de negócio

1. O SKU deverá ser único dentro da empresa.
2. O código de barras, quando informado, deverá ser único dentro da empresa, salvo configuração específica.
3. Um produto inativo não poderá ser adicionado a novas compras ou vendas.
4. A inativação não deverá apagar o histórico.
5. Produtos com movimentações não deverão ser excluídos fisicamente.
6. Produtos que não controlam estoque poderão ser vendidos sem movimentação de estoque.
7. O preço padrão poderá ser alterado na venda conforme permissão.
8. O sistema deverá manter histórico ou data das alterações relevantes de preço.
9. O custo atual não deverá ser alterado manualmente sem registro de origem ou ajuste autorizado.
10. A quantidade do estoque não deverá ser editada diretamente no cadastro do produto.

## Critérios de aceite

- Ao cadastrar um produto com SKU já existente na empresa, o sistema deverá impedir o cadastro.
- Ao inativar um produto, ele não deverá aparecer por padrão nas seleções de novas vendas.
- Ao consultar um produto, o usuário autorizado deverá visualizar estoque, preço e histórico.
- Ao tentar alterar diretamente a quantidade em estoque, o sistema deverá exigir uma movimentação ou ajuste.
- Produtos sem controle de estoque não deverão gerar baixa na venda.

---

# 10.4 Categorias, marcas e classificações

## Objetivo

Permitir organização e filtros.

## Funcionalidades

- cadastrar categoria;
- criar subcategoria, futuramente;
- cadastrar marca;
- definir tags;
- ativar e inativar;
- ordenar;
- filtrar relatórios.

## Regras de negócio

1. O nome da categoria deverá ser único dentro do mesmo nível e empresa.
2. Categorias vinculadas a produtos não deverão ser apagadas sem tratamento.
3. Itens inativos deverão permanecer nos históricos.
4. A alteração do nome deverá refletir nas consultas sem alterar registros históricos de movimentação.

---

# 10.5 Fornecedores

## Objetivo

Manter informações dos fornecedores e o histórico de compras.

## Dados

- nome;
- documento;
- contato;
- telefone;
- WhatsApp;
- e-mail;
- endereço;
- país;
- prazo médio;
- observações;
- status.

## Regras de negócio

1. O fornecedor poderá ser opcional em uma compra simplificada, conforme configuração.
2. O histórico de compras deverá permanecer mesmo após inativação.
3. O sistema poderá calcular indicadores por fornecedor.
4. Um fornecedor não deverá acessar o sistema no MVP.

## Indicadores futuros

- total comprado;
- última compra;
- prazo médio;
- variação de preço;
- frequência de compra;
- produtos fornecidos;
- atrasos;
- qualidade percebida.

---

# 10.6 Compras

## Objetivo

Registrar aquisições de mercadorias e seus impactos em estoque, custo e financeiro.

## Status possíveis

- rascunho;
- pedido;
- parcialmente recebido;
- recebido;
- cancelado.

O status financeiro deverá ser independente:

- não informado;
- pendente;
- parcialmente pago;
- pago;
- vencido;
- cancelado.

## Dados da compra

- fornecedor;
- data da compra;
- data prevista de recebimento;
- data de recebimento;
- itens;
- quantidade;
- custo unitário;
- desconto;
- frete;
- impostos;
- seguro;
- outros custos;
- total;
- forma de pagamento;
- parcelas;
- observações;
- documentos ou anexos, futuramente.

## Regras de negócio

1. Uma compra em rascunho não deverá alterar o estoque.
2. Uma compra marcada apenas como pedido não deverá aumentar o estoque disponível.
3. O estoque deverá aumentar no recebimento dos itens.
4. Uma compra poderá ser recebida parcialmente.
5. Cada recebimento parcial deverá gerar movimentações próprias.
6. O cancelamento de uma compra recebida deverá exigir estorno controlado.
7. Custos adicionais poderão ser rateados entre os itens.
8. O método de rateio deverá ser configurável ou explicitamente definido.
9. O recebimento deverá recalcular o custo médio, caso esse seja o método adotado.
10. A compra poderá gerar contas a pagar.
11. O pagamento da compra não deverá depender do recebimento físico.
12. Alterações após o recebimento deverão ser auditadas.
13. Quantidades recebidas não poderão ser negativas.
14. O mesmo item poderá ser recebido em datas diferentes.
15. O usuário deverá informar divergências entre quantidade comprada e recebida.

## Rateio de custos adicionais

Métodos possíveis:

- proporcional ao valor dos itens;
- proporcional à quantidade;
- proporcional ao peso, futuramente;
- rateio manual.

Método inicial recomendado: proporcional ao valor dos itens.

## Exemplo de cálculo

Compra:

- 10 unidades de um produto a R$ 100,00;
- frete total de R$ 100,00;
- sem outros custos.

Custo total da compra: R$ 1.100,00.

Custo unitário final: R$ 110,00.

## Critérios de aceite

- Dada uma compra em rascunho, quando for salva, então o estoque não deverá ser alterado.
- Dada uma compra com 10 unidades, quando 6 forem recebidas, então somente 6 deverão entrar no estoque.
- Dada uma compra com frete rateado, quando for recebida, então o custo dos produtos deverá incluir o rateio.
- Dada uma compra recebida, quando for cancelada, então o sistema deverá exigir a criação de estorno ou devolução.
- Dada uma compra a prazo, quando for concluída, então as contas a pagar deverão ser criadas conforme as parcelas.

---

# 10.7 Estoque

## Objetivo

Controlar quantidades, reservas, entradas, saídas, perdas e ajustes.

## Tipos de movimentação

- entrada por compra;
- saída por venda;
- reserva por venda ou pedido;
- liberação de reserva;
- devolução de cliente;
- devolução ao fornecedor;
- perda;
- avaria;
- vencimento;
- brinde;
- uso interno;
- ajuste positivo;
- ajuste negativo;
- entrada inicial;
- transferência entre estoques, futuramente;
- estorno.

## Regras de negócio

1. Toda alteração de estoque deverá gerar uma movimentação.
2. Movimentações concluídas não deverão ser apagadas.
3. Correções deverão ocorrer por estorno ou movimentação compensatória.
4. O saldo deverá ser calculável a partir das movimentações.
5. O sistema poderá manter saldo materializado para desempenho, desde que reconciliável.
6. Uma saída não poderá resultar em estoque negativo, salvo permissão explícita.
7. O estoque reservado não poderá ser considerado disponível.
8. O estoque mínimo deverá gerar alerta.
9. Ajustes deverão exigir motivo.
10. Ajustes acima de um limite poderão exigir permissão elevada.
11. Estoque inicial deverá ser registrado como movimentação.
12. Produtos inativos permanecerão visíveis no histórico.
13. A devolução de venda poderá retornar o item ao estoque conforme condição.
14. Produtos avariados devolvidos não deverão ser automaticamente disponibilizados.
15. O sistema deverá suportar lote e validade em fases futuras.
16. Uma venda cancelada deverá estornar a saída ou liberar a reserva.
17. O custo associado à movimentação deverá ser preservado para cálculos históricos.

## Quantidades recomendadas

- quantidade física;
- quantidade reservada;
- quantidade disponível;
- quantidade em trânsito, futuramente.

Fórmula:

`disponível = físico - reservado`

## Critérios de aceite

- Ao receber uma compra, o estoque físico deverá aumentar.
- Ao concluir uma venda, o estoque físico deverá diminuir.
- Ao reservar um produto, o estoque disponível deverá diminuir sem alterar o físico.
- Ao cancelar uma reserva, o estoque disponível deverá ser recomposto.
- Ao registrar uma perda, o estoque físico deverá diminuir e o motivo deverá ser armazenado.
- Nenhuma movimentação deverá existir sem empresa, produto, tipo, quantidade, data e origem ou motivo.
- O saldo atual deverá ser compatível com o histórico de movimentações.

---

# 10.8 Inventário

## Objetivo

Permitir conferência do estoque físico.

## Fluxo

1. criar inventário;
2. selecionar todos os produtos ou um subconjunto;
3. registrar quantidades contadas;
4. comparar com o sistema;
5. revisar divergências;
6. aprovar ajustes;
7. concluir inventário.

## Regras de negócio

1. Um inventário em andamento não deverá alterar o estoque.
2. Os ajustes só serão criados após aprovação.
3. A diferença deverá ser exibida por produto.
4. O sistema deverá registrar quem contou e quem aprovou.
5. O inventário concluído não deverá ser editado.
6. Reabertura deverá exigir permissão elevada ou novo inventário.
7. Produtos não contados deverão ser identificados.
8. O usuário poderá contar por código de barras futuramente.

## Critérios de aceite

- O sistema deverá calcular a diferença entre quantidade esperada e contada.
- Ao aprovar o inventário, deverão ser criadas movimentações de ajuste.
- O histórico deverá permitir rastrear o inventário que originou o ajuste.

---

# 10.9 Clientes

## Objetivo

Manter dados básicos e histórico de relacionamento.

## Dados

- nome;
- WhatsApp;
- telefone;
- e-mail;
- Instagram;
- data de nascimento;
- endereço;
- observações;
- tags;
- preferências;
- status.

## Regras de negócio

1. O cliente poderá ser opcional em uma venda.
2. O sistema deverá permitir um cliente genérico, como “Consumidor final”.
3. E-mail e telefone duplicados deverão gerar alerta, não necessariamente bloqueio.
4. O histórico de compras deverá permanecer após inativação.
5. Dados pessoais deverão ser protegidos conforme legislação aplicável.
6. O usuário deverá poder corrigir ou excluir dados pessoais conforme políticas definidas.
7. Preferências comerciais não deverão ser inferidas como dados sensíveis sem necessidade.
8. Marketing deverá respeitar consentimento quando aplicável.

## Indicadores

- total comprado;
- ticket médio;
- última compra;
- frequência;
- produtos comprados;
- saldo em aberto;
- devoluções;
- preferências.

---

# 10.10 Vendas

## Objetivo

Registrar vendas de forma rápida e gerar automaticamente impactos no estoque, financeiro e indicadores.

## Status da venda

- rascunho;
- orçamento, futuramente;
- reservada;
- confirmada;
- parcialmente paga;
- paga;
- entregue;
- concluída;
- cancelada;
- parcialmente devolvida;
- devolvida.

A implementação poderá simplificar os status no MVP, desde que preserve a capacidade de evolução.

## Dados da venda

- cliente;
- canal de venda;
- data;
- itens;
- quantidade;
- preço unitário;
- desconto por item;
- desconto geral;
- acréscimo;
- frete cobrado;
- forma de pagamento;
- parcelas;
- taxa;
- entrega ou retirada;
- status;
- observações;
- vendedor;
- origem;
- endereço de entrega, quando aplicável.

## Canais de venda

- presencial;
- WhatsApp;
- Instagram;
- catálogo;
- marketplace, futuramente;
- outro.

## Regras de negócio

1. Uma venda em rascunho não deverá movimentar estoque.
2. Uma venda reservada deverá reservar estoque.
3. Uma venda confirmada deverá baixar estoque ou converter a reserva em saída.
4. Uma venda paga não significa necessariamente entregue.
5. Uma venda entregue não significa necessariamente recebida.
6. O status comercial deverá ser separado do status financeiro.
7. O preço poderá ser alterado conforme permissão.
8. Descontos acima de um limite poderão exigir autorização.
9. O custo do item vendido deverá ser preservado no momento da venda.
10. O CMV histórico não deverá mudar quando o custo atual do produto mudar.
11. A venda poderá ter múltiplas formas de pagamento.
12. A venda poderá ser parcialmente paga.
13. O pagamento poderá gerar um ou mais recebimentos.
14. O sistema deverá calcular taxas por forma de pagamento.
15. O cancelamento deverá estornar estoque e financeiro conforme o estado.
16. Itens devolvidos poderão retornar ao estoque, ir para avaria ou ser descartados.
17. A venda poderá ter custo de entrega pago pela empresa.
18. O frete cobrado do cliente deverá ser tratado separadamente do custo de entrega.
19. Brindes deverão ser registrados como itens com valor zero ou por movimentação específica, preservando o custo.
20. A venda não deverá ser apagada após confirmação.
21. Alterações relevantes deverão gerar auditoria.
22. O lucro exibido deverá indicar se é estimado ou realizado.
23. O sistema deverá impedir venda de quantidade superior à disponível, salvo configuração.
24. Uma venda cancelada não deverá contar como faturamento.
25. Devoluções deverão reduzir a receita líquida e ajustar CMV conforme regra.

## Cálculos da venda

### Subtotal

Soma de:

`quantidade × preço unitário`

### Receita bruta

Subtotal mais acréscimos e frete cobrado, conforme política definida.

### Receita líquida

Receita bruta menos descontos e devoluções.

### CMV

Soma do custo histórico dos itens vendidos.

### Lucro bruto

`receita líquida - CMV`

### Lucro da operação

`receita líquida - CMV - taxas - custo de entrega - outros custos variáveis`

### Margem da operação

`lucro da operação / receita líquida × 100`

A definição exata do tratamento do frete deverá ser configurável e documentada.

## Critérios de aceite

- Ao confirmar uma venda, o estoque deverá ser baixado.
- Ao vender um item, o custo utilizado no CMV deverá ser salvo no item da venda.
- Ao alterar futuramente o custo do produto, o CMV da venda antiga não deverá mudar.
- Ao registrar pagamento imediato, o sistema deverá criar a entrada no caixa.
- Ao registrar pagamento futuro, o sistema deverá criar conta a receber.
- Ao cancelar uma venda paga, o sistema deverá orientar ou registrar o estorno.
- Ao cancelar uma venda com estoque baixado, o sistema deverá recompor o estoque conforme condição dos itens.
- Ao aplicar desconto acima do limite, o sistema deverá exigir autorização.
- Uma venda sem cliente deverá ser permitida, utilizando consumidor final ou venda avulsa.

---

# 10.11 Trocas, devoluções e cancelamentos

## Objetivo

Tratar reversões sem apagar o histórico.

## Tipos

- cancelamento total;
- devolução total;
- devolução parcial;
- troca;
- estorno financeiro;
- crédito para cliente, futuramente.

## Regras de negócio

1. Cancelamento e devolução são operações distintas.
2. Uma venda cancelada antes da entrega poderá liberar ou devolver estoque.
3. Uma devolução após entrega deverá registrar o estado do produto.
4. Produtos aptos poderão retornar ao estoque disponível.
5. Produtos avariados deverão retornar para estoque indisponível ou gerar perda.
6. O valor devolvido poderá ser diferente do valor original em casos autorizados.
7. Taxas não recuperáveis deverão permanecer como custo.
8. O CMV deverá ser revertido proporcionalmente aos itens devolvidos.
9. Trocas deverão ser representadas por devolução e nova saída, ou fluxo equivalente auditável.
10. A operação deverá manter vínculo com a venda original.

## Critérios de aceite

- Ao devolver um item em boas condições, o estoque deverá ser recomposto.
- Ao devolver um item avariado, ele não deverá ser somado ao estoque disponível.
- A receita líquida deverá refletir devoluções.
- O histórico deverá mostrar a venda original, a devolução e o eventual estorno.

---

# 10.12 Formas de pagamento

## Objetivo

Configurar como vendas e despesas são pagas.

## Formas iniciais

- dinheiro;
- PIX;
- débito;
- crédito;
- transferência;
- boleto, futuramente;
- pagamento informal ou fiado;
- outro.

## Configurações possíveis

- taxa percentual;
- taxa fixa;
- prazo de recebimento;
- quantidade máxima de parcelas;
- taxa por parcela;
- conta financeira de destino;
- ativa ou inativa.

## Regras de negócio

1. Uma venda poderá utilizar mais de uma forma de pagamento.
2. A soma dos pagamentos não poderá exceder o valor da venda sem tratamento de troco ou crédito.
3. Pagamentos futuros deverão gerar contas a receber.
4. Taxas deverão ser calculadas e armazenadas no momento da venda ou recebimento.
5. Mudanças futuras na configuração da forma de pagamento não deverão alterar vendas antigas.
6. O recebimento líquido e o valor pago pelo cliente deverão ser diferenciados.
7. Pagamentos em dinheiro poderão registrar troco.

---

# 10.13 Contas financeiras

## Objetivo

Representar onde o dinheiro está ou transita.

## Exemplos

- caixa físico;
- banco;
- carteira digital;
- conta PIX;
- maquininha;
- valores a receber da adquirente;
- conta de proprietário.

## Regras de negócio

1. Cada movimentação financeira deverá ser associada a uma conta quando aplicável.
2. Transferências entre contas não deverão ser tratadas como receita ou despesa.
3. O saldo deverá ser calculado pelas movimentações.
4. O saldo inicial deverá ser registrado como movimentação.
5. Contas inativas deverão permanecer no histórico.
6. O usuário poderá ocultar contas sem saldo da visão principal.
7. Valores a receber de cartão poderão ser representados em uma conta transitória.

---

# 10.14 Contas a receber

## Objetivo

Controlar valores que a empresa espera receber.

## Origem

- venda;
- parcelamento;
- aporte prometido;
- outro crédito.

## Dados

- descrição;
- cliente;
- venda;
- valor original;
- valor recebido;
- vencimento;
- competência;
- status;
- forma de pagamento;
- conta de destino;
- juros;
- desconto;
- observações.

## Status

- pendente;
- parcialmente recebido;
- recebido;
- vencido;
- cancelado;
- renegociado, futuramente.

## Regras de negócio

1. O recebimento parcial deverá reduzir o saldo em aberto.
2. O recebimento não poderá superar o saldo sem tratamento explícito.
3. Uma conta vencida deverá ser identificada automaticamente pela data.
4. O recebimento deverá gerar movimentação financeira.
5. O cancelamento deverá exigir motivo.
6. Alterações de vencimento deverão ser auditadas.
7. O recebimento poderá incluir juros ou descontos.
8. A origem deverá permanecer vinculada.
9. A exclusão física não deverá ser permitida após movimentação.

---

# 10.15 Despesas e contas a pagar

## Objetivo

Registrar gastos e compromissos financeiros.

## Categorias de despesas

- mercadorias;
- frete;
- embalagem;
- publicidade;
- plataforma;
- telefone;
- internet;
- aluguel;
- energia;
- transporte;
- combustível;
- taxa;
- imposto;
- manutenção;
- pró-labore;
- retirada;
- despesa administrativa;
- perda;
- outra.

## Dados

- descrição;
- categoria;
- fornecedor;
- valor;
- competência;
- vencimento;
- data de pagamento;
- recorrência;
- forma de pagamento;
- conta financeira;
- centro de custo, futuramente;
- observações;
- anexos, futuramente.

## Regras de negócio

1. Registrar uma despesa não significa necessariamente pagá-la.
2. Uma despesa paga deverá gerar saída no caixa.
3. Uma despesa futura deverá gerar conta a pagar.
4. Compras de mercadorias poderão gerar contas a pagar automaticamente.
5. Despesas recorrentes deverão gerar ocorrências futuras ou lembretes.
6. A alteração de uma recorrência não deverá necessariamente alterar ocorrências já pagas.
7. Pró-labore e retirada deverão ser diferenciados de despesas operacionais, conforme configuração.
8. Transferências não deverão ser classificadas como despesas.
9. Despesas canceladas não deverão afetar relatórios realizados.
10. Uma despesa poderá ser parcelada.
11. Pagamentos parciais deverão ser suportados.
12. Multas e juros deverão ser registrados separadamente ou detalhados.

## Critérios de aceite

- Ao cadastrar uma despesa futura, ela deverá aparecer no contas a pagar e caixa previsto.
- Ao marcar uma despesa como paga, ela deverá aparecer no caixa realizado.
- Ao pagar parcialmente, o saldo deverá permanecer pendente.
- Despesas recorrentes deverão gerar os próximos compromissos conforme a regra definida.
- Uma transferência entre contas não deverá reduzir o lucro.

---

# 10.16 Fluxo de caixa

## Objetivo

Exibir entradas e saídas previstas e realizadas.

## Visões

- diário;
- semanal;
- mensal;
- por período personalizado;
- por conta financeira;
- por categoria;
- previsto;
- realizado;
- consolidado.

## Tipos de movimentação

- entrada;
- saída;
- transferência;
- ajuste.

## Regras de negócio

1. O fluxo realizado deverá considerar apenas movimentações efetivadas.
2. O fluxo previsto deverá considerar contas pendentes.
3. Venda e recebimento são eventos distintos.
4. Compra e pagamento são eventos distintos.
5. Transferências não deverão alterar o resultado da empresa.
6. Cancelamentos e estornos deverão permanecer visíveis.
7. O saldo inicial deverá ser considerado.
8. O usuário deverá poder identificar a origem da movimentação.
9. O sistema deverá diferenciar regime de caixa e competência.
10. Os relatórios deverão informar qual regime está sendo utilizado.

## Critérios de aceite

- Uma venda a prazo deverá aumentar o faturamento por competência, mas não o caixa realizado.
- O recebimento da parcela deverá aumentar o caixa realizado.
- Uma despesa futura deverá aparecer no previsto.
- O pagamento da despesa deverá aparecer no realizado.
- Transferências deverão movimentar duas contas sem alterar receita ou despesa.

---

# 10.17 Dashboard

## Objetivo

Apresentar uma visão rápida e acionável do negócio.

## Indicadores recomendados

- faturamento no período;
- receita líquida;
- CMV;
- lucro bruto;
- despesas;
- lucro líquido estimado;
- margem;
- quantidade de vendas;
- ticket médio;
- valor do estoque;
- quantidade de produtos;
- produtos com estoque baixo;
- contas a receber;
- contas a pagar;
- saldo de caixa;
- vendas por período;
- produtos mais vendidos;
- produtos mais lucrativos;
- categorias mais vendidas;
- vendas por canal;
- vendas por forma de pagamento;
- comparação com período anterior.

## Alertas

- estoque baixo;
- estoque zerado;
- conta vencida;
- conta próxima do vencimento;
- recebimento atrasado;
- produto sem movimentação;
- venda pendente;
- inventário recomendado;
- margem abaixo do esperado.

## Regras de negócio

1. O dashboard deverá respeitar permissões.
2. Usuários sem acesso a custos não deverão visualizar lucro ou CMV.
3. Todos os indicadores deverão possuir período claramente definido.
4. Cancelamentos não deverão compor faturamento.
5. Indicadores deverão informar se consideram competência ou caixa.
6. Os dados deverão ser consistentes com os relatórios detalhados.
7. O usuário deverá poder navegar do indicador para a origem.
8. Comparações deverão utilizar períodos equivalentes.

## Critérios de aceite

- Ao selecionar um período, todos os cards e gráficos deverão ser atualizados.
- Ao clicar em estoque baixo, o usuário deverá visualizar os produtos correspondentes.
- Ao clicar no faturamento, o usuário deverá acessar as vendas que compõem o valor.
- Um vendedor sem permissão financeira não deverá visualizar lucro.
- O total exibido deverá corresponder à soma dos registros do relatório detalhado.

---

# 10.18 Relatórios

## Objetivo

Permitir análise e conferência.

## Relatórios iniciais

- vendas por período;
- itens vendidos;
- faturamento;
- recebimentos;
- contas a receber;
- despesas;
- contas a pagar;
- fluxo de caixa;
- estoque atual;
- movimentações de estoque;
- produtos com estoque baixo;
- produtos mais vendidos;
- lucro por venda;
- lucro por produto;
- margem;
- compras;
- histórico de custos;
- clientes;
- fornecedores.

## Relatórios futuros

- curva ABC;
- giro de estoque;
- cobertura de estoque;
- produtos parados;
- previsão de reposição;
- coorte de clientes;
- DRE gerencial;
- desempenho por canal;
- desempenho por vendedor;
- rentabilidade por cliente;
- rentabilidade por categoria;
- comparação entre fornecedores.

## Regras de negócio

1. Os filtros deverão ser reproduzíveis.
2. O relatório deverá exibir o período e critérios utilizados.
3. Exportações deverão refletir os mesmos filtros.
4. Valores monetários deverão usar a moeda da empresa.
5. Datas deverão usar o fuso da empresa.
6. Totais deverão ser conciliáveis com os dados operacionais.
7. O sistema deverá evitar ambiguidades entre faturado, recebido e lucro.
8. Relatórios com dados sensíveis deverão respeitar permissões.

---

# 10.19 Importação de dados

## Objetivo

Facilitar a migração das planilhas atuais.

## Entidades iniciais

- produtos;
- estoque inicial;
- clientes;
- fornecedores;
- compras históricas, opcional;
- vendas históricas, opcional;
- despesas;
- contas a pagar;
- contas a receber.

## Fluxo

1. selecionar tipo de importação;
2. baixar modelo;
3. enviar arquivo;
4. mapear colunas;
5. validar;
6. exibir erros;
7. revisar;
8. confirmar;
9. processar;
10. disponibilizar relatório de importação.

## Regras de negócio

1. A importação deverá possuir modo de simulação.
2. Nenhuma linha inválida deverá ser importada silenciosamente.
3. O sistema deverá informar erros por linha e coluna.
4. O usuário deverá poder corrigir e reenviar.
5. Importações deverão ser idempotentes ou possuir proteção contra duplicidade.
6. O sistema deverá registrar quem importou e quando.
7. Importações grandes poderão ser processadas de maneira assíncrona.
8. O estoque inicial deverá gerar movimentações.
9. O usuário deverá escolher como tratar duplicidades.
10. A importação deverá respeitar o contexto da empresa.

## Critérios de aceite

- Ao enviar uma planilha inválida, o sistema deverá apresentar erros compreensíveis.
- Ao importar estoque inicial, o sistema deverá criar movimentações de entrada inicial.
- Ao reenviar o mesmo arquivo, o sistema deverá alertar sobre possível duplicidade.
- O usuário deverá visualizar quantos registros foram criados, atualizados, ignorados e rejeitados.

---

# 10.20 Exportação de dados

## Objetivo

Permitir portabilidade, análise externa e backup operacional.

## Formatos

- CSV;
- XLSX;
- PDF para relatórios específicos, futuramente.

## Regras de negócio

1. A exportação deverá respeitar filtros.
2. A exportação deverá respeitar permissões.
3. Dados de uma empresa não poderão aparecer na exportação de outra.
4. O arquivo deverá informar data e período.
5. Exportações grandes poderão ser processadas em segundo plano.
6. O sistema deverá registrar exportações sensíveis, futuramente.

---

# 10.21 Notificações e alertas

## Objetivo

Chamar atenção para situações que exigem ação.

## Canais

- dentro do sistema;
- e-mail, futuramente;
- WhatsApp, futuramente;
- push, futuramente.

## Tipos

- estoque baixo;
- estoque zerado;
- conta vencida;
- vencimento próximo;
- recebimento atrasado;
- compra prevista para chegada;
- produto parado;
- inventário;
- margem baixa;
- falha de importação;
- convite de usuário.

## Regras de negócio

1. O usuário poderá configurar quais alertas deseja receber.
2. Alertas deverão ser associados a uma empresa.
3. Alertas duplicados deverão ser controlados.
4. A marcação como lido não deverá apagar o evento.
5. Alertas críticos poderão permanecer destacados.
6. O sistema deverá permitir navegar para a ação relacionada.

---

# 10.22 Configurações

## Configurações da empresa

- moeda;
- fuso horário;
- formato de data;
- casas decimais;
- permitir estoque negativo;
- método de custo;
- método de rateio;
- estoque mínimo padrão;
- cliente padrão;
- categorias financeiras;
- formas de pagamento;
- contas financeiras;
- limites de desconto;
- políticas de cancelamento;
- políticas de inventário;
- numeração de documentos;
- preferências de dashboard.

## Regras de negócio

1. Alterações de configuração deverão ter efeito prospectivo, salvo indicação.
2. Mudanças que afetem cálculos históricos deverão ser restritas.
3. Configurações sensíveis deverão ser auditadas.
4. Apenas usuários autorizados poderão alterar configurações.
5. O sistema deverá possuir valores padrão seguros.

---

# 10.23 Auditoria

## Objetivo

Registrar ações relevantes para rastreabilidade.

## Eventos recomendados

- login;
- criação de usuário;
- alteração de permissão;
- criação e alteração de produto;
- ajuste de estoque;
- cancelamento de venda;
- alteração de preço;
- desconto autorizado;
- recebimento;
- pagamento;
- alteração de vencimento;
- importação;
- exportação;
- alteração de configuração;
- exclusão lógica;
- estorno.

## Dados da auditoria

- empresa;
- usuário;
- data e hora;
- ação;
- entidade;
- identificador;
- valores anteriores;
- valores posteriores;
- motivo;
- origem;
- endereço de rede ou dispositivo, quando apropriado.

## Regras de negócio

1. Registros de auditoria não deverão ser editáveis por usuários comuns.
2. Dados sensíveis, como senhas e tokens, nunca deverão ser gravados.
3. A retenção deverá ser configurada conforme plano e legislação.
4. A auditoria deverá ser consultável por usuários autorizados.
5. Alterações automáticas também deverão indicar a origem.

---

# 11. Regras financeiras consolidadas

## 11.1 Separação entre eventos

O sistema deverá separar:

- venda;
- faturamento;
- conta a receber;
- recebimento;
- compra;
- despesa;
- conta a pagar;
- pagamento;
- movimentação de caixa.

Essa separação é essencial para evitar conclusões incorretas.

## 11.2 Faturamento

O faturamento deverá considerar vendas válidas no período, independentemente do recebimento, conforme regime de competência.

Vendas canceladas não deverão compor faturamento.

Devoluções deverão reduzir o valor conforme a data e política de relatório.

## 11.3 CMV

O CMV deverá utilizar o custo preservado no item da venda.

Método inicial recomendado: custo médio móvel.

Métodos futuros:

- PEPS;
- custo específico;
- custo padrão.

## 11.4 Custo médio móvel

Ao receber uma nova quantidade:

`novo custo médio = ((quantidade anterior × custo médio anterior) + (quantidade recebida × custo recebido)) / nova quantidade total`

Casos especiais, como estoque negativo ou custo indefinido, deverão ser tratados explicitamente pela especificação técnica.

## 11.5 Lucro bruto

`lucro bruto = receita líquida - CMV`

## 11.6 Lucro operacional da venda

`lucro da venda = receita líquida - CMV - taxas - custos variáveis diretos`

## 11.7 Lucro líquido gerencial

`lucro líquido = receitas - CMV - despesas variáveis - despesas fixas - demais deduções`

O sistema deverá deixar claro que se trata de visão gerencial e não necessariamente de lucro contábil ou fiscal oficial.

## 11.8 Margem

`margem = lucro / receita líquida × 100`

Quando a receita líquida for zero, a margem não deverá causar erro matemático.

## 11.9 Ticket médio

`ticket médio = receita líquida das vendas / quantidade de vendas válidas`

## 11.10 Valor do estoque

Método inicial:

`quantidade física × custo médio atual`

O sistema deverá informar o método utilizado.

## 11.11 Taxas

Taxas de cartão, marketplace, intermediação ou entrega deverão ser armazenadas historicamente.

Uma mudança futura de configuração não poderá recalcular operações passadas sem ação explícita.

## 11.12 Rateio de despesas fixas

No MVP, despesas fixas poderão afetar o lucro líquido do período, mas não precisam ser distribuídas por venda.

O rateio por venda, produto ou categoria poderá ser implementado posteriormente.

---

# 12. Regras de integridade

1. Nenhum registro operacional poderá existir sem empresa.
2. Nenhum usuário poderá acessar outra empresa sem vínculo.
3. Quantidades deverão utilizar precisão definida.
4. Valores monetários deverão usar tipo decimal adequado, nunca ponto flutuante binário.
5. Datas de negócio deverão ser separadas de datas técnicas.
6. Operações que alterem múltiplos módulos deverão ser transacionais sempre que possível.
7. Falhas parciais não deverão gerar inconsistência entre venda, estoque e financeiro.
8. Toda ação crítica deverá ser idempotente ou protegida contra repetição.
9. Cancelamentos não deverão apagar registros.
10. Alterações históricas deverão ser evitadas.
11. Saldos materializados deverão poder ser reconciliados.
12. Toda movimentação deverá possuir origem.
13. O sistema deverá impedir valores impossíveis, como quantidade negativa em uma venda.
14. Operações concorrentes não deverão vender o mesmo estoque além do permitido.
15. Processamentos assíncronos deverão permitir retentativa segura.
16. Importações deverão evitar duplicidade.
17. Exclusões deverão ser lógicas quando houver histórico.
18. Identificadores externos não deverão ser confiados sem validação de empresa.
19. Valores calculados deverão possuir regras centralizadas.
20. O frontend não deverá ser a única camada de validação.

---

# 13. Experiência do usuário

## 13.1 Direção geral

A interface deverá transmitir:

- simplicidade;
- segurança;
- clareza;
- agilidade;
- organização;
- proximidade.

## 13.2 Linguagem

Preferir:

- “Nova venda”
- “Comprei mercadorias”
- “Paguei uma despesa”
- “Recebi um pagamento”
- “Ajustar estoque”
- “Quanto você pagou?”
- “Quando o dinheiro entra?”

Evitar:

- “Lançamento credor”
- “Movimentação escritural”
- “Liquidação financeira”
- “Baixa de título”, salvo em áreas avançadas.

## 13.3 Navegação sugerida

### Mobile

- Início;
- Vendas;
- Estoque;
- Financeiro;
- Mais.

Botão de ação destacado:

- nova venda;
- nova compra;
- nova despesa;
- novo recebimento;
- novo produto;
- ajuste de estoque.

### Desktop

- menu lateral;
- barra superior;
- atalhos;
- conteúdo central;
- painel contextual.

## 13.4 Princípios de UX

1. Reduzir quantidade de campos obrigatórios.
2. Utilizar preenchimento progressivo.
3. Apresentar valores calculados em tempo real.
4. Permitir salvar rascunho.
5. Confirmar ações irreversíveis.
6. Explicar consequências antes de concluir.
7. Oferecer padrões inteligentes.
8. Utilizar busca rápida.
9. Permitir teclado no desktop.
10. Priorizar uso com uma mão no celular.
11. Exibir estados vazios orientativos.
12. Mostrar mensagens de erro acionáveis.
13. Não depender apenas de cores.
14. Manter consistência de componentes.
15. Utilizar linguagem apropriada ao contexto.

## 13.5 Acessibilidade

O sistema deverá buscar conformidade com WCAG em nível adequado.

Requisitos mínimos:

- contraste suficiente;
- navegação por teclado;
- foco visível;
- rótulos;
- suporte a leitores de tela;
- textos alternativos;
- mensagens de erro associadas aos campos;
- tamanho de toque apropriado;
- não depender exclusivamente de cor;
- responsividade com zoom.

---

# 14. Requisitos não funcionais

## 14.1 Segurança

- autenticação segura;
- autorização por empresa e função;
- proteção contra acesso horizontal;
- criptografia em trânsito;
- proteção de segredos;
- prevenção contra ataques comuns;
- logs de segurança;
- limitação de tentativas;
- sessões revogáveis;
- proteção de arquivos;
- validação no servidor;
- backups;
- política de retenção;
- aderência à LGPD.

## 14.2 Desempenho

Metas iniciais sugeridas:

- principais telas carregadas em até 2 segundos em condições normais;
- ações operacionais simples respondidas em até 1 segundo, quando possível;
- pesquisa com retorno rápido;
- paginação em listas;
- processamentos pesados assíncronos;
- suporte a crescimento progressivo.

As metas finais deverão ser definidas na documentação técnica.

## 14.3 Disponibilidade

O sistema deverá buscar disponibilidade compatível com um SaaS de pequeno porte.

Recomendações:

- monitoramento;
- alertas;
- backups automáticos;
- plano de recuperação;
- tolerância a falhas de serviços externos;
- página de status futuramente.

## 14.4 Escalabilidade

A solução deverá permitir:

- crescimento de empresas;
- crescimento de usuários;
- crescimento de produtos;
- crescimento de movimentações;
- separação futura de módulos;
- tarefas assíncronas;
- armazenamento externo de arquivos;
- caches seletivos;
- otimização de relatórios.

## 14.5 Observabilidade

- logs estruturados;
- correlação de requisições;
- métricas;
- rastreamento de erros;
- auditoria;
- monitoramento de filas;
- monitoramento de importações;
- monitoramento de integrações.

## 14.6 Compatibilidade

- navegadores modernos;
- telas de celular;
- tablets;
- desktop;
- PWA futuramente;
- comportamento consistente em diferentes resoluções.

## 14.7 Manutenibilidade

- módulos de negócio bem definidos;
- regras centralizadas;
- testes automatizados;
- documentação atualizada;
- migrações de banco versionadas;
- convenções;
- contratos de API;
- rastreabilidade entre requisito e implementação.

## 14.8 Privacidade

- minimização de dados;
- consentimento quando aplicável;
- exportação de dados pessoais;
- correção de dados;
- exclusão ou anonimização quando aplicável;
- controle de acesso;
- política de retenção;
- registro de operações sensíveis.

---

# 15. Requisitos para uso por agentes de IA

Como parte do desenvolvimento poderá ser realizada por agentes de IA, a documentação e o projeto deverão possuir características que reduzam ambiguidades.

## 15.1 Requisitos de documentação

Cada módulo técnico deverá possuir:

- objetivo;
- limites;
- entidades;
- estados;
- comandos;
- consultas;
- eventos;
- validações;
- regras;
- mensagens de erro;
- permissões;
- critérios de aceite;
- exemplos;
- testes esperados.

## 15.2 Requisitos de backlog

Cada história deverá conter:

- contexto;
- comportamento esperado;
- regras aplicáveis;
- cenários positivos;
- cenários negativos;
- permissões;
- impacto em estoque;
- impacto financeiro;
- impacto em auditoria;
- critérios de aceite;
- dependências;
- fora do escopo.

## 15.3 Requisitos de implementação

- evitar regras duplicadas;
- manter nomenclatura consistente;
- utilizar contratos explícitos;
- definir invariantes;
- criar testes antes ou junto da implementação;
- registrar decisões arquiteturais;
- não assumir comportamentos não documentados;
- interromper ou sinalizar em caso de regra contraditória;
- manter mudanças pequenas e rastreáveis;
- gerar migrations;
- validar isolamento multiempresa;
- documentar endpoints;
- gerar dados de teste;
- preservar retrocompatibilidade quando necessário.

## 15.4 Arquivos recomendados no repositório

- `README.md`
- `docs/product/business-requirements.md`
- `docs/product/glossary.md`
- `docs/product/user-flows.md`
- `docs/product/acceptance-criteria.md`
- `docs/architecture/overview.md`
- `docs/architecture/decisions/`
- `docs/architecture/domain-model.md`
- `docs/architecture/security.md`
- `docs/api/openapi.yaml`
- `docs/data/data-dictionary.md`
- `docs/testing/test-strategy.md`
- `docs/operations/runbook.md`
- `AGENTS.md`
- `CONTRIBUTING.md`

## 15.5 Conteúdo recomendado para AGENTS.md

- visão resumida do produto;
- comandos do projeto;
- estrutura de pastas;
- padrões de código;
- regras de negócio críticas;
- política multiempresa;
- convenções de testes;
- regras para migrations;
- regras de segurança;
- como executar validações;
- arquivos que não podem ser alterados sem aprovação;
- definição de pronto.

---

# 16. Domínios e limites sugeridos

A arquitetura técnica poderá utilizar um monólito modular inicialmente.

Módulos de negócio sugeridos:

1. Identity
2. Tenancy
3. Catalog
4. Inventory
5. Purchasing
6. Sales
7. Customers
8. Suppliers
9. Payments
10. Receivables
11. Payables
12. CashFlow
13. Reporting
14. Notifications
15. Imports
16. Audit
17. Billing, futuramente
18. Integrations, futuramente

## Regra de integração entre módulos

Um módulo não deverá alterar diretamente as tabelas internas de outro módulo sem contrato definido.

Exemplo:

- Sales confirma uma venda;
- Inventory registra a saída;
- Receivables cria parcelas;
- CashFlow registra recebimentos realizados;
- Reporting consome dados operacionais ou projeções próprias.

A forma técnica poderá ser síncrona, assíncrona ou híbrida.

---

# 17. Entidades conceituais

## Identidade e empresa

- User
- Company
- Membership
- Role
- Permission
- Session
- Invitation

## Catálogo

- Product
- ProductVariant
- Category
- Brand
- Tag
- ProductPrice
- Barcode

## Estoque

- InventoryItem
- StockBalance
- StockMovement
- StockReservation
- InventoryCount
- InventoryCountItem
- StockAdjustment

## Compras

- Supplier
- Purchase
- PurchaseItem
- PurchaseReceipt
- PurchaseReceiptItem
- PurchaseCostAllocation

## Vendas

- Customer
- Sale
- SaleItem
- SaleDiscount
- SaleReturn
- SaleReturnItem
- SalesChannel

## Financeiro

- PaymentMethod
- FinancialAccount
- Receivable
- ReceivablePayment
- Payable
- PayablePayment
- Expense
- FinancialTransaction
- Transfer
- Recurrence

## Relatórios e operação

- Notification
- ImportJob
- ImportRow
- ExportJob
- AuditLog
- Attachment

As entidades finais deverão ser detalhadas na modelagem técnica.

---

# 18. Eventos de domínio sugeridos

- CompanyCreated
- UserInvited
- ProductCreated
- ProductActivated
- ProductDeactivated
- PurchaseCreated
- PurchaseReceived
- PurchasePartiallyReceived
- PurchaseCancelled
- StockAdded
- StockRemoved
- StockReserved
- StockReservationReleased
- StockAdjusted
- InventoryCompleted
- SaleCreated
- SaleReserved
- SaleConfirmed
- SalePaid
- SaleCancelled
- SaleReturned
- ReceivableCreated
- ReceivablePaid
- ReceivableOverdue
- PayableCreated
- PayablePaid
- PayableOverdue
- ExpenseCreated
- FinancialTransactionCreated
- LowStockDetected
- ImportCompleted
- ImportFailed

Esses eventos representam linguagem de negócio. Sua implementação técnica não é obrigatória no MVP, mas o comportamento correspondente deverá existir.

---

# 19. Fluxos principais

# 19.1 Cadastro inicial

1. Usuário cria conta.
2. Usuário cria empresa.
3. Sistema cria configurações padrão.
4. Usuário escolhe segmento.
5. Sistema sugere categorias.
6. Usuário cadastra ou importa produtos.
7. Usuário informa estoque inicial.
8. Usuário configura formas de pagamento.
9. Usuário configura contas financeiras.
10. Dashboard passa a exibir os dados.

# 19.2 Compra e recebimento

1. Usuário cria compra.
2. Informa fornecedor.
3. Adiciona itens.
4. Informa custos adicionais.
5. Define pagamento.
6. Salva como pedido ou conclui.
7. Ao receber, confirma quantidades.
8. Sistema rateia custos.
9. Sistema cria movimentações de entrada.
10. Sistema recalcula custo.
11. Sistema cria ou atualiza contas a pagar.
12. Dashboard e relatórios são atualizados.

# 19.3 Venda imediata

1. Usuário inicia nova venda.
2. Seleciona cliente ou consumidor final.
3. Adiciona itens.
4. Sistema valida disponibilidade.
5. Usuário aplica desconto.
6. Seleciona forma de pagamento.
7. Sistema calcula taxa e lucro.
8. Usuário confirma.
9. Sistema baixa estoque.
10. Sistema registra pagamento.
11. Sistema cria entrada financeira.
12. Sistema atualiza indicadores.

# 19.4 Venda a prazo

1. Usuário registra venda.
2. Define pagamento futuro.
3. Sistema baixa ou reserva estoque.
4. Sistema cria conta a receber.
5. Faturamento é atualizado.
6. Caixa realizado não é atualizado.
7. No recebimento, o usuário registra pagamento.
8. Sistema atualiza a conta a receber.
9. Sistema cria entrada no caixa.

# 19.5 Registro de despesa

1. Usuário escolhe “Paguei uma despesa” ou “Tenho uma conta para pagar”.
2. Informa categoria, valor e datas.
3. Se já paga, o sistema cria a saída.
4. Se futura, o sistema cria conta a pagar.
5. Dashboard e fluxo são atualizados.

# 19.6 Ajuste de estoque

1. Usuário seleciona produto.
2. Informa quantidade encontrada.
3. Sistema calcula diferença.
4. Usuário informa motivo.
5. Se necessário, um administrador aprova.
6. Sistema cria movimentação.
7. Auditoria registra a operação.

---

# 20. Critérios de aceite globais

## Isolamento

- Nenhum endpoint, consulta ou exportação poderá retornar dados de outra empresa.
- Todo teste de módulo crítico deverá incluir cenário multiempresa.

## Auditoria

- Toda ação sensível deverá registrar usuário, data, empresa e origem.

## Histórico

- Vendas, compras, pagamentos e movimentações concluídas não poderão ser apagados fisicamente por usuário comum.

## Consistência

- Uma venda confirmada não poderá existir sem o impacto de estoque esperado, salvo produto sem controle de estoque.
- Um recebimento não poderá existir sem movimentação financeira correspondente.
- Um pagamento não poderá existir sem movimentação financeira correspondente.
- Um cancelamento deverá produzir estornos coerentes.

## Segurança

- Restrições de permissão deverão ser aplicadas no servidor.
- Alterar identificadores enviados pelo frontend não deverá permitir acesso indevido.

## Responsividade

- Todos os fluxos principais deverão funcionar em telas móveis.
- Tabelas deverão ter alternativa adequada no celular.

## Usabilidade

- As principais ações deverão poder ser concluídas sem conhecimento contábil.
- Mensagens de erro deverão indicar como resolver o problema.

## Testabilidade

- Toda regra crítica deverá possuir teste automatizado.
- Cálculos deverão possuir testes com valores conhecidos.

---

# 21. Histórias de usuário iniciais

## Épico: Produtos

### US-PROD-001 — Cadastrar produto

Como proprietário, quero cadastrar um produto para controlá-lo no estoque e utilizá-lo nas compras e vendas.

**Critérios de aceite:**

- Deve ser possível informar nome, categoria, SKU, preço e controle de estoque.
- O SKU deve ser único na empresa.
- O produto deve ser criado como ativo por padrão.
- O cadastro não deve criar quantidade em estoque sem uma movimentação.
- O produto deve aparecer nas buscas após o cadastro.

### US-PROD-002 — Inativar produto

Como administrador, quero inativar um produto para impedir seu uso em novas operações sem perder o histórico.

**Critérios de aceite:**

- O produto inativo não deve aparecer por padrão em novas vendas.
- O histórico deve permanecer acessível.
- O produto poderá ser reativado.
- A ação deverá ser auditada.

## Épico: Compras

### US-PUR-001 — Registrar compra

Como proprietário, quero registrar uma compra para acompanhar custos e entrada de mercadorias.

**Critérios de aceite:**

- Deve ser possível incluir fornecedor, itens, quantidades e custos.
- Salvar como rascunho não deve alterar estoque.
- O total deve ser calculado.
- Custos adicionais devem ser suportados.
- A compra poderá gerar contas a pagar.

### US-PUR-002 — Receber compra

Como estoquista, quero receber produtos de uma compra para atualizar o estoque.

**Critérios de aceite:**

- Deve ser possível receber parcialmente.
- O estoque deve aumentar apenas pela quantidade recebida.
- O custo deverá considerar o rateio.
- A movimentação deve possuir vínculo com a compra.
- O recebimento deverá ser auditado.

## Épico: Vendas

### US-SALE-001 — Registrar venda paga

Como vendedor, quero registrar uma venda paga para atualizar estoque e caixa.

**Critérios de aceite:**

- O sistema deverá validar o estoque.
- O sistema deverá calcular o total.
- O sistema deverá registrar a forma de pagamento.
- O estoque deverá ser baixado.
- O recebimento deverá entrar no caixa.
- O CMV e o lucro deverão ser calculados.

### US-SALE-002 — Registrar venda a prazo

Como vendedor, quero registrar uma venda a prazo para acompanhar o valor que ainda será recebido.

**Critérios de aceite:**

- A venda deverá compor o faturamento.
- O caixa realizado não deverá aumentar.
- Uma conta a receber deverá ser criada.
- O estoque deverá ser baixado ou reservado conforme configuração.
- O recebimento posterior deverá atualizar o caixa.

### US-SALE-003 — Cancelar venda

Como administrador, quero cancelar uma venda para corrigir uma operação sem apagar o histórico.

**Critérios de aceite:**

- O sistema deverá exigir motivo.
- O estoque deverá ser recomposto quando aplicável.
- O financeiro deverá ser estornado ou sinalizado.
- A venda deverá permanecer consultável.
- A ação deverá ser auditada.

## Épico: Financeiro

### US-FIN-001 — Registrar despesa paga

Como proprietário, quero registrar uma despesa paga para acompanhar a saída de dinheiro e o lucro.

**Critérios de aceite:**

- A despesa deverá possuir categoria.
- A saída deverá ser registrada na conta selecionada.
- O fluxo de caixa deverá ser atualizado.
- O lucro do período deverá refletir a despesa.
- A operação deverá ser auditada.

### US-FIN-002 — Registrar conta futura

Como proprietário, quero registrar uma conta futura para visualizar meus compromissos.

**Critérios de aceite:**

- A conta deverá aparecer no caixa previsto.
- Não deverá afetar o caixa realizado antes do pagamento.
- Deverá ser identificada como vencida após a data.
- O pagamento deverá gerar saída.

## Épico: Estoque

### US-STK-001 — Consultar estoque

Como usuário, quero consultar o estoque para saber o que está disponível.

**Critérios de aceite:**

- Deve ser possível buscar por nome, SKU ou código.
- O sistema deverá mostrar físico, reservado e disponível.
- Produtos com estoque baixo deverão ser destacados.
- O usuário sem permissão de custo não deverá ver o custo.

### US-STK-002 — Ajustar estoque

Como administrador, quero corrigir uma divergência de estoque mantendo rastreabilidade.

**Critérios de aceite:**

- O motivo deverá ser obrigatório.
- O sistema deverá criar movimentação.
- O saldo deverá ser atualizado.
- A operação deverá ser auditada.
- Ajustes elevados poderão exigir autorização.

---

# 22. Métricas de produto

## Adoção

- empresas cadastradas;
- empresas ativas;
- usuários ativos;
- conclusão do onboarding;
- primeira venda registrada;
- primeiro produto cadastrado;
- primeira importação concluída.

## Engajamento

- vendas registradas por semana;
- compras registradas;
- despesas registradas;
- frequência de acesso;
- uso do dashboard;
- uso de relatórios;
- alertas resolvidos.

## Eficiência

- tempo médio para registrar venda;
- tempo médio para cadastrar produto;
- redução de uso de planilhas;
- quantidade de operações corrigidas;
- taxa de erro de importação.

## Retenção

- empresas ativas após 7, 30 e 90 dias;
- recorrência semanal;
- cancelamento de assinatura, futuramente;
- motivos de abandono.

## Qualidade

- erros por operação;
- divergências de estoque;
- falhas de cálculo;
- tempo de resposta;
- disponibilidade;
- tickets de suporte;
- satisfação.

## Resultado de negócio

- receita recorrente mensal, futuramente;
- conversão de plano;
- ticket médio por empresa;
- custo de aquisição;
- custo de suporte;
- margem do SaaS.

---

# 23. Planos e monetização futuros

## Possível estrutura

### Gratuito ou teste

- limite de produtos;
- limite de vendas;
- um usuário;
- relatórios básicos;
- período de avaliação.

### Essencial

- produtos ilimitados ou limite maior;
- estoque;
- vendas;
- financeiro;
- relatórios;
- importação;
- suporte básico.

### Profissional

- múltiplos usuários;
- permissões;
- relatórios avançados;
- automações;
- integrações;
- exportações;
- múltiplas contas.

### Avançado

- múltiplos estoques;
- API;
- integrações;
- inteligência artificial;
- suporte prioritário;
- recursos avançados.

A monetização não deverá comprometer a integridade dos dados. O usuário deverá poder exportar suas informações.

---

# 24. Roadmap sugerido

## Fase 0 — Descoberta e migração da MAFA Store

- mapear planilhas atuais;
- mapear colunas;
- validar fórmulas;
- identificar exceções;
- definir categorias;
- definir formas de pagamento;
- definir contas;
- registrar fluxos reais;
- preparar dataset de teste.

## Fase 1 — Fundação

- autenticação;
- empresa;
- usuários;
- permissões básicas;
- catálogo;
- produtos;
- categorias;
- fornecedores;
- configurações.

## Fase 2 — Estoque e compras

- compras;
- recebimento;
- movimentações;
- custo médio;
- estoque inicial;
- estoque baixo;
- histórico.

## Fase 3 — Vendas

- nova venda;
- pagamentos;
- baixa de estoque;
- CMV;
- lucro;
- cancelamento;
- devolução básica.

## Fase 4 — Financeiro

- contas financeiras;
- despesas;
- contas a pagar;
- contas a receber;
- caixa previsto;
- caixa realizado.

## Fase 5 — Dashboard e relatórios

- indicadores;
- filtros;
- relatórios operacionais;
- exportação;
- alertas.

## Fase 6 — Migração e validação

- importação de planilhas;
- conciliação;
- operação paralela;
- correção;
- aceite da MAFA Store.

## Fase 7 — SaaS multiempresa

- onboarding autônomo;
- planos;
- cobrança;
- limites;
- suporte;
- termos;
- privacidade;
- observabilidade ampliada.

## Fase 8 — Expansão

- PWA;
- código de barras;
- catálogo;
- WhatsApp;
- integrações;
- inteligência artificial;
- previsão;
- múltiplos estoques.

---

# 25. Estratégia de implantação na MAFA Store

## Etapa 1 — Levantamento

Coletar:

- planilhas;
- produtos;
- estoque;
- compras;
- vendas;
- despesas;
- formas de pagamento;
- custos;
- regras atuais;
- problemas conhecidos.

## Etapa 2 — Limpeza

- remover duplicidades;
- padronizar nomes;
- criar SKUs;
- revisar custos;
- revisar saldos;
- separar históricos de dados atuais;
- definir data de corte.

## Etapa 3 — Importação

- importar cadastros;
- importar estoque inicial;
- importar contas abertas;
- importar histórico mínimo necessário.

## Etapa 4 — Operação paralela

Durante um período definido:

- registrar no sistema;
- manter planilha de conferência;
- comparar estoque;
- comparar faturamento;
- comparar CMV;
- comparar caixa;
- registrar divergências.

## Etapa 5 — Aceite

O sistema será considerado apto para substituir as planilhas quando:

- estoque estiver conciliado;
- vendas estiverem consistentes;
- compras atualizarem custos;
- caixa estiver conciliado;
- relatórios principais forem confiáveis;
- fluxos puderem ser executados no celular;
- não houver falhas críticas abertas.

---

# 26. Riscos

## Risco: escopo excessivo

**Mitigação:** manter MVP limitado e utilizar roadmap.

## Risco: regras financeiras ambíguas

**Mitigação:** documentar exemplos e separar competência de caixa.

## Risco: divergência de estoque inicial

**Mitigação:** realizar inventário antes da migração.

## Risco: custo histórico incorreto

**Mitigação:** preservar custo na venda e validar importação.

## Risco: baixa adesão por complexidade

**Mitigação:** UX simples, onboarding e ações guiadas.

## Risco: vazamento entre empresas

**Mitigação:** isolamento estrutural, testes e autorização centralizada.

## Risco: agentes de IA implementarem regras inconsistentes

**Mitigação:** contratos explícitos, testes, documentação e revisão automática.

## Risco: relatórios lentos

**Mitigação:** paginação, índices, agregações e processamento assíncrono.

## Risco: dependência de integrações

**Mitigação:** design tolerante a falhas e integrações desacopladas.

## Risco: interpretação contábil

**Mitigação:** posicionar os indicadores como gerenciais e evitar promessa de contabilidade oficial.

---

# 27. Premissas

1. A primeira operação será a MAFA Store.
2. O sistema será web e responsivo.
3. O uso principal poderá ocorrer em celular.
4. O MVP trabalhará com uma moeda principal por empresa.
5. O MVP utilizará estoque único por empresa.
6. O método inicial de custo será custo médio móvel.
7. A plataforma não será um sistema contábil ou fiscal oficial no MVP.
8. A primeira versão priorizará clareza sobre automação avançada.
9. O sistema deverá nascer preparado para multiempresa, mesmo que inicialmente exista apenas uma empresa real.
10. Os cálculos críticos deverão estar cobertos por testes automatizados.
11. Operações concluídas serão corrigidas por estornos, não por exclusão.
12. O usuário poderá exportar seus dados.
13. A experiência deverá ser acessível para leigos.
14. O time técnico poderá ser composto por humanos, agentes de IA ou ambos.

---

# 28. Questões em aberto

As seguintes decisões deverão ser validadas antes ou durante a especificação técnica:

1. Nome do produto.
2. Método exato de cálculo de custo.
3. Tratamento de estoque negativo.
4. Momento da baixa de estoque.
5. Política de reservas.
6. Tratamento do frete cobrado.
7. Tratamento do custo de entrega.
8. Rateio de custos adicionais.
9. Forma de cálculo de lucro líquido.
10. Tratamento de pró-labore e retiradas.
11. Tratamento de brindes.
12. Tratamento de decants e fracionamento.
13. Controle de lotes e validade.
14. Controle de kits e composição.
15. Necessidade de múltiplos preços.
16. Necessidade de múltiplas moedas.
17. Política de desconto.
18. Política de devolução.
19. Dados obrigatórios do cliente.
20. Histórico que deverá ser importado.
21. Modelo de planos.
22. Limites por plano.
23. Política de retenção.
24. Estratégia de backups.
25. Estratégia de onboarding.
26. Necessidade de suporte offline.
27. Necessidade de emissão de pedido ou comprovante.
28. Integrações prioritárias.
29. Critérios de sucesso da operação-piloto.
30. Volume esperado de dados.

---

# 29. Casos específicos da MAFA Store a validar

## Decants

Deverá ser decidido se decants serão tratados como:

- produtos independentes;
- variações;
- transformação de estoque;
- kits;
- produção/fracionamento.

Exemplo:

Um frasco de 100 ml poderá gerar unidades de 5 ml e 10 ml. Esse processo reduz o estoque do frasco original e aumenta o estoque dos decants, considerando perdas e materiais.

Esse fluxo provavelmente deverá ser tratado futuramente como transformação de estoque.

## Kits

Um kit poderá:

- possuir estoque próprio;
- consumir componentes somente na venda;
- ser montado previamente;
- possuir preço e custo derivados.

## Brindes

Brindes deverão reduzir estoque e representar custo, mesmo quando não gerarem receita.

## Produtos importados

Custos poderão incluir:

- moeda estrangeira;
- câmbio;
- viagem;
- transporte;
- imposto;
- frete;
- taxa;
- perda;
- rateio.

O suporte completo a múltiplas moedas poderá ficar fora do MVP, mas os custos finais em reais deverão ser registráveis.

## Promoções

O sistema deverá futuramente suportar:

- preço promocional;
- período;
- desconto percentual;
- desconto fixo;
- combo;
- leve mais;
- brinde;
- cupom.

No MVP, o desconto poderá ser aplicado diretamente na venda.

---

# 30. Definição de pronto

Uma funcionalidade será considerada pronta quando:

- o requisito estiver implementado;
- os critérios de aceite estiverem atendidos;
- permissões estiverem aplicadas;
- isolamento multiempresa estiver validado;
- validações de backend estiverem implementadas;
- testes automatizados estiverem aprovados;
- logs e auditoria necessários existirem;
- interface estiver responsiva;
- acessibilidade básica estiver validada;
- mensagens de erro estiverem adequadas;
- documentação estiver atualizada;
- migrations estiverem incluídas;
- observabilidade necessária estiver disponível;
- não houver falha crítica conhecida;
- o comportamento tiver sido validado com dados realistas.

---

# 31. Próximos documentos recomendados

A partir deste documento, o time deverá elaborar:

1. mapa de jornadas;
2. fluxos de usuário;
3. wireframes;
4. design system;
5. modelo de domínio;
6. modelo de dados;
7. arquitetura de software;
8. arquitetura de infraestrutura;
9. ADRs;
10. especificação de API;
11. estratégia de segurança;
12. estratégia multiempresa;
13. estratégia de testes;
14. plano de migração;
15. plano de observabilidade;
16. plano de implantação;
17. backlog priorizado;
18. matriz de rastreabilidade;
19. plano de produto;
20. documentação para agentes de IA.

---

# 32. Matriz inicial de prioridade

## Must have

- autenticação;
- empresa;
- produtos;
- categorias;
- compras;
- recebimento;
- estoque;
- vendas;
- pagamentos;
- despesas;
- contas a pagar;
- contas a receber;
- fluxo de caixa;
- CMV;
- lucro;
- dashboard;
- importação;
- responsividade;
- isolamento multiempresa.

## Should have

- clientes;
- fornecedores;
- devoluções;
- inventário;
- alertas;
- relatórios;
- exportação;
- permissões;
- auditoria detalhada.

## Could have

- PWA;
- código de barras;
- anexos;
- promoções;
- múltiplas tabelas de preço;
- relatórios avançados;
- automações;
- catálogo.

## Won’t have no MVP

- emissão fiscal;
- marketplace;
- conciliação bancária;
- contabilidade oficial;
- múltiplos depósitos;
- manufatura avançada;
- aplicativo nativo;
- IA preditiva.

---

# 33. Conclusão

O produto deverá substituir uma operação fragmentada em planilhas por um fluxo integrado e confiável.

Seu principal diferencial não será apenas possuir funcionalidades de estoque e financeiro. O diferencial será transformar operações complexas em ações simples e compreensíveis.

A plataforma deverá nascer com três compromissos:

1. ser simples para quem usa;
2. ser consistente para quem administra;
3. ser explícita para quem desenvolve, seja humano ou agente de IA.

A MAFA Store será o ambiente inicial de validação, mas as regras e os limites deverão ser projetados de forma reutilizável para que o sistema evolua para um ERP SaaS de gestão simples para pequenos vendedores.


---

# 34. Validação com as planilhas reais da MAFA Store

## 34.1 Arquivos analisados

A especificação foi confrontada com os seguintes arquivos operacionais:

- `MAFA Store - Vendas e Lucros.xlsx`
- `MAFA_Store_Gestao_Lucro_v2.xlsx`

As planilhas representam cinco áreas principais da operação:

1. aquisição de mercadorias;
2. estoque e disponibilidade;
3. vendas e valores recebidos;
4. contas a receber;
5. demonstrativo mensal de resultado e divisão do lucro.

## 34.2 Estrutura atual identificada

### Controle de mercadorias

O arquivo de vendas e lucros mantém abas anuais de mercadorias. Cada linha representa uma aquisição ou um agrupamento de unidades compradas, com campos como:

- descrição;
- quantidade;
- status;
- valor unitário;
- valor total;
- preço de venda sugerido;
- data da compra;
- total investido;
- possível lucro.

Foram identificadas:

- 68 linhas de aquisição no período 2025/2026;
- 45 linhas de aquisição ou estoque no período 2026/2027;
- R$ 10.757,00 registrados como investimento em 2025/2026;
- R$ 5.674,27 registrados como investimento em 2026/2027.

### Controle de vendas

As vendas são registradas por item, com:

- produto;
- cliente;
- valor vendido;
- valor pago;
- data da venda;
- indicação de pagamento;
- meio de pagamento;
- número de parcelas;
- parcelas pagas.

Foram identificadas:

- 75 linhas de venda no período 2025/2026;
- 4 linhas de venda no período 2026/2027;
- R$ 12.177,75 em vendas registradas em 2025/2026;
- R$ 11.882,65 recebidos no mesmo período;
- R$ 570,00 em vendas registradas em 2026/2027;
- R$ 245,00 recebidos no mesmo período.

### Controle de contas a receber

Existe uma aba separada na qual cada parcela é registrada individualmente, com:

- cliente;
- produto;
- data da venda;
- valor total;
- quantidade de parcelas;
- número da parcela;
- valor da parcela;
- vencimento;
- status;
- observação.

### Gestão mensal de resultado

O segundo arquivo contém:

- DRE gerencial mensal;
- configurações de distribuição do lucro;
- histórico mensal;
- contas a receber.

A DRE separa:

- faturamento por tipo de produto;
- custo de produtos vendidos;
- frete de entrada;
- embalagens;
- taxas;
- custos fixos;
- lucro bruto;
- lucro operacional;
- distribuição do lucro.

A distribuição atual está configurada como:

- 60% para reinvestimento em estoque;
- 25% para pró-labore;
- 10% para reserva de emergência;
- 5% para investimento ou marketing adicional.

## 34.3 Problemas estruturais confirmados

### Duplicidade de registros

Uma venda parcelada precisa ser atualizada:

- na aba de vendas;
- na coluna de valor pago;
- na quantidade de parcelas pagas;
- na aba de contas a receber;
- posteriormente na DRE.

O sistema deverá eliminar essa duplicidade. A venda será registrada uma única vez e gerará automaticamente suas parcelas e recebimentos.

### Produto sem identidade única

O mesmo produto aparece com grafias diferentes, abreviações e nomes aproximados.

Exemplos observados:

- `Asad` e `Asad By Lattafa`;
- `Club the Nuit`, `Club de Nuit Int. Men` e outras variações;
- `Body Splash`, `Body Splash Lattafa` e nomes específicos;
- `Durrat` em múltiplas compras e preços;
- `Sublime`, `Kit Sublime` e `Sublime Perfumed Spray`.

Isso torna impossível relacionar compras, estoque e vendas de maneira confiável apenas pelo nome.

O MVP deverá exigir um identificador interno estável, preferencialmente SKU, e permitir aliases para auxiliar a importação de nomes antigos.

### Compra e produto misturados

Cada nova aquisição do mesmo produto gera uma nova linha. A planilha não diferencia claramente:

- cadastro do produto;
- lote ou entrada;
- custo da compra;
- saldo disponível;
- unidade vendida.

O sistema deverá separar:

- produto;
- compra;
- item da compra;
- recebimento;
- movimentação de estoque;
- saldo;
- custo histórico.

### Status com significados diferentes

Na aba de mercadorias, o campo `Status` contém informações como:

- Em Estoque;
- Indisponível;
- Encomenda VM;
- Encomenda WFTech.

Esses valores misturam disponibilidade física, etapa logística e fornecedor.

O sistema deverá separar:

- status do produto;
- status da compra;
- status do recebimento;
- quantidade em trânsito;
- quantidade física;
- quantidade reservada;
- fornecedor.

### Precificação por fórmula local

Os preços de venda são calculados com margens diferentes, como 30%, 50%, 60%, 70%, 90% ou 100%, além de arredondamentos.

Também existem custos calculados por:

- preço em dólar;
- cotação do dólar;
- frete unitário;
- valor manual adicional.

Isso confirma a necessidade de um módulo de formação de preço, mesmo que simplificado inicialmente.

O produto deverá permitir:

- custo de aquisição;
- custos adicionais;
- margem desejada;
- preço sugerido;
- preço final manual;
- arredondamento;
- histórico da regra utilizada.

### Câmbio registrado dentro de fórmulas

As cotações de moeda estão embutidas em fórmulas e variam entre produtos ou compras.

O sistema deverá registrar a cotação como dado da compra, e não como constante escondida em uma fórmula.

### Estoque não derivado das vendas

Não existe vínculo automático entre as abas de mercadorias e vendas. A indicação de disponibilidade depende de atualização manual.

O saldo do sistema deverá ser derivado das movimentações:

`estoque = entradas - saídas + devoluções ± ajustes`

### CMV mensal manual

A DRE utiliza valores digitados ou somados manualmente. O custo das mercadorias compradas no mês pode ser confundido com o custo das mercadorias efetivamente vendidas.

No ERP:

- compra não será automaticamente CMV;
- mercadoria só comporá CMV quando for vendida;
- o custo utilizado deverá ser preservado no item da venda.

### Regime de caixa e competência misturados

A aba de contas a receber orienta lançar na DRE apenas quando o dinheiro entrar, enquanto o relatório utiliza o termo faturamento.

O sistema deverá apresentar separadamente:

- vendas realizadas;
- faturamento por competência;
- recebimentos;
- caixa realizado;
- valores a receber;
- resultado gerencial por competência;
- resultado de caixa.

### Parcelas sem calendário completo

Algumas parcelas não possuem vencimento e permanecem como “Aguardando”.

O sistema deverá exigir ou sugerir uma agenda de vencimentos ao criar o parcelamento.

### Forma de pagamento insuficientemente detalhada

Existem formas como PIX, dinheiro, débito e cartão de crédito, mas sem:

- conta de destino;
- taxa aplicada;
- data prevista de recebimento;
- adquirente;
- bandeira;
- parcelamento do cliente;
- parcelamento do lojista.

Esses dados deverão ser modelados separadamente quando relevantes.

### Categorias de produtos inferidas pelo nome

A DRE separa faturamento por Eau de Parfum, Decant, Perfumed Spray e Body Splash, mas as vendas não possuem categoria estruturada.

O sistema deverá obter a categoria a partir do cadastro do produto, evitando classificação manual ao fechar o mês.

## 34.4 Regras adicionais derivadas das planilhas

### RN-IMP-001 — Alias de produto

Durante a importação, o sistema deverá permitir relacionar nomes antigos a um produto oficial.

### RN-IMP-002 — Revisão de duplicidades

Quando nomes semelhantes forem encontrados, o sistema deverá pedir que o usuário escolha entre:

- utilizar produto existente;
- criar novo produto;
- registrar como alias;
- ignorar a linha.

### RN-PUR-016 — Cotação da compra

Uma compra em moeda estrangeira deverá guardar:

- moeda;
- valor na moeda de origem;
- cotação;
- data da cotação;
- valor convertido;
- custos adicionais em reais.

### RN-PUR-017 — Origem ou canal de compra

A compra poderá guardar uma origem, como fornecedor, importadora, viagem, marketplace ou revendedor.

### RN-PRC-001 — Formação de preço

O sistema deverá permitir calcular um preço sugerido usando custo e margem.

### RN-PRC-002 — Preço final independente

O usuário poderá definir um preço final diferente do preço sugerido.

### RN-PRC-003 — Histórico de preço

Toda alteração de preço deverá guardar data, usuário e valor anterior.

### RN-STK-018 — Estoque em trânsito

Itens comprados e ainda não recebidos deverão aparecer como “em trânsito”, sem compor o estoque disponível.

### RN-SALE-026 — Uma venda com vários itens

Uma única venda deverá aceitar vários produtos. A planilha atual utiliza uma linha por produto, o que não deve obrigar o ERP a criar várias vendas para o mesmo atendimento.

### RN-SALE-027 — Pagamento parcelado informal

O sistema deverá suportar parcelamento recebido diretamente pelo lojista, sem depender de cartão.

### RN-REC-010 — Agenda de parcelas

Ao informar valor, quantidade de parcelas e primeira data, o sistema deverá sugerir automaticamente os vencimentos seguintes.

### RN-DRE-001 — DRE automática

A DRE gerencial deverá ser calculada a partir das operações, sem digitação manual dos totais principais.

### RN-DRE-002 — Distribuição apenas de resultado positivo

Por padrão, o sistema não deverá distribuir lucro quando o resultado líquido for negativo.

### RN-DRE-003 — Distribuição configurável

Os percentuais de reinvestimento, pró-labore, reserva e marketing deverão ser configuráveis por empresa e por período.

### RN-DRE-004 — Não confundir distribuição com despesa

A distribuição do lucro deverá ocorrer após o resultado líquido e não deverá ser usada para recalcular o lucro operacional do mesmo período.

## 34.5 Ajustes recomendados no escopo do MVP

Após a análise das planilhas, os seguintes itens passam a ser indispensáveis no MVP:

1. cadastro único de produtos com SKU;
2. aliases para migração;
3. categorias estruturadas;
4. compra com itens e fornecedor;
5. compra em moeda estrangeira, ao menos com conversão manual;
6. custos adicionais e rateio;
7. recebimento e estoque em trânsito;
8. estoque derivado por movimentações;
9. venda com múltiplos itens;
10. pagamento parcial;
11. parcelamento informal;
12. contas a receber automáticas;
13. recebimento vinculado à parcela;
14. CMV automático;
15. DRE automática;
16. separação entre competência e caixa;
17. histórico de preços;
18. importação assistida das planilhas;
19. conciliação após importação;
20. distribuição configurável do lucro.

## 34.6 Itens que podem permanecer fora do primeiro MVP

- cotação automática de moeda;
- integração com adquirentes;
- conciliação bancária;
- múltiplos depósitos;
- controle fiscal;
- emissão de nota;
- previsão por inteligência artificial;
- formação avançada de preço por impostos;
- transformação automática de frascos em decants.

## 34.7 Modelo de migração sugerido

### Produtos

Criar um cadastro oficial e mapear todos os nomes históricos.

### Compras

Cada linha das abas de mercadorias deverá ser importada como item de compra ou entrada inicial, conforme a disponibilidade de dados.

### Estoque inicial

Como as vendas não estão diretamente vinculadas às compras, o estoque atual deverá ser confirmado por inventário físico. Não é seguro derivar o saldo apenas subtraindo nomes semelhantes.

### Vendas

Cada linha histórica poderá ser importada como item de venda. Linhas com mesmo cliente, data e contexto poderão ser agrupadas após revisão.

### Recebimentos

O campo “Valor Pago” deverá gerar recebimentos históricos. A diferença entre valor vendido e pago deverá gerar saldo a receber.

### Parcelas

A aba de contas a receber deverá ser usada como fonte prioritária para parcelas abertas. Duplicidades com a aba de vendas deverão ser conciliadas.

### DRE e histórico

Os valores históricos poderão ser preservados como fechamentos mensais importados, sem necessariamente reconstruir todos os cálculos passados.

## 34.8 Critérios de aceite para migração da MAFA Store

- Todos os produtos ativos deverão possuir SKU.
- Nomes históricos deverão estar vinculados a produtos oficiais.
- O estoque inicial deverá ser aprovado após inventário.
- A soma das vendas importadas deverá ser conciliada com as planilhas.
- A soma dos recebimentos importados deverá ser conciliada.
- As contas abertas deverão ser conferidas cliente por cliente.
- Nenhuma parcela poderá ser duplicada.
- O valor investido histórico deverá permanecer consultável.
- Divergências deverão ser registradas em relatório.
- A importação deverá poder ser revertida antes do aceite final.

## 34.9 Conclusão da validação

As planilhas confirmam que o maior valor do produto não está apenas em exibir indicadores. O ganho principal será eliminar atualizações repetidas e garantir que uma operação tenha efeitos automáticos e rastreáveis.

O fluxo prioritário deverá ser:

`Compra → Recebimento → Estoque → Venda → CMV → Recebimento → Caixa → DRE`

A documentação técnica deverá preservar essa cadeia e impedir que módulos criem resultados contraditórios.
