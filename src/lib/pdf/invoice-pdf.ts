import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

// ── フォント定義（一元管理） ──

const FONT_DEFS = [
  { file: "NotoSansJP-Regular.ttf", family: "NotoSansJP", style: "normal" },
  { file: "NotoSansJP-Bold.ttf", family: "NotoSansJP", style: "bold" },
] as const;

// フォントデータキャッシュ（ファイル読み取りは1回のみ）
const fontCache: Record<string, string> = {};
let fontChecked = false;

function loadFonts() {
  if (fontChecked) return;
  fontChecked = true;
  const fontsDir = path.join(process.cwd(), "public", "fonts");
  for (const def of FONT_DEFS) {
    try {
      const fontPath = path.join(fontsDir, def.file);
      if (fs.existsSync(fontPath)) {
        fontCache[def.file] = fs.readFileSync(fontPath).toString("base64");
      }
    } catch {
      // フォント読み取り失敗時はスキップ
    }
  }
}

function registerFonts(doc: jsPDF): boolean {
  loadFonts();
  let registered = false;
  for (const def of FONT_DEFS) {
    const data = fontCache[def.file];
    if (data) {
      try {
        doc.addFileToVFS(def.file, data);
        doc.addFont(def.file, def.family, def.style);
        registered = true;
      } catch {
        // 個別フォント登録失敗はスキップ
      }
    }
  }
  return registered;
}

export type InvoicePdfData = {
  invoice_number: string;
  agency_name: string;
  agency_address: string | null;
  agency_representative: string | null;
  invoice_registration_number: string | null;
  is_invoice_registered: boolean;
  deductible_rate: number;
  subtotal_jpy: number;
  tax_rate: number;
  tax_amount_jpy: number;
  total_jpy: number;
  data_month: string | null;
  exchange_rate: number;
  commission_rate: number;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account_type: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  sent_at: string | null;
  created_at: string;
};

// ── ヘルパー関数 ──

function formatCurrency(amount: number): string {
  return `¥${Math.round(amount).toLocaleString("ja-JP")}`;
}

function formatCurrencyWithDash(amount: number): string {
  return `¥${Math.round(amount).toLocaleString("ja-JP")}-`;
}

/** タイムゾーンに依存しない日付フォーマット（YYYY-MM-DD / ISO文字列対応） */
function formatDate(dateStr: string): string {
  // "2026-01-15" のような日付のみの文字列はUTC解釈されるので、明示的に分割する
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    return `${year}年${month}月${day}日`;
  }
  // ISO文字列（タイムゾーン付き）の場合はJSTで解釈
  const date = new Date(dateStr);
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}年${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日`;
}

function formatAccountType(type: string | null): string {
  if (type === "futsu") return "普通";
  if (type === "toza") return "当座";
  return "-";
}

// ── テーブル描画ヘルパー ──

type TableRow = { label: string; value: string; bold?: boolean };

function drawTable(
  doc: jsPDF,
  x: number,
  y: number,
  labelWidth: number,
  valueWidth: number,
  rowHeight: number,
  rows: TableRow[],
  font: string
) {
  const totalWidth = labelWidth + valueWidth;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ry = y + i * rowHeight;

    // セル背景（ラベル列）
    doc.setFillColor(245, 245, 245);
    doc.rect(x, ry, labelWidth, rowHeight, "FD");
    // 値セル枠
    doc.rect(x + labelWidth, ry, valueWidth, rowHeight, "S");

    // ラベルテキスト
    doc.setFont(font, "normal");
    doc.setFontSize(9);
    doc.text(row.label, x + 4, ry + rowHeight / 2 + 1, {
      baseline: "middle",
    });

    // 値テキスト
    doc.setFont(font, row.bold ? "bold" : "normal");
    doc.setFontSize(row.bold ? 10 : 9);
    doc.text(row.value, x + labelWidth + valueWidth - 4, ry + rowHeight / 2 + 1, {
      align: "right",
      baseline: "middle",
    });
  }

  // 外枠
  doc.setLineWidth(0.5);
  doc.rect(x, y, totalWidth, rows.length * rowHeight, "S");
  doc.setLineWidth(0.3);
}

// ── メイン PDF 生成 ──

const PAGE_HEIGHT = 297;
const FOOTER_Y = PAGE_HEIGHT - 12;

export function generateInvoicePdf(data: InvoicePdfData): Buffer {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const fontAvailable = registerFonts(doc);
  const font = fontAvailable ? "NotoSansJP" : "Helvetica";
  doc.setFont(font, "normal");

  // PDFメタデータ
  doc.setProperties({
    title: `請求書 ${data.invoice_number}`,
    author: data.agency_name,
    subject: `請求書 ${data.invoice_number} - ${data.data_month ?? ""}`,
    creator: "KIKIYO LIVE MANAGER",
  });

  const pageWidth = 210;
  const marginL = 20;
  const marginR = 20;
  const rightEdge = pageWidth - marginR;
  const contentWidth = pageWidth - marginL - marginR;
  let y = 18;

  // ════════════════════════════════════════════════════
  // 右上: 請求書番号・発行日
  // ════════════════════════════════════════════════════
  doc.setFontSize(8.5);
  doc.setFont(font, "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`No. ${data.invoice_number}`, rightEdge, y, { align: "right" });
  y += 5;
  const issueDate = data.sent_at ? formatDate(data.sent_at) : formatDate(data.created_at);
  doc.text(`発行日: ${issueDate}`, rightEdge, y, { align: "right" });
  doc.setTextColor(0, 0, 0);

  // ════════════════════════════════════════════════════
  // タイトル: 請 求 書
  // ════════════════════════════════════════════════════
  y += 10;
  doc.setFont(font, "bold");
  doc.setFontSize(22);
  doc.text("請  求  書", pageWidth / 2, y, { align: "center" });

  // タイトル下の装飾線
  y += 3;
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 28, y, pageWidth / 2 + 28, y);
  doc.setLineWidth(0.3);

  // ════════════════════════════════════════════════════
  // 宛名（請求先）: 左側
  // ════════════════════════════════════════════════════
  y += 14;
  const addressStartY = y;

  doc.setFont(font, "bold");
  doc.setFontSize(14);
  const companyText = "株式会社KIKIYO";
  const companyTextWidth = doc.getTextWidth(companyText);
  doc.text(companyText, marginL, y);

  // 「御中」は同じ行に、会社名の右に配置
  doc.setFontSize(11);
  const gotyuText = "御中";
  doc.text(gotyuText, marginL + companyTextWidth + 3, addressStartY);

  // 宛名下線（会社名は14ptで計測済み、御中は11pt）
  y += 6;
  doc.setFontSize(11);
  const gotyuWidth = doc.getTextWidth(gotyuText);
  const nameWidth = Math.max(companyTextWidth + 3 + gotyuWidth + 2, 70);
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.5);
  doc.line(marginL, y - 2, marginL + nameWidth, y - 2);
  doc.setLineWidth(0.3);

  // ════════════════════════════════════════════════════
  // 請求元情報: 右側
  // ════════════════════════════════════════════════════
  let ry = addressStartY;
  doc.setFont(font, "bold");
  doc.setFontSize(10);
  doc.text(data.agency_name, rightEdge, ry, { align: "right" });
  ry += 5;

  doc.setFont(font, "normal");
  doc.setFontSize(8.5);
  if (data.agency_address) {
    doc.text(data.agency_address, rightEdge, ry, { align: "right" });
    ry += 4.5;
  }
  if (data.agency_representative) {
    doc.text(`代表者: ${data.agency_representative}`, rightEdge, ry, { align: "right" });
    ry += 4.5;
  }
  if (data.is_invoice_registered && data.invoice_registration_number) {
    doc.setFontSize(8.5);
    doc.text(
      `登録番号: ${data.invoice_registration_number}`,
      rightEdge,
      ry,
      { align: "right" }
    );
  } else {
    doc.setTextColor(150, 80, 0);
    doc.text("※適格請求書発行事業者 未登録", rightEdge, ry, {
      align: "right",
    });
    doc.setTextColor(0, 0, 0);
  }

  // ════════════════════════════════════════════════════
  // ご請求金額 ハイライトボックス
  // ════════════════════════════════════════════════════
  y = Math.max(y, ry) + 12;
  const boxH = 16;
  doc.setFillColor(240, 245, 255);
  doc.setDrawColor(60, 100, 180);
  doc.setLineWidth(0.6);
  doc.roundedRect(marginL, y, contentWidth, boxH, 2, 2, "FD");
  doc.setLineWidth(0.3);

  doc.setFont(font, "normal");
  doc.setFontSize(10);
  doc.text("ご請求金額（税込）", marginL + 8, y + boxH / 2 + 1, {
    baseline: "middle",
  });

  doc.setFont(font, "bold");
  doc.setFontSize(18);
  doc.text(
    formatCurrencyWithDash(data.total_jpy),
    rightEdge - 8,
    y + boxH / 2 + 1,
    { align: "right", baseline: "middle" }
  );

  // ════════════════════════════════════════════════════
  // 取引情報
  // ════════════════════════════════════════════════════
  y += boxH + 10;
  doc.setFont(font, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);

  const infoItems = [
    `対象期間: ${data.data_month ?? "-"}`,
    `為替レート: ${data.exchange_rate.toFixed(2)} 円/USD`,
    `手数料率: ${(data.commission_rate * 100).toFixed(1)}%`,
  ];
  doc.text(infoItems.join("　　"), marginL, y);
  doc.setTextColor(0, 0, 0);

  // ════════════════════════════════════════════════════
  // 明細テーブル
  // ════════════════════════════════════════════════════
  y += 10;
  const tableX = marginL;
  const labelColW = contentWidth * 0.6;
  const amountColW = contentWidth * 0.4;
  const headerH = 8;
  const rowH = 8;

  // ヘッダー行
  doc.setFillColor(50, 55, 65);
  doc.setDrawColor(50, 55, 65);
  doc.rect(tableX, y, contentWidth, headerH, "FD");
  doc.setFont(font, "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("品　目", tableX + 4, y + headerH / 2 + 1, { baseline: "middle" });
  doc.text("金　額", tableX + labelColW + amountColW - 4, y + headerH / 2 + 1, {
    align: "right",
    baseline: "middle",
  });
  doc.setTextColor(0, 0, 0);
  y += headerH;

  // 明細行: 代理店報酬（税抜）
  doc.setDrawColor(180, 180, 180);
  doc.rect(tableX, y, labelColW, rowH, "S");
  doc.rect(tableX + labelColW, y, amountColW, rowH, "S");
  doc.setFont(font, "normal");
  doc.setFontSize(9);
  doc.text("代理店報酬（税抜）", tableX + 4, y + rowH / 2 + 1, {
    baseline: "middle",
  });
  doc.text(
    formatCurrency(data.subtotal_jpy),
    tableX + labelColW + amountColW - 4,
    y + rowH / 2 + 1,
    { align: "right", baseline: "middle" }
  );
  y += rowH;

  // 明細行: 消費税
  doc.rect(tableX, y, labelColW, rowH, "S");
  doc.rect(tableX + labelColW, y, amountColW, rowH, "S");
  doc.text(
    `消費税（${(data.tax_rate * 100).toFixed(0)}%）`,
    tableX + 4,
    y + rowH / 2 + 1,
    { baseline: "middle" }
  );
  doc.text(
    formatCurrency(data.tax_amount_jpy),
    tableX + labelColW + amountColW - 4,
    y + rowH / 2 + 1,
    { align: "right", baseline: "middle" }
  );
  y += rowH;

  // 合計行
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(180, 180, 180);
  doc.rect(tableX, y, labelColW, rowH + 2, "FD");
  doc.rect(tableX + labelColW, y, amountColW, rowH + 2, "FD");
  doc.setFont(font, "bold");
  doc.setFontSize(10);
  doc.text("合計（税込）", tableX + 4, y + (rowH + 2) / 2 + 1, {
    baseline: "middle",
  });
  doc.text(
    formatCurrency(data.total_jpy),
    tableX + labelColW + amountColW - 4,
    y + (rowH + 2) / 2 + 1,
    { align: "right", baseline: "middle" }
  );

  // 外枠強調
  doc.setDrawColor(50, 55, 65);
  doc.setLineWidth(0.5);
  doc.rect(tableX, y - rowH * 2 - headerH, contentWidth, headerH + rowH * 2 + rowH + 2, "S");
  doc.setLineWidth(0.3);
  y += rowH + 2;

  // ════════════════════════════════════════════════════
  // 消費税の内訳
  // ════════════════════════════════════════════════════
  y += 8;
  doc.setFont(font, "bold");
  doc.setFontSize(8.5);
  doc.text("【消費税の内訳】", marginL, y);
  y += 5;
  doc.setFont(font, "normal");
  doc.setFontSize(8);
  const taxPercent = (data.tax_rate * 100).toFixed(0);
  doc.text(
    `${taxPercent}%対象額: ${formatCurrency(data.subtotal_jpy)}　　消費税額: ${formatCurrency(data.tax_amount_jpy)}`,
    marginL + 2,
    y
  );

  // ════════════════════════════════════════════════════
  // インボイス経過措置注記
  // ════════════════════════════════════════════════════
  if (!data.is_invoice_registered) {
    y += 8;
    doc.setFontSize(7.5);
    doc.setTextColor(150, 80, 0);
    const ratePercent = (data.deductible_rate * 100).toFixed(0);
    doc.text(
      "※本請求書は適格請求書ではありません。",
      marginL,
      y
    );
    y += 4;
    doc.text(
      `　経過措置により仕入税額控除の${ratePercent}%が控除可能です。`,
      marginL,
      y
    );
    doc.setTextColor(0, 0, 0);
  }

  // ════════════════════════════════════════════════════
  // 区切り線
  // ════════════════════════════════════════════════════
  y += 10;

  // ページ溢れ防止: 振込先テーブル（最大5行×7mm + マージン）がフッターに重なる場合は改ページ
  const remainingBankSection = 8 + 5 + 5 * 7 + 10; // セクションヘッダー + テーブル + 注記
  if (y + remainingBankSection > FOOTER_Y) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, rightEdge, y);

  // ════════════════════════════════════════════════════
  // お振込先
  // ════════════════════════════════════════════════════
  y += 8;
  doc.setFont(font, "bold");
  doc.setFontSize(9);
  doc.text("【お振込先】", marginL, y);
  y += 5;

  const bankRows: TableRow[] = [];
  if (data.bank_name) {
    bankRows.push({ label: "銀行名", value: data.bank_name });
  }
  if (data.bank_branch) {
    bankRows.push({ label: "支店名", value: data.bank_branch });
  }
  if (data.bank_account_type) {
    bankRows.push({
      label: "口座種別",
      value: formatAccountType(data.bank_account_type),
    });
  }
  if (data.bank_account_number) {
    bankRows.push({ label: "口座番号", value: data.bank_account_number });
  }
  if (data.bank_account_holder) {
    bankRows.push({ label: "口座名義", value: data.bank_account_holder });
  }

  if (bankRows.length > 0) {
    drawTable(doc, marginL, y, 35, 80, 7, bankRows, font);
    y += bankRows.length * 7 + 5;
  }

  // 振込手数料注記
  doc.setFont(font, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text("※振込手数料はお客様にてご負担ください。", marginL, y);
  doc.setTextColor(0, 0, 0);

  // ════════════════════════════════════════════════════
  // フッター（現在ページの最下部に配置）
  // ════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      "KIKIYO LIVE MANAGER により作成",
      pageWidth / 2,
      FOOTER_Y,
      { align: "center" }
    );
  }
  doc.setTextColor(0, 0, 0);

  // PDFバッファを返す
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
