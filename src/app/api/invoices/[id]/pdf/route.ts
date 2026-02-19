import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generateInvoicePdf } from "@/lib/pdf/invoice-pdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const inline = searchParams.get("inline") === "true";
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !invoice) {
    return NextResponse.json(
      { error: "請求書が見つかりません" },
      { status: 404 }
    );
  }

  const pdfBuffer = generateInvoicePdf({
    invoice_number: invoice.invoice_number,
    agency_name: invoice.agency_name,
    agency_address: invoice.agency_address,
    agency_representative: invoice.agency_representative,
    invoice_registration_number: invoice.invoice_registration_number,
    is_invoice_registered: invoice.is_invoice_registered,
    deductible_rate: invoice.deductible_rate,
    subtotal_jpy: invoice.subtotal_jpy,
    tax_rate: invoice.tax_rate,
    tax_amount_jpy: invoice.tax_amount_jpy,
    total_jpy: invoice.total_jpy,
    data_month: invoice.data_month,
    exchange_rate: invoice.exchange_rate,
    commission_rate: invoice.commission_rate,
    bank_name: invoice.bank_name,
    bank_branch: invoice.bank_branch,
    bank_account_type: invoice.bank_account_type,
    bank_account_number: invoice.bank_account_number,
    bank_account_holder: invoice.bank_account_holder,
    sent_at: invoice.sent_at,
    created_at: invoice.created_at,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${invoice.invoice_number.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf"`,
      "Cache-Control": "private, max-age=3600, immutable",
    },
  });
}
