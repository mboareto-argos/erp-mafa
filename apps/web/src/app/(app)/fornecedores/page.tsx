import { ContactDirectory } from "@/components/contacts/contact-directory";
import { backendAuthenticatedRequest,getSession } from "@/lib/session";
type Supplier={id:string;name:string;email:string|null;phone:string|null;whatsapp:string|null;status:string};
export default async function SuppliersPage(){const [contacts,session]=await Promise.all([backendAuthenticatedRequest("/purchasing/suppliers") as Promise<Supplier[]>,getSession() as Promise<{permissions:string[]}|null>]);return <main className="page-content"><div className="page-heading"><div><h1>Fornecedores</h1><p>Organize quem fornece suas mercadorias.</p></div></div><ContactDirectory kind="fornecedor" contacts={contacts} canManage={session?.permissions.includes("manage_purchasing")??false}/></main>}
