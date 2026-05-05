import { format, parseISO } from "date-fns"
import { enUS, ja } from "date-fns/locale"
import { getTranslations } from "next-intl/server"

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
  const tIngredients = await getTranslations("kitchen.ingredients")

  const [groupedIngredients, components, menus] = await Promise.all([
    getIngredientsSummary(restaurant, fromDate, toDate),
    getComponentsSummary(restaurant, fromDate, toDate),
    getMenusSummary(restaurant, fromDate, toDate),
  ])

  const allIngredients = Object.values(groupedIngredients).flat()
  const hasIngredients = allIngredients.length > 0
  const hasComponents = components.length > 0
  const hasMenus = menus.length > 0

  const ingredientsByStore = allIngredients.reduce<Record<string, AggregatedIngredient[]>>(
    (acc, item) => {
      const store = item.store?.trim() || ""
      const storeKey = store || "__none__"

      if (!acc[storeKey]) {
        acc[storeKey] = []
      }

      acc[storeKey].push(item)
      return acc
    },
    {},
  )

  const storeKeys = Object.keys(ingredientsByStore).sort((a, b) => {
    const aLabel = a === "__none__" ? "" : a
    const bLabel = b === "__none__" ? "" : b
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
          <div className="space-y-8">
            {storeKeys.map((storeKey) => (
              <div key={storeKey} className="space-y-2 break-inside-avoid">
                <h3 className="px-1 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {tIngredients("storeLabel")}: {storeKey === "__none__" ? tCommon("none") : storeKey}
                </h3>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("ingredientColumn")}</TableHead>
                        <TableHead>{tCommon("category")}</TableHead>
                        <TableHead className="w-20 text-right">{t("needColumn")}</TableHead>
                        <TableHead className="w-14 text-right">{t("orderColumn")}</TableHead>
                        <TableHead className="pl-2">{t("packColumn")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredientsByStore[storeKey].map((item) => {
                        const hasPack =
                          item.packages_needed !== null && item.package_size != null
                        const category = item.category?.trim() || ""
                        return (
                          <TableRow key={item.ingredient_id}>
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
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {hasComponents && (
        <section className="mb-10">
          <h2 className="mb-4 border-b pb-2 text-xl font-bold">{t("componentsTab")}</h2>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("componentColumn")}</TableHead>
                  <TableHead className="w-32 text-right">{t("totalQtyColumn")}</TableHead>
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
                <TableRow>
                  <TableHead>{t("menuColumn")}</TableHead>
                  <TableHead className="w-32 text-right">{t("totalQtyColumn")}</TableHead>
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