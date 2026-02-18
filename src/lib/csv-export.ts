import Papa from "papaparse";

export type CsvColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
};

export function exportCsv<T>(
  rows: T[],
  columns: CsvColumn<T>[],
  filename: string,
) {
  const headers = columns.map((c) => c.header);
  const data = rows.map((row) =>
    columns.map((col) => {
      const val = col.accessor(row);
      return val ?? "";
    }),
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
