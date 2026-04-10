import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getReservationById } from "@/lib/queries/reservations";

// We use adm-zip to work at the ZIP level instead of exceljs.
// exceljs strips calcChain.xml and corrupts shared formulas on write,
// causing Excel to show a recovery warning. By doing simple string
// replacements on the raw sheet XML, we preserve the file perfectly.
import AdmZip from "adm-zip";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const bookingId = searchParams.get("bookingId");
  const restaurantId = searchParams.get("restaurantId") || "yoshiya";

  if (!bookingId) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  const booking = await getReservationById(bookingId);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Build items from reservation_menus
  const items: any[] = [];
  let index = 1;
  const menuItems = booking.reservation_menus || [];

  const DEFAULT_REBATE = 0.10; // 10% rebate for all items

  menuItems.forEach((menuItem: any) => {
    const qty = menuItem.quantity || booking.party_size;
    const price = menuItem.unit_price || 0;
    items.push({
      id: index++,
      description: menuItem.menu_name || "Menu",
      quantity: qty,
      price: price,
      amount: qty * price,
      taxRate: menuItem.tax_rate,
      rebate: DEFAULT_REBATE,
    });
  });

  if (items.length > 0) {
    items.push({
      id: index++,
      description: "Service Charge",
      quantity: 1,
      price: 5000,
      amount: 5000,
      taxRate: 0.10,
      rebate: DEFAULT_REBATE,
    });
  } else {
    items.push({
      id: 1,
      description: "Banquet Booking",
      quantity: booking.party_size || 1,
      price: 0,
      amount: 0,
      taxRate: 0.10,
      rebate: DEFAULT_REBATE,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  const deposit = booking.status === "deposit_paid" ? 10000 : 0;
  const balanceDue = total - deposit;

  const customerName =
    booking.customers?.name ||
    booking.rep_name ||
    booking.group_name ||
    "";
  const travelAgencyName = booking.agency_name || "";

  const today = new Date();
  const issueDateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;

  // Scalar placeholders — these get replaced anywhere in the sheet XML
  const placeholders: Record<string, string> = {
    "{{customerName}}": escapeXml(customerName),
    "{{travelAgencyName}}": escapeXml(travelAgencyName),
    "{{groupName}}": escapeXml(booking.group_name || ""),
    "{{bookingId}}": escapeXml(`INV-${booking.id.substring(0, 6)}`),
    "{{date}}": escapeXml(booking.date),
    "{{issueDate}}": escapeXml(issueDateStr),
    "{{subtotal}}": String(subtotal),
    "{{tax}}": String(tax),
    "{{total}}": String(total),
    "{{depositPaid}}": String(deposit),
    "{{balanceDue}}": String(balanceDue),
  };

  try {
    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "請求書_テンプレート.xlsx"
    );

    // Read the xlsx as a ZIP
    const zip = new AdmZip(templatePath);

    // Get the sheet XML (typically xl/worksheets/sheet1.xml)
    const sheetEntry = zip.getEntry("xl/worksheets/sheet1.xml");
    if (!sheetEntry) {
      throw new Error("Could not find sheet1.xml in template");
    }
    let sheetXml = sheetEntry.getData().toString("utf8");

    // Also update sharedStrings.xml since Excel stores strings there
    const sharedStringsEntry = zip.getEntry("xl/sharedStrings.xml");
    let sharedStringsXml = sharedStringsEntry
      ? sharedStringsEntry.getData().toString("utf8")
      : null;

    // 1. Replace scalar placeholders in shared strings
    if (sharedStringsXml) {
      for (const [key, val] of Object.entries(placeholders)) {
        while (sharedStringsXml.includes(key)) {
          sharedStringsXml = sharedStringsXml.replace(key, val);
        }
      }

      // 2. Replace item placeholders in shared strings
      // For the fixed-row approach: fill items in order, clear the rest
      let itemIndex = 0;
      // We need to handle {{item.description}}, {{item.quantity}}, {{item.price}}, {{item.amount}}
      // Since shared strings are indexed, each unique placeholder appears once.
      // We replace them with empty strings here and handle via sheet XML instead.
      // Actually for the fixed-row approach, the same placeholder text appears in
      // multiple rows but maps to the SAME shared string index.
      // This means we can't differentiate row 1 vs row 2 from shared strings alone.
      // We need to work at the sheet XML level for item rows.

      zip.updateFile("xl/sharedStrings.xml", Buffer.from(sharedStringsXml, "utf8"));
    }

    // 3. Replace item placeholders directly in the sheet XML
    // For fixed rows, the item placeholders in shared strings all map to the same index.
    // The simplest reliable approach: replace shared string references for item cells
    // with inline string values or numeric values directly in the sheet XML.
    //
    // However, since your placeholders are in shared strings, and each unique placeholder
    // text appears once, ALL rows referencing {{item.description}} share the same string.
    // We need to convert those cells from shared-string to inline-string.
    //
    // This is complex at the XML level. Let's use a hybrid approach:
    // Use exceljs ONLY for cell manipulation, then transplant the modified sheet XML
    // back into the original ZIP.

    // Re-read with exceljs just to get the modified sheet XML
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];

    // Convert shared formulas to independent
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (
          cell.value &&
          typeof cell.value === "object" &&
          ((cell.value as any).sharedFormula !== undefined ||
            (cell.value as any).shareType === "shared")
        ) {
          const resolvedFormula = cell.formula || (cell.value as any).formula;
          if (resolvedFormula) {
            cell.value = { formula: resolvedFormula };
          }
        }
      });
    });

    // Replace scalar placeholders
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.type === ExcelJS.ValueType.String && cell.value) {
          const strValue = cell.value.toString();
          if (placeholders[strValue] !== undefined) {
            cell.value = placeholders[strValue];
            return;
          }
          let newStr = strValue;
          let changed = false;
          for (const [key, val] of Object.entries(placeholders)) {
            while (newStr.includes(key)) {
              newStr = newStr.replace(key, val);
              changed = true;
            }
          }
          if (changed) cell.value = newStr;
        }
      });
    });

    // Fill item rows
    const itemRowNumbers: number[] = [];
    worksheet.eachRow((row, rowNum) => {
      row.eachCell((cell) => {
        if (
          cell.type === ExcelJS.ValueType.String &&
          cell.value?.toString().includes("{{item.")
        ) {
          if (!itemRowNumbers.includes(rowNum)) {
            itemRowNumbers.push(rowNum);
          }
        }
      });
    });
    itemRowNumbers.sort((a, b) => a - b);

    itemRowNumbers.forEach((rowNum, idx) => {
      const row = worksheet.getRow(rowNum);
      const item = items[idx];
      row.eachCell((cell) => {
        if (cell.type === ExcelJS.ValueType.String && cell.value) {
          const text = cell.value.toString();
          if (!text.includes("{{item.")) return;
          if (!item) {
            cell.value = null;
            return;
          }
          if (text === "{{item.quantity}}") cell.value = item.quantity;
          else if (text === "{{item.price}}") cell.value = item.price;
          else if (text === "{{item.amount}}") cell.value = item.amount;
          else if (text === "{{item.description}}") cell.value = item.description;
          else if (text === "{{item.taxRate}}") cell.value = item.taxRate;
          else if (text === "{{item.rebate}}") cell.value = item.rebate;
          else {
            cell.value = text
              .replace(/\{\{item\.description\}\}/g, item.description)
              .replace(/\{\{item\.quantity\}\}/g, item.quantity.toString())
              .replace(/\{\{item\.price\}\}/g, item.price.toString())
              .replace(/\{\{item\.amount\}\}/g, item.amount.toString())
              .replace(/\{\{item\.taxRate\}\}/g, item.taxRate.toString())
              .replace(/\{\{item\.rebate\}\}/g, item.rebate.toString());
          }
        }
      });
    });

    // Write exceljs output to a temporary buffer
    const tempBuffer = await workbook.xlsx.writeBuffer();

    // Extract the modified sheet1.xml and sharedStrings.xml from exceljs output
    const tempZip = new AdmZip(Buffer.from(tempBuffer));
    const newSheetEntry = tempZip.getEntry("xl/worksheets/sheet1.xml");
    const newSharedStringsEntry = tempZip.getEntry("xl/sharedStrings.xml");

    if (!newSheetEntry) {
      throw new Error("Could not find modified sheet1.xml");
    }

    // Transplant the modified files into the original ZIP
    // This preserves calcChain.xml, theme, styles, etc.
    let modifiedSheetXml = newSheetEntry.getData().toString("utf8");

    // Strip cached <v>...</v> from all formula cells.
    // Excel caches formula results in <v> tags. For shared formulas,
    // the stale #VALUE! cache persists even with fullCalcOnLoad.
    // Removing <v> from formula cells forces Excel to compute them fresh.
    modifiedSheetXml = modifiedSheetXml.replace(
      /(<c[^>]*>\s*<f[^\/]*(?:\/>|>[^<]*<\/f>))\s*<v>[^<]*<\/v>/g,
      "$1"
    );

    zip.updateFile("xl/worksheets/sheet1.xml", Buffer.from(modifiedSheetXml, "utf8"));
    if (newSharedStringsEntry) {
      zip.updateFile("xl/sharedStrings.xml", newSharedStringsEntry.getData());
    }

    // Also update styles from exceljs (in case cell types changed)
    const newStylesEntry = tempZip.getEntry("xl/styles.xml");
    if (newStylesEntry) {
      zip.updateFile("xl/styles.xml", newStylesEntry.getData());
    }

    // Remove calcChain.xml since formulas may have changed
    // Excel will regenerate it on open without showing an error
    try {
      zip.deleteFile("xl/calcChain.xml");
    } catch (e) {
      // May not exist
    }

    // Also remove it from [Content_Types].xml
    const contentTypesEntry = zip.getEntry("[Content_Types].xml");
    if (contentTypesEntry) {
      let ct = contentTypesEntry.getData().toString("utf8");
      ct = ct.replace(
        /<Override[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/,
        ""
      );
      zip.updateFile("[Content_Types].xml", Buffer.from(ct, "utf8"));
    }

    // Force Excel to recalculate ALL formulas when the file is opened.
    // Without this, Excel displays stale cached results (#VALUE!) from the template.
    const workbookXmlEntry = zip.getEntry("xl/workbook.xml");
    if (workbookXmlEntry) {
      let wbXml = workbookXmlEntry.getData().toString("utf8");
      if (wbXml.includes("<calcPr")) {
        // Add fullCalcOnLoad to existing calcPr
        wbXml = wbXml.replace(
          /<calcPr/,
          '<calcPr fullCalcOnLoad="1"'
        );
      } else {
        // Insert calcPr before closing </workbook>
        wbXml = wbXml.replace(
          "</workbook>",
          '<calcPr fullCalcOnLoad="1"/></workbook>'
        );
      }
      zip.updateFile("xl/workbook.xml", Buffer.from(wbXml, "utf8"));
    }

    const finalBuffer = zip.toBuffer();

    return new NextResponse(finalBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename="Invoice-${booking.id.substring(0, 8)}.xlsx"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Error generating invoice Excel:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice file" },
      { status: 500 }
    );
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
