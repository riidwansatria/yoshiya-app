import { CustomersTable } from "@/components/customers/customers-table"
import { customers } from "@/lib/mock-data"
import { AddCustomerForm } from "@/components/customers/add-customer-form"
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageActions, PageContent } from '@/components/layout/page'
import { requirePagePermission } from "@/lib/auth/server"

export default async function CustomersPage() {
    await requirePagePermission("reservations", "reservations.read")

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>Customers</PageTitle>
                </PageHeaderHeading>
                <PageActions>
                    <AddCustomerForm />
                </PageActions>
            </PageHeader>
            <PageContent>
                <CustomersTable data={customers} />
            </PageContent>
        </Page>
    )
}
