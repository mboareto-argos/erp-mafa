import { ContactDirectory } from "@/components/contacts/contact-directory";
import { backendAuthenticatedRequest,getSession } from "@/lib/session";
type Customer={id:string;name:string;email:string|null;phone:string|null;whatsapp:string|null;status:string};
export default async function CustomersPage(){const [contacts,session]=await Promise.all([backendAuthenticatedRequest("/customers") as Promise<Customer[]>,getSession() as Promise<{permissions:string[]}|null>]);return <main className="page-content"><div className="page-heading"><div><h1>Clientes</h1><p>Histórico e relacionamento em um único lugar.</p></div></div><ContactDirectory kind="cliente" contacts={contacts} canManage={session?.permissions.includes("manage_customers")??false}/></main>}
