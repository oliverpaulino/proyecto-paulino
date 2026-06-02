import { EmployeeContactsView } from "./components/employeeContactsView";

export default async function EmployeeContactsPage({ params }: { params: Promise<{ id: string }> }) {
   const { id } = await params;

   return (
      <div className="p-6">
         <EmployeeContactsView empleadoId={id} />
      </div>
   );
}
