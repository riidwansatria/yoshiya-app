import { format, parseISO } from "date-fns"
import { enUS, ja } from "date-fns/locale"
import { getTranslations } from "next-intl/server"
import { Fragment } from "react"

import { AutoPrint } from "@/components/print/auto-print"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getComponentsSummary } from "@/lib/queries/components-summary"
import { getMenusSummary } from "@/lib/queries/menus-summary"
import {
  type AggregatedIngredient,
  getIngredientsSummary,
} from "@/lib/queries/ingredients-summary"

function isUncategorizedCategory(category: string) {
  return category.trim().toLowerCase() === "uncategorized"
}

export default async function KitchenSummaryPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurant: string }>
  searchParams: Promise<{ from?: string; to?: string; locale?: string }>
}) {
  const { restaurant } = await params
  const resolvedSearchParams = await searchParams

  const today = format(new Date(), "yyyy-MM-dd")
  const fromDate = resolvedSearchParams.from || today
  const toDate = resolvedSearchParams.to || fromDate

  const localeCode = resolvedSearchParams.locale === "ja" ? "ja" : "en"
  const dateLocale = localeCode === "ja" ? ja : enUS

  const t = await getTranslations("kitchen.summary")
  const tCommon = await getTranslations("kitchen.common")
  const [groupedIngredients, components, menus] = await Promise.all([
    getIngredientsSummary(restaurant, fromDate, toDate),
    getComponentsSummary(restaurant, fromDate, toDate),
    getMenusSummary(restaurant, fromDate, toDate),
  ])

  const allIngredients = Object.values(groupedIngredients).flat()
  const hasIngredients = allIngredients.length > 0
  const hasComponents = components.length > 0
  const hasMenus = menus.length > 0

  const ingredientsByVendor = allIngredients.reduce<Record<string, AggregatedIngredient[]>>(
    (acc, item) => {
      const key = item.vendor_id ?? "__none__"
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    },
    {},
  )

  const vendorKeys = Object.keys(ingredientsByVendor).sort((a, b) => {
    const aLabel = a === "__none__" ? "" : (ingredientsByVendor[a][0]?.vendor_name ?? "")
    const bLabel = b === "__none__" ? "" : (ingredientsByVendor[b][0]?.vendor_name ?? "")
    return aLabel.localeCompare(bLabel)
  })

  const longDateFormat =
    localeCode === "ja" ? "yyyy年M月d日 (EEE)" : "EEEE, MMMM do, yyyy"
  const generatedFormat = localeCode === "ja" ? "yyyy/MM/dd HH:mm" : "PPpp"
  const isSingleDay = fromDate === toDate
  const formattedRange = isSingleDay
    ? format(parseISO(fromDate), longDateFormat, { locale: dateLocale })
    : `${format(parseISO(fromDate), longDateFormat, { locale: dateLocale })} — ${format(parseISO(toDate), longDateFormat, { locale: dateLocale })}`

  return (
    <div className="mx-auto w-full max-w-5xl p-6 print:max-w-none print:p-0">
      <AutoPrint />

      <div className="mb-8 border-b pb-4 text-center">
        <h1 className="text-3xl font-bold">{t("printHeader")}</h1>
        <p className="text-lg text-muted-foreground">{formattedRange}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("generatedAt")}: {format(new Date(), generatedFormat, { locale: dateLocale })}
        </p>
      </div>

      {hasIngredients && (
        <section className="mb-10">
          <h2 className="mb-4 border-b pb-2 text-xl font-bold">{t("ingredientsTab")}</h2>
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-border hover:bg-transparent">
                  <TableHead className="h-9 border-b-2 border-border bg-background font-bold text-foreground">
                    {t("ingredientColumn")}
                  </TableHead>
                  <TableHead className="h-9 border-b-2 border-border bg-background font-bold text-foreground">
                    {tCommon("category")}
                  </TableHead>
                  <TableHead className="h-9 w-20 border-b-2 border-border bg-background text-right font-bold text-foreground">
                    {t("needColumn")}
                  </TableHead>
                  <TableHead className="h-9 w-14 border-b-2 border-border bg-background text-right font-bold text-foreground">
                    {t("orderColumn")}
                  </TableHead>
                  <TableHead className="h-9 border-b-2 border-border bg-background pl-2 font-bold text-foreground">
                    {t("packColumn")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorKeys.map((vendorKey) => (
                  <Fragment key={vendorKey}>
                    <TableRow className="break-after-avoid bg-muted hover:bg-muted">
                      <TableCell
                        colSpan={5}
                        className="px-2 py-2 text-sm font-medium text-muted-foreground/70"
                      >
                        {vendorKey === "__none__" ? tCommon("none") : (ingredientsByVendor[vendorKey][0]?.vendor_name ?? tCommon("none"))}
                      </TableCell>
                    </TableRow>
                    {ingredientsByVendor[vendorKey].map((item) => {
                      const hasPack =
                        item.packages_needed !== null && item.package_size != null
                      const category = item.category?.trim() || ""
                      return (
                        <TableRow key={item.ingredient_id} className="break-inside-avoid">
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {isUncategorizedCategory(category) ? tCommon("none") : category || tCommon("none")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {item.total_quantity} {item.unit}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-bold">
                            {hasPack ? item.packages_needed : "—"}
                          </TableCell>
                          <TableCell className="pl-2 text-xs text-muted-foreground">
                            {hasPack
                              ? `× ${item.package_size}${item.unit} ${item.package_label?.trim() || t("defaultPackLabel")}`
                              : null}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {hasComponents && (
        <section className="mb-10">
          <h2 className="mb-4 border-b pb-2 text-xl font-bold">{t("componentsTab")}</h2>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-border hover:bg-transparent">
                  <TableHead className="h-9 border-b-2 border-border bg-background font-bold text-foreground">
                    {t("componentColumn")}
                  </TableHead>
                  <TableHead className="h-9 w-32 border-b-2 border-border bg-background text-right font-bold text-foreground">
                    {t("totalQtyColumn")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.map((comp) => (
                  <TableRow key={comp.component_id}>
                    <TableCell className="font-medium">
                      {comp.name}
                      {comp.description && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {comp.description}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {comp.total_quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {hasMenus && (
        <section>
          <h2 className="mb-4 border-b pb-2 text-xl font-bold">{t("menusTab")}</h2>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-border hover:bg-transparent">
                  <TableHead className="h-9 border-b-2 border-border bg-background font-bold text-foreground">
                    {t("menuColumn")}
                  </TableHead>
                  <TableHead className="h-9 w-32 border-b-2 border-border bg-background text-right font-bold text-foreground">
                    {t("totalQtyColumn")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menus.map((menu) => (
                  <TableRow key={menu.menu_id}>
                    <TableCell className="font-medium">{menu.name}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {menu.total_quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {!hasIngredients && !hasComponents && !hasMenus && (
        <div className="rounded-md border border-dashed bg-muted/20 p-12 text-center">
          <p className="text-lg text-muted-foreground">{t("noIngredients")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("noIngredientsHint")}</p>
        </div>
      )}
    </div>
  )
}
