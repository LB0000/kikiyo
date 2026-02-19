import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

// フォントデータキャッシュ（ファイル読み取りは1回のみ）
let fontBase64Cache: string | null = null;
let fontChecked = false;

function registerFont(doc: jsPDF): boolean {
  if (!fontChecked) {
    fontChecked = true;
    try {
      const fontPath = path.join(process.cwd(), "public", "fonts", "NotoSansJP-Regular.ttf");
      if (fs.existsSync(fontPath)) {
        fontBase64Cache = fs.readFileSync(fontPath).toString("base64");
      }
    } catch {
      // フォント読み取り失敗時はデフォルトフォントを使用
    }
  }

  if (!fontBase64Cache) return false;

  try {
    doc.addFileToVFS("NotoSansJP-Regular.ttf", fontBase64Cache);
    doc.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
    return true;
  } catch {
    return false;
  }
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

function formatCurrency(amount: number): string {
  return `¥${Math.round(amount).toLocaleString("ja-JP")}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatAccountType(type: string | null): string {
  if (type === "futsu") return "普通";
  if (type === "toza") return "当座";
  return "-";
}

export function generateInvoicePdf(data: InvoicePdfData): Buffer {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // フォント登録（各インスタンスに登録が必要）
  const fontAvailable = registerFont(doc);

  // フォント設定（登録済みならNotoSansJP、なければHelvetica）
  const fontName = fontAvailable ? "NotoSansJP" : "Helvetica";
  doc.setFont(fontName, "normal");

  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 25;

  // === タイトル ===
  doc.setFontSize(24);
  doc.text("請求書", pageWidth / 2, y, { align: "center" });
  y += 15;

  // === 請求書番号・発行日 ===
  doc.setFontSize(10);
  doc.text(`請求書番号: ${data.invoice_number}`, margin, y);
  const issueDate = data.sent_at ? formatDate(data.sent_at) : formatDate(data.created_at);
  doc.text(`発行日: ${issueDate}`, pageWidth - margin, y, { align: "right" });
  y += 6;
  doc.text(`対象期間: ${data.data_month ?? "-"}`, margin, y);
  y += 6;
  doc.text(`為替レート: ${data.exchange_rate} 円/USD`, margin, y);
  doc.text(`手数料率: ${(data.commission_rate * 100).toFixed(1)}%`, pageWidth - margin, y, { align: "right" });
  y += 10;

  // === 区切り線 ===
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // === 請求先 ===
  doc.setFontSize(11);
  doc.text("請求先:", margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.text("株式会社KIKIYO 御中", margin + 5, y);
  y += 12;

  // === 請求元 ===
  doc.setFontSize(11);
  doc.text("請求元:", margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.text(data.agency_name, margin + 5, y);
  y += 5;
  if (data.agency_address) {
    doc.text(`住所: ${data.agency_address}`, margin + 5, y);
    y += 5;
  }
  if (data.agency_representative) {
    doc.text(`代表者: ${data.agency_representative}`, margin + 5, y);
    y += 5;
  }
  if (data.is_invoice_registered && data.invoice_registration_number) {
    doc.text(`登録番号: ${data.invoice_registration_number}`, margin + 5, y);
  } else {
    doc.text("※適格請求書発行事業者 未登録", margin + 5, y);
  }
  y += 12;

  // === 区切り線 ===
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // === 金額テーブル ===
  doc.setFontSize(11);

  // テーブルヘッダー
  const col1X = margin;
  const col2X = pageWidth - margin;

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y - 5, contentWidth, 8, "F");
  doc.text("項目", col1X + 3, y);
  doc.text("金額", col2X - 3, y, { align: "right" });
  y += 8;

  // 小計
  doc.setFontSize(10);
  doc.text("代理店報酬（税抜）", col1X + 3, y);
  doc.text(formatCurrency(data.subtotal_jpy), col2X - 3, y, { align: "right" });
  y += 7;

  // 消費税
  doc.text(`消費税（${(data.tax_rate * 100).toFixed(0)}%）`, col1X + 3, y);
  doc.text(formatCurrency(data.tax_amount_jpy), col2X - 3, y, { align: "right" });
  y += 7;

  // 区切り線
  doc.line(margin, y - 2, pageWidth - margin, y - 2);
  y += 3;

  // 合計
  doc.setFontSize(12);
  doc.text("合計（税込）", col1X + 3, y);
  doc.text(formatCurrency(data.total_jpy), col2X - 3, y, { align: "right" });
  y += 12;

  // === インボイス経過措置注記 ===
  if (!data.is_invoice_registered) {
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const ratePercent = (data.deductible_rate * 100).toFixed(0);
    doc.text(
      `※本請求書は適格請求書ではありません。経過措置により仕入税額控除の${ratePercent}%が控除可能です。`,
      margin,
      y
    );
    doc.setTextColor(0, 0, 0);
    y += 12;
  }

  y += 5;

  // === 区切り線 ===
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // === 振込先 ===
  doc.setFontSize(11);
  doc.text("振込先:", margin, y);
  y += 6;
  doc.setFontSize(10);
  if (data.bank_name) {
    doc.text(`銀行名: ${data.bank_name}`, margin + 5, y);
    y += 5;
  }
  if (data.bank_branch) {
    doc.text(`支店名: ${data.bank_branch}`, margin + 5, y);
    y += 5;
  }
  if (data.bank_account_type) {
    doc.text(`口座種別: ${formatAccountType(data.bank_account_type)}`, margin + 5, y);
    y += 5;
  }
  if (data.bank_account_number) {
    doc.text(`口座番号: ${data.bank_account_number}`, margin + 5, y);
    y += 5;
  }
  if (data.bank_account_holder) {
    doc.text(`口座名義: ${data.bank_account_holder}`, margin + 5, y);
    y += 5;
  }

  // PDFバッファを返す
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
