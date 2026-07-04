import Papa from "papaparse";

export type CsvColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
};

// CSV/数式インジェクション対策（CWE-1236）。
// Excel等が =,+,-,@,TAB,CR で始まるセルを数式として解釈するのを防ぐため、
// 該当する文字列セルの先頭にシングルクォートを付与して無害化する。
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

function sanitizeCsvCell(
  val: string | number | boolean | null | undefined,
): string | number | boolean {
  if (val === null || val === undefined) return "";
  if (typeof val !== "string") return val;
  return FORMULA_TRIGGER.test(val) ? `'${val}` : val;
}

export function exportCsv<T>(
  rows: T[],
  columns: CsvColumn<T>[],
  filename: string,
) {
  const headers = columns.map((c) => c.header);
  const data = rows.map((row) =>
    columns.map((col) => sanitizeCsvCell(col.accessor(row))),
  );

  const csv = Papa.unparse({ fields: headers, data });

  // BOM prefix for Excel compatibility with Japanese characters
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
