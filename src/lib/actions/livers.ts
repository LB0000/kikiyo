"use server";

import { z } from "zod";
import Papa from "papaparse";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { updateLiverSchema } from "@/lib/validations/liver";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import type { ApplicationStatus } from "@/lib/supabase/types";

const applicationStatusSchema = z.enum([
  "completed", "released", "authorized", "pending", "rejected",
]);

export type LiverRow = {
  id: string;
  name: string | null;
  account_name: string | null;
  liver_id: string | null;
  email: string | null;
  tiktok_username: string | null;
  status: ApplicationStatus;
  link: string | null;
  address: string | null;
  contact: string | null;
  birth_date: string | null;
  acquisition_date: string | null;
  streaming_start_date: string | null;
  agency_id: string | null;
  agency_name?: string;
};

export async function getLivers(): Promise<LiverRow[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  // ライバーと代理店を並列取得
  const [{ data: livers, error }, { data: allAgencies }] = await Promise.all([
    supabase
      .from("livers")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("agencies").select("id, name"),
  ]);

  if (error || !livers) return [];

  const agencyMap = new Map(
    (allAgencies ?? []).map((a) => [a.id, a.name])
  );

  return livers.map((liver) => ({
    id: liver.id,
    name: liver.name,
    account_name: liver.account_name,
    liver_id: liver.liver_id,
    email: liver.email,
    tiktok_username: liver.tiktok_username,
    status: liver.status,
    link: liver.link,
    address: liver.address,
    contact: liver.contact,
    birth_date: liver.birth_date,
    acquisition_date: liver.acquisition_date,
    streaming_start_date: liver.streaming_start_date,
    agency_id: liver.agency_id,
    agency_name: liver.agency_id ? agencyMap.get(liver.agency_id) : undefined,
  }));
}

export async function updateLiver(
  id: string,
  data: {
    name?: string | null;
    account_name?: string | null;
    liver_id?: string | null;
    email?: string | null;
    tiktok_username?: string | null;
    link?: string | null;
    address?: string | null;
    contact?: string | null;
    birth_date?: string | null;
    acquisition_date?: string | null;
    streaming_start_date?: string | null;
    agency_id?: string | null;
  }
) {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };

  const parsed = updateLiverSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  }

  const supabase = await createClient();

  // agency_userは閲覧可能代理店のライバーのみ更新可能
  if (user.role !== "system_admin") {
    const { data: liver } = await supabase
      .from("livers")
      .select("agency_id")
      .eq("id", id)
      .single();

    if (!liver) return { error: "ライバーが見つかりません" };

    const { data: viewable } = await supabase
      .from("profile_viewable_agencies")
      .select("agency_id")
      .eq("profile_id", user.id);

    const viewableIds = (viewable ?? []).map((v) => v.agency_id);
    if (!liver.agency_id || !viewableIds.includes(liver.agency_id)) {
      return { error: "権限がありません" };
    }
  }

  // agency_id の変更は system_admin のみ許可
  const updateData = { ...parsed.data };
  if (user.role !== "system_admin") {
    delete updateData.agency_id;
  }

  const { error } = await supabase
    .from("livers")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("[updateLiver]", error.message);
    return { error: "ライバー情報の更新に失敗しました" };
  }

  revalidatePath("/livers");
  return { success: true };
}

export async function updateLiverStatus(id: string, status: ApplicationStatus) {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  const parsed = applicationStatusSchema.safeParse(status);
  if (!parsed.success) return { error: "無効なステータスです" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("livers")
    .update({ status: parsed.data })
    .eq("id", id);

  if (error) {
    console.error("[updateLiverStatus]", error.message);
    return { error: "ステータスの更新に失敗しました" };
  }

  revalidatePath("/livers");
  return { success: true };
}

export async function bulkUpdateLiverStatus(
  ids: string[],
  status: ApplicationStatus
) {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  if (ids.length === 0) return { error: "IDが指定されていません" };
  if (ids.length > 100) return { error: "一度に変更できるのは100件までです" };

  const parsed = applicationStatusSchema.safeParse(status);
  if (!parsed.success) return { error: "無効なステータスです" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("livers")
    .update({ status: parsed.data })
    .in("id", ids);

  if (error) {
    console.error("[bulkUpdateLiverStatus]", error.message);
    return { error: "一括ステータス更新に失敗しました" };
  }

  revalidatePath("/livers");
  return { success: true };
}

// --- CSVインポート ---

// APPLICATION_STATUS_LABELS の逆引きマップ（ラベル→enum）
const STATUS_LABEL_TO_ENUM = Object.fromEntries(
  Object.entries(APPLICATION_STATUS_LABELS).map(([k, v]) => [v, k])
) as Record<string, ApplicationStatus>;

const CSV_HEADER_MAP: Record<string, string> = {
  "氏名": "name",
  "クリエイターid": "liver_id",
  "ニックネーム": "account_name",
  "tiktokユーザー名": "tiktok_username",
  "メールアドレス": "email",
  "連絡先": "contact",
  "申請状況": "status",
  "配信開始日": "streaming_start_date",
  "獲得日": "acquisition_date",
  "tiktokアカウントリンク": "link",
};

export type ImportLiversResult = {
  success: true;
  updatedCount: number;
  createdCount: number;
  skippedCount: number;
  errors: string[];
};

export async function importLiversCsv(
  csvText: string
): Promise<ImportLiversResult | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  // BOM除去 & パース
  const cleaned = csvText.replace(/^\uFEFF/, "");
  const parsed = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return { error: "CSVの解析に失敗しました" };
  }

  if (parsed.data.length === 0) {
    return { error: "CSVにデータ行がありません" };
  }

  // ヘッダー正規化（小文字化→DBフィールドへマッピング）
  const rawHeaders = parsed.meta.fields ?? [];
  const headerMap = new Map<string, string>();
  for (const h of rawHeaders) {
    const key = h.trim().toLowerCase();
    const dbField = CSV_HEADER_MAP[key];
    if (dbField) headerMap.set(h, dbField);
  }

  // TikTokユーザー名列の存在チェック
  const tiktokHeader = [...headerMap.entries()].find(
    ([, v]) => v === "tiktok_username"
  )?.[0];
  if (!tiktokHeader) {
    return { error: "「TikTokユーザー名」列が見つかりません" };
  }

  // 既存ライバーを全件取得し、tiktok_username(lowercase) → id でマッピング
  const supabase = await createAdminClient();
  const { data: existingLivers, error: fetchError } = await supabase
    .from("livers")
    .select("id, tiktok_username");

  if (fetchError) {
    console.error("[importLiversCsv] fetch error:", fetchError.message);
    return { error: "ライバーデータの取得に失敗しました" };
  }

  const liverByUsername = new Map<string, string>();
  for (const liver of existingLivers ?? []) {
    if (liver.tiktok_username) {
      liverByUsername.set(liver.tiktok_username.toLowerCase(), liver.id);
    }
  }

  let updatedCount = 0;
  let createdCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const rowNum = i + 2; // ヘッダー行=1、データ1行目=2

    const tiktokUsername = row[tiktokHeader]?.trim();
    if (!tiktokUsername) {
      skippedCount++;
      errors.push(`${rowNum}行目: TikTokユーザー名が空のためスキップ`);
      continue;
    }

    // CSV行からDBフィールドへ変換（空セルはスキップ）
    const fields: Record<string, string | null> = {};
    for (const [csvHeader, dbField] of headerMap) {
      if (dbField === "tiktok_username") continue; // キー自体は別処理
      const val = row[csvHeader]?.trim();
      if (!val) continue; // 空セル → 既存値を維持

      if (dbField === "status") {
        // ラベル→enum変換
        const enumVal = STATUS_LABEL_TO_ENUM[val];
        if (!enumVal) {
          errors.push(`${rowNum}行目: 無効な申請状況「${val}」をスキップ`);
          continue;
        }
        fields[dbField] = enumVal;
      } else {
        fields[dbField] = val;
      }
    }

    const existingId = liverByUsername.get(tiktokUsername.toLowerCase());

    if (existingId) {
      // 既存ライバーを更新
      if (Object.keys(fields).length === 0) {
        skippedCount++;
        continue;
      }

      const { error: updateError } = await supabase
        .from("livers")
        .update(fields)
        .eq("id", existingId);

      if (updateError) {
        errors.push(`${rowNum}行目: 更新失敗（${tiktokUsername}）`);
        console.error("[importLiversCsv] update error:", updateError.message);
      } else {
        updatedCount++;
      }
    } else {
      // 新規ライバーを作成
      const newLiver: Record<string, string | null> = {
        tiktok_username: tiktokUsername,
        status: "pending",
        ...fields,
      };

      const { error: insertError } = await supabase
        .from("livers")
        .insert(newLiver);

      if (insertError) {
        errors.push(`${rowNum}行目: 新規作成失敗（${tiktokUsername}）`);
        console.error("[importLiversCsv] insert error:", insertError.message);
      } else {
        createdCount++;
      }
    }
  }

  revalidatePath("/livers");
  return { success: true, updatedCount, createdCount, skippedCount, errors };
}
