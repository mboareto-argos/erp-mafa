"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon, type IconName } from "@/components/layout/app-icon";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SelectControl } from "@/components/ui/select-field";

type ImportType = "product" | "initial_stock" | "customer" | "supplier" | "expense" | "payable" | "receivable";
type DuplicateAction = "use_existing" | "create_new" | "register_alias" | "ignore";
type ImportRow = {
  id?: string;
  rowNumber: number;
  cells?: Record<string, string>;
  rawData?: Record<string, string>;
  status?: "created" | "updated" | "skipped" | "rejected";
  errors?: Record<string, string>;
  duplicateMatch?: { entityLabel: string; matchedBy: string };
};
type Preview = { rows: ImportRow[]; summary: { toCreate: number; toReview: number; toReject: number } };
type Job = {
  id: string;
  entityType: string;
  status: string;
  fileName: string | null;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  rejectedCount: number;
  createdAt: string;
  expectedTotal?: string | null;
  reconciledTotal?: string | null;
  divergence?: string | null;
  rows?: ImportRow[];
};

type TypeOption = { label: string; description: string; icon: IconName };

const typeOptions: Record<ImportType, TypeOption> = {
  product: { label: "Produtos", description: "Catálogo, SKU, preço e unidade", icon: "products" },
  initial_stock: { label: "Estoque inicial", description: "Saldo de abertura por SKU", icon: "inventory" },
  customer: { label: "Clientes", description: "Dados pessoais e de contato", icon: "customers" },
  supplier: { label: "Fornecedores", description: "Parceiros e dados comerciais", icon: "suppliers" },
  expense: { label: "Despesas", description: "Saídas operacionais", icon: "finance" },
  payable: { label: "Contas a pagar", description: "Obrigações e vencimentos", icon: "purchases" },
  receivable: { label: "Contas a receber", description: "Receitas e vencimentos", icon: "sales" },
};
const typeEntries = Object.entries(typeOptions) as Array<[ImportType, TypeOption]>;
const financialTypes = new Set<ImportType>(["expense", "payable", "receivable"]);
const pageSize = 10;
const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const currency = (value?: string | null) => value == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
const statusLabel = (status: string) => status === "completed" ? "Concluída" : status === "reverted" ? "Revertida" : status;
const errorMessage = (body: unknown, fallback: string) => {
  if (!body || typeof body !== "object") return fallback;
  const payload = body as { message?: string; error?: { message?: string } };
  return payload.error?.message ?? payload.message ?? fallback;
};

function ImportSteps({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Preparar arquivo", "Revisar dados", "Resultado"];
  return <ol className="import-steps" aria-label="Etapas da importação">{steps.map((label, index) => {
    const number = index + 1;
    const completed = number < step;
    return <li key={label} className={number === step ? "active" : completed ? "completed" : ""}><span>{completed ? "✓" : number}</span><div><strong>{label}</strong><small>{completed ? "Concluído" : number === step ? "Em andamento" : "Pendente"}</small></div></li>;
  })}</ol>;
}

function ImportReport({ job, pending, onClose, onRevert }: { job: Job; pending: boolean; onClose: () => void; onRevert: () => void }) {
  const [confirmRevert, setConfirmRevert] = useState(false);
  const accepted = job.createdCount + job.updatedCount;
  return <>
    <DialogContent className="sale-detail-dialog import-report-dialog">
      <header className="sale-detail-header"><div className="sale-detail-title"><span className="sale-detail-icon"><AppIcon name="imports" /></span><div><span className="sale-detail-eyebrow">Relatório da importação</span><DialogTitle>{job.fileName ?? "Planilha sem nome"}</DialogTitle><DialogDescription>{typeOptions[job.entityType as ImportType]?.label ?? job.entityType} · {dateTime(job.createdAt)}</DialogDescription></div></div><div className="sale-detail-header-actions"><span className={`status-badge ${job.status === "completed" ? "active" : "cancelled"}`}>{statusLabel(job.status)}</span><button className="dialog-close" type="button" aria-label="Fechar" onClick={onClose}>×</button></div></header>
      <div className="sale-detail-layout"><div className="sale-detail-main">
        <section className="sale-detail-card import-report-overview"><div><span>Total de linhas</span><strong>{job.totalRows}</strong></div><div><span>Processadas</span><strong>{accepted + job.skippedCount}</strong></div><div><span>Rejeitadas</span><strong>{job.rejectedCount}</strong></div></section>
        <section className="sale-detail-card sale-detail-section"><div className="sale-detail-section-heading"><div><span className="sale-detail-section-icon"><AppIcon name="imports" /></span><div><h3>Resultado por linha</h3><p>Consulte o que foi criado, atualizado, ignorado ou rejeitado.</p></div></div><strong>{job.rows?.length ?? 0}</strong></div>{!job.rows?.length ? <div className="sale-detail-empty"><span>—</span><p>O detalhamento de linhas não está disponível neste registro.</p></div> : <div className="table-wrap"><table><thead><tr><th>Linha</th><th>Resultado</th><th>Dados</th><th>Observação</th></tr></thead><tbody>{job.rows.map(row => <tr key={row.id ?? row.rowNumber}><td data-label="Linha">{row.rowNumber}</td><td data-label="Resultado"><span className={`status-badge ${row.status === "rejected" ? "cancelled" : row.status === "skipped" ? "pending" : "active"}`}>{row.status === "created" ? "Criada" : row.status === "updated" ? "Atualizada" : row.status === "skipped" ? "Ignorada" : "Rejeitada"}</span></td><td data-label="Dados"><span className="import-cell-summary">{Object.values(row.rawData ?? {}).filter(Boolean).slice(0, 3).join(" · ") || "—"}</span></td><td data-label="Observação">{row.errors ? Object.values(row.errors).join(" ") : "Processada sem erros"}</td></tr>)}</tbody></table></div>}</section>
      </div><aside className="sale-financial-summary"><div className="sale-financial-heading"><span>Resumo do processamento</span><p>A importação mantém rastreabilidade por arquivo e por linha.</p></div><dl><div><dt>Criados</dt><dd>{job.createdCount}</dd></div><div><dt>Atualizados</dt><dd>{job.updatedCount}</dd></div><div><dt>Ignorados</dt><dd>{job.skippedCount}</dd></div><div><dt>Rejeitados</dt><dd>{job.rejectedCount}</dd></div>{job.expectedTotal != null && <><div><dt>Total informado</dt><dd>{currency(job.expectedTotal)}</dd></div><div><dt>Total conciliado</dt><dd>{currency(job.reconciledTotal)}</dd></div><div className={Number(job.divergence) === 0 ? "discount" : ""}><dt>Diferença</dt><dd>{currency(job.divergence)}</dd></div></>}</dl><div className={`sale-detail-state ${job.status === "reverted" ? "cancelled" : "draft"}`}><AppIcon name="shield" /><p>{job.status === "reverted" ? "Esta importação já foi revertida e permanece disponível para auditoria." : "A reversão preserva este histórico e compensa ou inativa somente os registros criados."}</p></div>{job.status === "completed" && <button className="button button-danger import-revert-button" type="button" onClick={() => setConfirmRevert(true)}>Reverter importação</button>}</aside></div>
    </DialogContent>
    <Dialog open={confirmRevert} onOpenChange={setConfirmRevert}><DialogContent><div className="dialog-heading"><div><DialogTitle>Reverter esta importação?</DialogTitle><DialogDescription>Os registros criados serão inativados ou compensados. O arquivo, as linhas e a auditoria não serão apagados.</DialogDescription></div><DialogClose className="dialog-close" aria-label="Fechar">×</DialogClose></div><div className="dialog-actions"><DialogClose asChild><button className="button button-secondary" type="button">Voltar</button></DialogClose><button className="button button-danger" type="button" disabled={pending} onClick={() => { setConfirmRevert(false); onRevert(); }}>{pending ? "Revertendo…" : "Confirmar reversão"}</button></div></DialogContent></Dialog>
  </>;
}

export function ImportWorkspace({ initialJobs, initialOpen = false }: { initialJobs: Job[]; initialOpen?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"history" | "setup" | "review" | "result">(initialOpen ? "setup" : "history");
  const [type, setType] = useState<ImportType>("product");
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<Preview>();
  const [expectedTotal, setExpectedTotal] = useState("");
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string>();
  const [actions, setActions] = useState<Record<number, DuplicateAction>>({});
  const [detail, setDetail] = useState<Job>();
  const [reportOpen, setReportOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const confirmKey = useRef<string | null>(null);
  const revertKey = useRef<string | null>(null);

  const filteredJobs = useMemo(() => initialJobs.filter(job => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    const label = typeOptions[job.entityType as ImportType]?.label ?? job.entityType;
    return (!term || `${job.fileName ?? ""} ${label}`.toLocaleLowerCase("pt-BR").includes(term)) && (statusFilter === "all" || job.status === statusFilter) && (typeFilter === "all" || job.entityType === typeFilter);
  }), [initialJobs, query, statusFilter, typeFilter]);
  const completedCount = initialJobs.filter(job => job.status === "completed").length;
  const totalCreated = initialJobs.reduce((sum, job) => sum + job.createdCount, 0);
  const totalRejected = initialJobs.reduce((sum, job) => sum + job.rejectedCount, 0);
  const totalPages = Math.max(Math.ceil(filteredJobs.length / pageSize), 1);
  const visibleJobs = filteredJobs.slice((Math.min(page, totalPages) - 1) * pageSize, Math.min(page, totalPages) * pageSize);

  function resetFlow(nextMode: "history" | "setup" = "history") {
    setMode(nextMode); setFile(undefined); setPreview(undefined); setExpectedTotal(""); setActions({}); setError(undefined); confirmKey.current = null;
    if (nextMode === "history") router.replace("/importacoes", { scroll: false });
  }

  function changeType(nextType: ImportType) {
    setType(nextType); setFile(undefined); setPreview(undefined); setExpectedTotal(""); setActions({}); setError(undefined); confirmKey.current = null;
  }

  async function download() {
    setError(undefined);
    const response = await fetch(`/api/imports/${type}/template`);
    if (!response.ok) return setError("Não foi possível baixar o modelo.");
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url; link.download = `${type}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  async function simulate(selected?: File) {
    setFile(selected); setPreview(undefined); setActions({}); setError(undefined); confirmKey.current = null;
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".csv")) return setError("Selecione um arquivo no formato CSV.");
    setPending(true);
    const data = new FormData(); data.append("file", selected);
    try {
      const response = await fetch(`/api/imports/${type}/preview`, { method: "POST", body: data });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(body, "Não foi possível validar o arquivo."));
      setPreview(body); setMode("review");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível validar o arquivo."); }
    finally { setPending(false); }
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) { void simulate(event.target.files?.[0]); }
  function dropFile(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); setDragging(false); void simulate(event.dataTransfer.files?.[0]); }

  async function confirm() {
    if (!preview || !file) return;
    if (preview.rows.some(row => row.duplicateMatch && !actions[row.rowNumber])) return setError("Escolha como tratar cada duplicidade antes de confirmar.");
    setPending(true); setError(undefined);
    try {
      const rows = preview.rows.map(row => ({ cells: row.cells ?? {}, duplicateAction: row.duplicateMatch ? actions[row.rowNumber] : undefined }));
      confirmKey.current ??= crypto.randomUUID();
      const payload = { fileName: file.name, rows, ...(financialTypes.has(type) && expectedTotal ? { expectedTotal: Number(expectedTotal) } : {}) };
      const response = await fetch(`/api/imports/${type}/confirm`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": confirmKey.current }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(body, "Não foi possível confirmar a importação."));
      setDetail(body); setMode("result"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a importação."); }
    finally { setPending(false); }
  }

  async function openDetail(id: string) {
    setPending(true); setError(undefined);
    try {
      const response = await fetch(`/api/imports/${id}`); const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(body, "Não foi possível carregar o relatório."));
      setDetail(body); setReportOpen(true); revertKey.current = null;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar o relatório."); }
    finally { setPending(false); }
  }

  async function revert() {
    if (!detail) return;
    setPending(true); setError(undefined);
    try {
      revertKey.current ??= crypto.randomUUID();
      const response = await fetch(`/api/imports/${detail.id}/revert`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": revertKey.current }, body: "{}" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(body, "Não foi possível reverter a importação."));
      setDetail(current => current ? { ...current, ...body } : body); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível reverter a importação."); }
    finally { setPending(false); }
  }

  if (mode === "history") return <div className="import-workspace">
    <div className="page-heading"><div><h1>Importações</h1><p>Migre dados com prévia, validação por linha e histórico reversível.</p></div><div className="page-actions"><button className="button button-primary compact-button" type="button" onClick={() => resetFlow("setup")}><AppIcon name="plus" /> Nova importação</button></div></div>
    <section className="listing-metrics import-metrics"><article className="listing-metric"><span className="listing-metric-icon"><AppIcon name="imports" /></span><div><span>Importações ativas</span><strong>{completedCount}</strong><small>Disponíveis no histórico</small></div></article><article className="listing-metric"><span className="listing-metric-icon"><AppIcon name="products" /></span><div><span>Registros criados</span><strong>{totalCreated}</strong><small>Em todos os arquivos</small></div></article><article className="listing-metric"><span className="listing-metric-icon warning"><AppIcon name="shield" /></span><div><span>Linhas rejeitadas</span><strong>{totalRejected}</strong><small>Com inconsistências</small></div></article></section>
    <section className="data-card import-history"><div className="directory-filters listing-search import-history-filters"><div className="search-field"><AppIcon name="search" /><input aria-label="Buscar importação" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar por arquivo ou tipo" /></div><SelectControl aria-label="Filtrar por tipo" value={typeFilter} onChange={event => { setTypeFilter(event.target.value); setPage(1); }}><option value="all">Todos os tipos</option>{typeEntries.map(([value, option]) => <option value={value} key={value}>{option.label}</option>)}</SelectControl><SelectControl aria-label="Filtrar por status" value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1); }}><option value="all">Todos os status</option><option value="completed">Concluídas</option><option value="reverted">Revertidas</option></SelectControl></div>
      {error && <p className="form-error import-page-error" role="alert">{error}</p>}
      <div className="table-wrap"><table><thead><tr><th>Arquivo</th><th>Tipo</th><th>Processamento</th><th>Status</th><th>Data</th><th className="table-actions-column">Ações</th></tr></thead><tbody>{filteredJobs.length === 0 ? <tr className="table-empty-row"><td className="table-empty-cell" colSpan={6}><span className="table-empty-icon"><AppIcon name="imports" /></span><strong>{initialJobs.length === 0 ? "Nenhuma importação realizada" : "Nenhum resultado encontrado"}</strong><p>{initialJobs.length === 0 ? "Inicie uma importação usando um dos modelos validados pelo sistema." : "Altere os filtros ou o termo da busca para encontrar outro arquivo."}</p>{initialJobs.length === 0 && <button className="button button-primary compact-button" type="button" onClick={() => resetFlow("setup")}><AppIcon name="plus" /> Nova importação</button>}</td></tr> : visibleJobs.map(job => <tr key={job.id}><td data-label="Arquivo"><strong>{job.fileName ?? "Planilha sem nome"}</strong><small className="table-detail">{job.totalRows} {job.totalRows === 1 ? "linha" : "linhas"}</small></td><td data-label="Tipo">{typeOptions[job.entityType as ImportType]?.label ?? job.entityType}</td><td data-label="Processamento"><strong>{job.createdCount + job.updatedCount}</strong> processadas<small className="table-detail">{job.rejectedCount} rejeitadas</small></td><td data-label="Status"><span className={`status-badge ${job.status === "completed" ? "active" : "cancelled"}`}>{statusLabel(job.status)}</span></td><td data-label="Data">{dateTime(job.createdAt)}</td><td className="table-actions-cell" data-label="Ações"><DropdownMenu><DropdownMenuTrigger asChild><button className="row-menu-trigger" type="button" aria-label={`Ações da importação ${job.fileName ?? "sem nome"}`}><AppIcon name="more" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" sideOffset={6}><DropdownMenuItem className="dropdown-item view" onSelect={() => openDetail(job.id)}><span><AppIcon name="eye" /></span><div><strong>Ver relatório</strong><small>Consultar resultado por linha</small></div></DropdownMenuItem></DropdownMenuContent></DropdownMenu></td></tr>)}</tbody></table></div>
      {filteredJobs.length > pageSize && <nav className="page-actions listing-pagination import-pagination" aria-label="Paginação das importações"><button className="button button-secondary compact-button" type="button" disabled={page <= 1} onClick={() => setPage(current => Math.max(current - 1, 1))}>Anterior</button><span className="user-chip" aria-current="page">Página {Math.min(page, totalPages)} de {totalPages}</span><button className="button button-secondary compact-button" type="button" disabled={page >= totalPages} onClick={() => setPage(current => Math.min(current + 1, totalPages))}>Próxima</button></nav>}
    </section>
    <Dialog open={reportOpen} onOpenChange={setReportOpen}>{detail && <ImportReport job={detail} pending={pending} onClose={() => setReportOpen(false)} onRevert={revert} />}</Dialog>
  </div>;

  const step = mode === "setup" ? 1 : mode === "review" ? 2 : 3;
  return <div className="import-workspace import-flow">
    <div className="wizard-heading import-flow-heading"><div><button className="wizard-back-link" type="button" onClick={() => resetFlow()}><span>←</span> Voltar para importações</button><h1>{mode === "result" ? "Importação concluída" : "Nova importação"}</h1><p>{mode === "setup" ? "Prepare o arquivo e valide os dados antes de criar qualquer registro." : mode === "review" ? "Confira as inconsistências e decida como tratar possíveis duplicidades." : "Confira o resultado do processamento e as divergências encontradas."}</p></div><button className="close-button" type="button" aria-label="Fechar" onClick={() => resetFlow()}>×</button></div>
    <ImportSteps step={step} />
    {error && <p className="form-error import-flow-error" role="alert">{error}</p>}

    {mode === "setup" && <div className="import-flow-layout"><main className="import-flow-main">
      <section className="import-stage-card"><div className="wizard-stage-heading"><span>1</span><div><h2>Escolha o tipo de dado</h2><p>O modelo e as validações mudam conforme o conteúdo selecionado.</p></div></div><div className="import-type-grid">{typeEntries.map(([value, option]) => <label className={`import-type-card ${type === value ? "selected" : ""}`} key={value}><input type="radio" name="import-type" value={value} checked={type === value} onChange={() => changeType(value)} /><span className="import-type-icon"><AppIcon name={option.icon} /></span><span><strong>{option.label}</strong><small>{option.description}</small></span><span className="import-radio" /></label>)}</div></section>
      <section className="import-stage-card"><div className="wizard-stage-heading"><span>2</span><div><h2>Prepare e envie o arquivo</h2><p>Use o modelo para garantir que os cabeçalhos sejam reconhecidos.</p></div></div><div className="import-template-callout"><span><AppIcon name="imports" /></span><div><strong>Modelo de {typeOptions[type].label.toLocaleLowerCase("pt-BR")}</strong><p>Baixe o CSV, preencha sem alterar os títulos das colunas e salve no mesmo formato.</p></div><button className="button button-secondary compact-button" type="button" onClick={download}>Baixar modelo CSV</button></div>
        {financialTypes.has(type) && <div className="import-reconciliation"><CurrencyInput label="Total esperado (opcional)" value={expectedTotal} onValueChange={setExpectedTotal} hint="Usado para comparar o total original com a soma importada." min={0} /></div>}
        <label className={`import-dropzone ${dragging ? "dragging" : ""}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={dropFile}><input type="file" accept=".csv,text/csv" onChange={chooseFile} disabled={pending} /><span className="import-dropzone-icon"><AppIcon name="imports" /></span><strong>{pending ? "Validando arquivo…" : "Arraste seu arquivo CSV aqui"}</strong><p>ou clique para procurar no computador</p><small>Tamanho recomendado: até 5 MB</small></label>
      </section>
    </main><aside className="import-help-card"><span className="import-help-icon"><AppIcon name="shield" /></span><h2>Importação segura</h2><p>Nenhum cadastro é criado nesta etapa. Primeiro o sistema simula o arquivo e mostra o resultado de cada linha.</p><ul><li>Validação de campos obrigatórios</li><li>Detecção de produtos duplicados</li><li>Isolamento por empresa</li><li>Histórico para auditoria</li></ul></aside></div>}

    {mode === "review" && preview && <div className="import-review-layout"><main className="import-flow-main"><section className="import-stage-card import-preview-card"><div className="wizard-stage-heading"><span>2</span><div><h2>Revise a prévia</h2><p>{file?.name} · {preview.rows.length} {preview.rows.length === 1 ? "linha analisada" : "linhas analisadas"}</p></div><button className="button button-secondary compact-button" type="button" onClick={() => { setMode("setup"); setPreview(undefined); setFile(undefined); }}>Trocar arquivo</button></div><div className="table-wrap"><table><thead><tr><th>Linha</th><th>Resultado</th><th>Dados identificados</th><th>Detalhe ou decisão</th></tr></thead><tbody>{preview.rows.map(row => <tr key={row.rowNumber}><td data-label="Linha">{row.rowNumber}</td><td data-label="Resultado"><span className={`status-badge ${row.errors ? "cancelled" : row.duplicateMatch ? "pending" : "active"}`}>{row.errors ? "Com erro" : row.duplicateMatch ? "Revisar" : "Pronta"}</span></td><td data-label="Dados"><span className="import-cell-summary">{Object.values(row.cells ?? {}).filter(Boolean).slice(0, 4).join(" · ") || "Linha vazia"}</span></td><td data-label="Detalhe">{row.errors ? <ul className="import-error-list">{Object.entries(row.errors).map(([field, message]) => <li key={field}><strong>{field === "_linha" ? "Linha" : field}:</strong> {message}</li>)}</ul> : row.duplicateMatch ? <div className="import-decision"><span>Já existe: <strong>{row.duplicateMatch.entityLabel}</strong></span><SelectControl aria-label={`Decisão para linha ${row.rowNumber}`} value={actions[row.rowNumber] ?? ""} onChange={event => setActions(current => ({ ...current, [row.rowNumber]: event.target.value as DuplicateAction }))}><option value="">Escolha uma ação</option><option value="use_existing">Usar cadastro existente</option><option value="create_new">Criar novo cadastro</option><option value="register_alias">Registrar nome como alias</option><option value="ignore">Ignorar esta linha</option></SelectControl></div> : <span className="import-ready-copy">Pronta para importar</span>}</td></tr>)}</tbody></table></div></section></main>
      <aside className="import-review-summary"><div><span className="import-help-icon"><AppIcon name="imports" /></span><h2>Resumo da validação</h2><p>Confira o impacto antes de confirmar.</p></div><dl><div><dt>Prontas para criar</dt><dd>{preview.summary.toCreate}</dd></div><div><dt>Exigem decisão</dt><dd>{preview.summary.toReview}</dd></div><div><dt>Serão rejeitadas</dt><dd>{preview.summary.toReject}</dd></div>{financialTypes.has(type) && expectedTotal && <div><dt>Total informado</dt><dd>{currency(expectedTotal)}</dd></div>}</dl>{preview.summary.toReject > 0 && <div className="import-warning"><AppIcon name="shield" /><p>Linhas com erro não serão importadas. As demais podem ser processadas normalmente.</p></div>}<button className="button button-primary" type="button" disabled={pending} onClick={confirm}>{pending ? "Importando…" : "Confirmar importação"} <AppIcon name="chevronRight" /></button><button className="button button-secondary" type="button" disabled={pending} onClick={() => setMode("setup")}>Voltar e ajustar</button></aside>
    </div>}

    {mode === "result" && detail && <div className="import-result"><section className="import-result-hero"><span><AppIcon name="shield" /></span><div><small>Processamento concluído</small><h2>{detail.rejectedCount === 0 ? "Arquivo importado com sucesso" : "Importação concluída com ressalvas"}</h2><p>{detail.fileName ?? "Planilha sem nome"} foi processado e já está registrado no histórico.</p></div></section><section className="listing-metrics import-result-metrics"><article><div><small>Registros criados</small><strong>{detail.createdCount}</strong><p>Novos cadastros</p></div></article><article><div><small>Atualizados</small><strong>{detail.updatedCount}</strong><p>Cadastros existentes</p></div></article><article><div><small>Ignorados</small><strong>{detail.skippedCount}</strong><p>Sem alteração</p></div></article><article><div><small>Rejeitados</small><strong>{detail.rejectedCount}</strong><p>Com inconsistência</p></div></article></section>{detail.expectedTotal != null && <section className="import-reconciliation-result"><div><span>Total informado</span><strong>{currency(detail.expectedTotal)}</strong></div><div><span>Total conciliado</span><strong>{currency(detail.reconciledTotal)}</strong></div><div className={Number(detail.divergence) === 0 ? "matched" : "diverged"}><span>Diferença</span><strong>{currency(detail.divergence)}</strong></div></section>}<div className="import-result-actions"><button className="button button-secondary" type="button" onClick={() => setReportOpen(true)}>Ver relatório detalhado</button><button className="button button-primary compact-button" type="button" onClick={() => resetFlow()}>Concluir e voltar ao histórico</button></div></div>}
    <Dialog open={reportOpen} onOpenChange={setReportOpen}>{detail && <ImportReport job={detail} pending={pending} onClose={() => setReportOpen(false)} onRevert={revert} />}</Dialog>
  </div>;
}
