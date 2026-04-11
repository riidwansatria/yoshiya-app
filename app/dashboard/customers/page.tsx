import { CustomersTable } from "@/components/customers/customers-table"
import { customers } from "@/lib/mock-data"
import { AddCustomerForm } from "@/components/customers/add-customer-form"
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageActions, PageContent } from '@/components/layout/page'

export default function CustomersPage() {
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
