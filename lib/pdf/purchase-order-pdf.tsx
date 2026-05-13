import path from 'path'
import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

import type { PurchaseOrderDetail, PurchaseOrderSettings } from '@/lib/queries/purchase-orders'

Font.register({
    family: 'NotoSansJP',
    src: path.join(process.cwd(), 'public/fonts/NotoSansJP-Regular.ttf'),
})

const C = '#111111'
const BORDER = { borderWidth: 0.5, borderColor: C }

// Rows that fit per page (conservative estimates based on A4 content height ~762pt usable)
// Page 1 header overhead: ~193pt; table marginBottom: 10pt; row height: 22pt
const ROWS_SINGLE_PAGE = 18  // page 1 when notes also on this page (~90pt notes overhead)
const ROWS_PAGE_1_MULTI = 22 // page 1 when multi-page — notes move to last page, ~90pt freed
const ROWS_PAGE_N = 25       // continuation pages: ~28pt cont-header+table-header overhead

const styles = StyleSheet.create({
    page: {
        fontFamily: 'NotoSansJP',
        fontSize: 8,
        paddingTop: 40,
        paddingBottom: 40,
        paddingHorizontal: 45,
        color: C,
    },
    title: { fontSize: 20, textAlign: 'center', letterSpacing: 10, marginBottom: 22 },

    // Two-column section
    twoCol: { flexDirection: 'row', gap: 28, marginBottom: 18 },
    colLeft: { flex: 1 },
    colRight: { width: 150 },

    // Supplier
    supplierRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
    supplierName: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: C,
        paddingBottom: 3,
        paddingHorizontal: 4,
        textAlign: 'center',
        fontSize: 11,
        fontWeight: 'bold',
    },
    honorific: { marginLeft: 6, marginBottom: 2, fontSize: 8 },

    // Meta rows
    metaRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 5 },
    metaLabel: { width: 48, color: '#888', fontSize: 7 },
    metaValue: {
        flex: 1,
        borderBottomWidth: 0.5,
        borderBottomColor: '#bbb',
        paddingBottom: 2,
        paddingHorizontal: 4,
    },
    introText: { marginTop: 10, fontSize: 7, color: '#555' },

    // Sender
    senderBold: { fontWeight: 'bold', fontSize: 9, marginBottom: 4 },
    senderLine: { marginBottom: 3, fontSize: 8 },

    // Continuation header (page 2+)
    contHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, fontSize: 7, color: '#888' },

    // Table
    table: { marginBottom: 10 },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: C,
        ...BORDER,
    },
    tableRow: {
        flexDirection: 'row',
        minHeight: 22,
        borderLeftWidth: 0.5,
        borderLeftColor: C,
        borderRightWidth: 0.5,
        borderRightColor: C,
        borderTopWidth: 0.5,
        borderTopColor: C,
    },
    tableLastRow: {
        borderBottomWidth: 0.5,
        borderBottomColor: C,
    },
    thItem: { flex: 1, padding: 4, color: '#fff', textAlign: 'center' },
    thQty: { width: 48, padding: 4, color: '#fff', textAlign: 'center', borderLeftWidth: 0.5, borderLeftColor: '#fff' },
    thUnit: { width: 44, padding: 4, color: '#fff', textAlign: 'center', borderLeftWidth: 0.5, borderLeftColor: '#fff' },
    thMemo: { width: 100, padding: 4, color: '#fff', textAlign: 'center', borderLeftWidth: 0.5, borderLeftColor: '#fff' },
    tdItem: { flex: 1, padding: 4 },
    tdQty: { width: 48, padding: 4, textAlign: 'right', borderLeftWidth: 0.5, borderLeftColor: '#ccc' },
    tdUnit: { width: 44, padding: 4, textAlign: 'center', borderLeftWidth: 0.5, borderLeftColor: '#ccc' },
    tdMemo: { width: 100, padding: 4, color: '#666', borderLeftWidth: 0.5, borderLeftColor: '#ccc' },

    // Notes
    notesTitleBar: {
        backgroundColor: C,
        color: '#fff',
        textAlign: 'center',
        paddingVertical: 4,
        fontSize: 8,
        ...BORDER,
    },
    notesBox: {
        minHeight: 60,
        padding: 6,
        fontSize: 7,
        color: '#555',
        borderLeftWidth: 0.5,
        borderLeftColor: C,
        borderRightWidth: 0.5,
        borderRightColor: C,
        borderBottomWidth: 0.5,
        borderBottomColor: C,
    },
})

type Line = PurchaseOrderDetail['lines'][number]
type EmptyLine = { id: string; item_name: string; order_quantity: null; needed_quantity: null; package_size: null; package_label: null; unit: null; memo: null }
type AnyLine = Line | EmptyLine

function formatQty(line: AnyLine): string {
    const qty = (line as Line).order_quantity ?? (line as Line).needed_quantity
    if (qty === null || qty === undefined) return ''
    return qty.toLocaleString('ja-JP')
}

function formatUnit(line: AnyLine): string {
    if ((line as Line).package_size) return (line as Line).package_label ?? (line as Line).unit ?? ''
    return (line as Line).unit ?? ''
}

function emptyRows(count: number): EmptyLine[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `empty-${i}`,
        item_name: '',
        order_quantity: null,
        needed_quantity: null,
        package_size: null,
        package_label: null,
        unit: null,
        memo: null,
    }))
}

function TableHeader() {
    return (
        <View style={styles.tableHeaderRow}>
            <Text style={styles.thItem}>項目</Text>
            <Text style={styles.thQty}>数量</Text>
            <Text style={styles.thUnit}>単位</Text>
            <Text style={styles.thMemo}>備考</Text>
        </View>
    )
}

function TableRows({ lines }: { lines: AnyLine[] }) {
    return (
        <>
            {lines.map((line, idx) => (
                <View
                    key={line.id}
                    style={[styles.tableRow, idx === lines.length - 1 ? styles.tableLastRow : {}]}
                    wrap={false}
                >
                    <Text style={styles.tdItem}>{line.item_name}</Text>
                    <Text style={styles.tdQty}>{formatQty(line)}</Text>
                    <Text style={styles.tdUnit}>{formatUnit(line)}</Text>
                    <Text style={styles.tdMemo}>{line.memo ?? ''}</Text>
                </View>
            ))}
        </>
    )
}

interface Props {
    order: PurchaseOrderDetail
    settings: PurchaseOrderSettings | null
}

function PurchaseOrderDocument({ order, settings }: Props) {
    const sender = {
        company_name: settings?.company_name ?? 'よしや',
        postal_code: settings?.postal_code ?? null,
        address: settings?.address ?? null,
        tel: settings?.tel ?? null,
        fax: settings?.fax ?? null,
        email: settings?.email ?? null,
        contact_person: settings?.contact_person ?? null,
        show_postal_code: settings?.show_postal_code ?? true,
        show_address: settings?.show_address ?? true,
        show_tel: settings?.show_tel ?? true,
        show_fax: settings?.show_fax ?? true,
        show_email: settings?.show_email ?? true,
        show_contact_person: settings?.show_contact_person ?? true,
    }

    const formattedDate = format(parseISO(order.order_date), 'yyyy年M月d日 (EEE)', { locale: ja })

    const realLines = order.lines.filter((l) => l.item_name.trim() !== '')

    // Chunk lines into pages
    type Chunk = { lines: AnyLine[]; isFirst: boolean; isLast: boolean }
    const chunks: Chunk[] = []

    if (realLines.length <= ROWS_SINGLE_PAGE) {
        // Everything fits on one page including notes — pad to 12 blank rows
        const padded: AnyLine[] = [...realLines, ...emptyRows(Math.max(0, 12 - realLines.length))]
        chunks.push({ lines: padded, isFirst: true, isLast: true })
    } else if (realLines.length <= ROWS_PAGE_1_MULTI) {
        // 21–24 items: all rows fit on page 1 but notes don't (777pt > 762pt available)
        // → rows on page 1, dedicated notes-only page 2
        chunks.push({ lines: realLines, isFirst: true, isLast: false })
        chunks.push({ lines: [], isFirst: false, isLast: true })
    } else {
        // 25+ items: page 1 takes ROWS_PAGE_1_MULTI rows; subsequent pages take ROWS_PAGE_N each.
        // Notes always fit with the last row chunk on a continuation page
        // (≤25 rows × 22pt + ~28pt overhead + ~90pt notes = 668pt < 762pt).
        chunks.push({ lines: realLines.slice(0, ROWS_PAGE_1_MULTI), isFirst: true, isLast: false })
        let offset = ROWS_PAGE_1_MULTI
        while (offset < realLines.length) {
            const slice = realLines.slice(offset, offset + ROWS_PAGE_N)
            offset += ROWS_PAGE_N
            chunks.push({ lines: slice, isFirst: false, isLast: offset >= realLines.length })
        }
    }

    const isMultiPage = chunks.length > 1

    return (
        <Document>
            {chunks.map((chunk, pageIdx) => (
                <Page key={pageIdx} size="A4" style={styles.page}>
                    {/* Compact reference header: shown on every page when multi-page */}
                    {isMultiPage && (
                        <View style={styles.contHeader}>
                            <Text>
                                {order.document_no}　{order.supplier_name} 御中{!chunk.isFirst ? '　（続き）' : ''}
                            </Text>
                            <Text>{pageIdx + 1} / {chunks.length}</Text>
                        </View>
                    )}

                    {/* Full document header: page 1 only */}
                    {chunk.isFirst && (
                        <>
                            <Text style={styles.title}>発 注 書</Text>

                            <View style={styles.twoCol}>
                                <View style={styles.colLeft}>
                                    <View style={styles.supplierRow}>
                                        <Text style={styles.supplierName}>{order.supplier_name}</Text>
                                        <Text style={styles.honorific}>御中</Text>
                                    </View>
                                    <View style={styles.metaRow}>
                                        <Text style={styles.metaLabel}>件名</Text>
                                        <Text style={styles.metaValue}>{order.subject}</Text>
                                    </View>
                                    <View style={styles.metaRow}>
                                        <Text style={styles.metaLabel}>発注No.</Text>
                                        <Text style={styles.metaValue}>{order.document_no}</Text>
                                    </View>
                                    <View style={styles.metaRow}>
                                        <Text style={styles.metaLabel}>発注日</Text>
                                        <Text style={styles.metaValue}>{formattedDate}</Text>
                                    </View>
                                    <Text style={styles.introText}>下記のとおり発注いたします。</Text>
                                </View>

                                <View style={styles.colRight}>
                                    <Text style={styles.senderBold}>{sender.company_name}</Text>
                                    {sender.show_postal_code && sender.postal_code ? <Text style={styles.senderLine}>〒{sender.postal_code.replace(/^〒/, '')}</Text> : null}
                                    {sender.show_address && sender.address ? <Text style={styles.senderLine}>{sender.address}</Text> : null}
                                    {sender.show_tel && sender.tel ? <Text style={styles.senderLine}>TEL：{sender.tel}</Text> : null}
                                    {sender.show_fax && sender.fax ? <Text style={styles.senderLine}>FAX：{sender.fax}</Text> : null}
                                    {sender.show_email && sender.email ? <Text style={styles.senderLine}>EMAIL：{sender.email}</Text> : null}
                                    {sender.show_contact_person && sender.contact_person ? <Text style={styles.senderLine}>担当：{sender.contact_person}</Text> : null}
                                </View>
                            </View>
                        </>
                    )}

                    {chunk.lines.length > 0 && (
                        <View style={styles.table}>
                            <TableHeader />
                            <TableRows lines={chunk.lines} />
                        </View>
                    )}

                    {chunk.isLast && (
                        <View wrap={false}>
                            <Text style={styles.notesTitleBar}>特記事項</Text>
                            <View style={styles.notesBox}>
                                <Text>{order.notes?.trim() ?? ''}</Text>
                            </View>
                        </View>
                    )}
                </Page>
            ))}
        </Document>
    )
}

export async function generatePurchaseOrderPdf(
    order: PurchaseOrderDetail,
    settings: PurchaseOrderSettings | null
): Promise<Buffer> {
    const { renderToBuffer } = await import('@react-pdf/renderer')
    return renderToBuffer(<PurchaseOrderDocument order={order} settings={settings} />)
}
