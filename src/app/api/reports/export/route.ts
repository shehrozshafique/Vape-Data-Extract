import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getActivityReport, type ReportGrouping } from "@/lib/queries/reports";
import { getDateRangeForPreset, type DatePreset } from "@/lib/utils/dates";
import { reportToCsv, reportToXlsxBuffer } from "@/lib/utils/export";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const grouping = (searchParams.get("grouping") ?? "day") as ReportGrouping;
  const fileFormat = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const preset = (searchParams.get("preset") ?? "last_30_days") as DatePreset;
  const from = searchParams.get("from") ?? getDateRangeForPreset(preset).from;
  const to = searchParams.get("to") ?? getDateRangeForPreset(preset).to;

  const report = await getActivityReport({ from, to, grouping });
  const filename = `competitor-activity-${grouping}-${new Date().toISOString().slice(0, 10)}`;

  if (fileFormat === "xlsx") {
    const buffer = await reportToXlsxBuffer(report);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  const csv = reportToCsv(report);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
