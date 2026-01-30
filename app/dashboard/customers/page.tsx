import { CustomersTable } from "@/components/customers/customers-table"
import { customers } from "@/lib/mock-data"
import { AddCustomerForm } from "@/components/customers/add-customer-form"

export default function CustomersPage() {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Customers</h1>
                <AddCustomerForm />
            </div>
            <CustomersTable data={customers} />
        </div>
    )
}
