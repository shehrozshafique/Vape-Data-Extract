import ExcelJS from "exceljs";
import type { ActivityReport } from "@/lib/queries/reports";

function reportToRows(report: ActivityReport): (string | number)[][] {
  const header = ["Date", ...report.competitorNames, "Total"];
  const body = report.rows.map((row) => [
    row.bucket,
    ...report.competitorNames.map((name) => row.competitorTotals[name] ?? 0),
    row.total,
  ]);
  return [header, ...body];
}

export function reportToCsv(report: ActivityReport): string {
  const rows = reportToRows(report);
  return rows
    .map((row) => row.map((cell) => (typeof cell === "string" && /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(","))
    .join("\n");
}

export async function reportToXlsxBuffer(report: ActivityReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Activity Report");
  const rows = reportToRows(report);
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((column) => {
    column.width = 20;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
