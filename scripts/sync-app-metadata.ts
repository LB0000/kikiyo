/**
 * 既存ユーザーの app_metadata を profiles テーブルから同期する一括スクリプト。
 * デプロイ前に1回だけ実行する。
 *
 * 使い方:
 *   npx tsx scripts/sync-app-metadata.ts
 *
 * 必要な環境変数:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "環境変数 NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, role, agency_id");

  if (error || !profiles) {
    console.error("profiles の取得に失敗:", error);
    process.exit(1);
  }

  console.log(`${profiles.length} 件のプロファイルを同期します...`);

  let success = 0;
  let failed = 0;

  for (const profile of profiles) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profile.id,
      {
        app_metadata: {
          role: profile.role,
          agency_id: profile.agency_id,
        },
      }
    );

    if (updateError) {
      console.error(`  [FAIL] ${profile.id}: ${updateError.message}`);
      failed++;
    } else {
      console.log(
        `  [OK]   ${profile.id}: role=${profile.role}, agency_id=${profile.agency_id ?? "null"}`
      );
      success++;
    }
  }

  console.log(`\n完了: ${success} 件成功, ${failed} 件失敗`);
  if (failed > 0) process.exit(1);
}

main();
