# 要望#4 / 4-A データモデル詳細設計（2026-06-24）

> 確定仕様（Plans.md「要望#4 仕様 確定サマリ」）に基づく 4-A の設計。DDL は草案。
> 連番マイグレ 032〜038 に分割。実装着手前に発注元確認3点（末尾）を解消推奨。

## 設計上の主要判断

### 判断1: 分配先（payee）のモデリング → **案B 採用**（個別エンティティ + 排他的アーク）
- `managers` / `scouts` を独立テーブル化。代理店・三次代理店は既存 `agencies` + `agency_hierarchy` を再利用（新テーブル不要）。
- 分配ルール/明細側に `payee_kind enum + 種別ごとnullable FK + CHECK制約`（exclusive arc）で参照整合性をDBが保証。
- 却下した案A（単一 `payees` テーブル + payee_type）: 代理店を二重管理し invoices の `UNIQUE(agency_id, monthly_report_id)` / 既存RLS と不整合になるため。

### 判断2: 固定マスタ方式の表現 → **案② 採用**（現在値上書き + change_log）
- 率・紐付けは現在値のみ保持。変更履歴は `*_change_logs`。確定値は `distributions` のスナップショット列が保持（遡及しない）。
- 既存 `agencies.commission_rate` 上書き + `rate_change_logs`(010) + invoices スナップショットと同思想。
- 却下した案①（valid_from/valid_to の temporal）: 「月次積み分け不要」仕様に反し、既存RPC思想と不整合。YAGNI。

### 判断3: `csv_data.manager_id` → **派生・任意列として持たせる**
- マネージャー単位集計の高速化用。**真実のソースは `manager_agencies`**、本列はキャッシュ。
- 紐付け変更時は 4-B の再計算RPC経由でのみ同期（手動更新禁止）。

## マイグレ・ファイル分割（1ファイル1責務）

| ファイル | 目的 |
|---|---|
| `032_add_manager_scout_roles.sql` | `user_role` enum に `manager_user`/`scout_user` 追加（**単独Tx必須**: ADD VALUE はTx内で直後使用不可） |
| `033_create_managers_scouts.sql` | `managers`/`scouts` + `payee_kind` enum + updated_atトリガ + soft delete |
| `034_create_assignment_masters.sql` | `manager_agencies`/`scout_agencies`/`liver_scouts` + `assignment_change_logs` |
| `035_create_distribution_rules.sql` | `distribution_rules`（排他的アークCHECK・部分UNIQUE）+ `distribution_rule_change_logs` |
| `036_create_distributions.sql` | `distributions` 分配明細スナップショット（tier多段対応） |
| `037_manager_scout_rls.sql` | 新ヘルパ `get_user_manager_agency_ids()`/`get_user_scout_id()` + 新テーブルRLS + 既存 agencies/csv_data へマネージャー閲覧ポリシー追加 |
| `038_csv_data_manager_link.sql` | `csv_data.manager_id`（派生・任意）+ index |

適用順序: **032 → 033 → 034 → 035 → 036 → 037 → 038**（032 単独先行、037 は enum新値使用のため必ず後続）。

## 主要DDL草案（抜粋）

```sql
-- 033: エンティティ
CREATE TYPE payee_kind AS ENUM ('total_side','manager','agency','scout');
CREATE TABLE managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  backstage_group_manager TEXT,            -- csv_data.group_manager とのマッチキー
  user_id UUID REFERENCES auth.users(id),  -- 代表者ログイン(1:1, manager_user)
  company_name TEXT, representative_name TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX uq_managers_user_id ON managers(user_id) WHERE user_id IS NOT NULL;
CREATE TABLE scouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),  -- scout_user(1:1, NULL可)
  bank_name TEXT, bank_branch TEXT, bank_account_type account_type,
  bank_account_number TEXT, bank_account_holder TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- 034: 紐付け（固定マスタ）
CREATE TABLE manager_agencies (        -- 1代理店=1マネージャー
  agency_id UUID PRIMARY KEY REFERENCES agencies(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES managers(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE scout_agencies ( scout_id UUID ..., agency_id UUID ..., PRIMARY KEY(scout_id,agency_id) );
CREATE TABLE liver_scouts ( liver_id UUID PRIMARY KEY ..., scout_id UUID NOT NULL ... );  -- 任意(計算単位は4-Bで確定)

-- 035: 率マスタ（排他的アーク）
CREATE TABLE distribution_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,  -- 適用スコープ
  payee_kind payee_kind NOT NULL,
  manager_id UUID REFERENCES managers(id),
  scout_id UUID REFERENCES scouts(id),
  payee_agency_id UUID REFERENCES agencies(id),  -- 三次代理店
  rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false, ...,
  CONSTRAINT chk_dr_payee CHECK ( /* payee_kind と FK の排他一致 */ )
);
-- 既存 agencies.commission_rate（代理店自身の取り分）は維持。distribution_rules は追加分配率を表現。

-- 036: 分配明細（スナップショット）
CREATE TABLE distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_report_id UUID NOT NULL REFERENCES monthly_reports(id) ON DELETE CASCADE,
  source_agency_id UUID REFERENCES agencies(id),
  payee_kind payee_kind NOT NULL, manager_id UUID, scout_id UUID, payee_agency_id UUID,
  base_amount_jpy NUMERIC NOT NULL,
  applied_rate NUMERIC(5,4) NOT NULL,           -- スナップショット
  amount_jpy NUMERIC NOT NULL,                  -- ROUND(base × rate, 2)
  tier INT NOT NULL DEFAULT 1,                  -- 1=一次, 2=三次代理店段
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_dist_payee CHECK ( /* 排他一致 */ )
);
-- invoices には一切触れない（代理店請求は従来通り）。
```

## RLS（権限/「担当分のみ」強制）

- 新ヘルパ（`SECURITY DEFINER STABLE SET search_path=public`）:
  - `get_user_manager_agency_ids()` … `manager_agencies` × `managers.user_id=auth.uid()` から担当代理店ID集合。
  - `get_user_scout_id()` … `scouts.user_id=auth.uid()` の scout_id。
- ポリシー: admin `FOR ALL` + マネージャー/スカウトは `auth.uid()` 直接導出でSELECT限定。
  - `distributions`: マネージャー=`source_agency_id IN get_user_manager_agency_ids()`、スカウト=`scout_id = get_user_scout_id()`。
- **無限再帰回避**: `managers`/`scouts` 自体のポリシーは `user_id = auth.uid()` 直接比較。ヘルパは他テーブルのフィルタにのみ使用（既存 `get_viewable_agency_ids` と同じ安全パターン）。
- TS追従: `types.ts` UserRole/Database enum、`auth.ts` app_metadata.role に新ロール追加（別PR）。

## 4-B（多段分配計算）への接続点（実装は4-Bスコープ）

1. 元本 = `csv_data.payment_bonus × mr.rate`（`source_agency_id` 単位集計）。
2. 率解決 = `distribution_rules` を `agency_id + payee_kind` で引く。代理店自身は既存 `agencies.commission_rate`。
3. 多段 = `agency_hierarchy` を辿り三次代理店は `tier=2` で同方式。
4. 出力 = `distributions` に DELETE+INSERT でスナップショット保存、`csv_data.manager_id` 同期。
5. 新RPC `recalculate_distributions(p_monthly_report_id)`（admin限定・既存RPCガード踏襲）を import/率変更/為替変更の**後段**で呼ぶ。既存4本のRPCは無改変。

## リスク・地雷

| # | リスク | 対策 |
|---|---|---|
| R1 | enum ADD VALUE のTx制約 | 032(ADD VALUE) と 037(使用) を別ファイル分離 |
| R2 | RLS無限再帰 | テーブル自身のポリシーは `auth.uid()` 直接比較。ヘルパは他テーブル限定 |
| R3 | SECURITY DEFINER search_path漏れ | 全新規関数に `SET search_path=public`（014基準） |
| R4 | invoices UNIQUE衝突 | invoices 不触。`distributions` は別テーブル |
| R5 | soft delete相互作用 | `WHERE is_deleted=false` を一貫除外、紐付けは `ON DELETE RESTRICT` |
| R6 | `csv_data.manager_id` ズレ | 真実は `manager_agencies`。RPC経由のみ同期 |
| R7 | 既存RPC整合 | 既存4本無改変、4-Bは後段RPC追加で接続 |
| R8 | monthly_report 削除時の孤児 | `distributions` FK は `ON DELETE CASCADE`。importの置換処理に削除追記（4-B） |
| R9 | role二重管理 | enum と app_metadata.role 両更新をrunbook化 |

## 発注元への確認推奨3点（4-B着手前に解消）
1. **スカウト報酬の計算単位**: ライバー獲得ベース（`liver_scouts`）か代理店経由（`scout_agencies`）か。→ 本設計は両パス用意済み。
2. **トータルサイドの実体**: `payee_kind='total_side'` は起点（実体なし）想定。専用 `agencies` 行/テーブルが要るか。
3. **マネージャーは csv 生データを閲覧すべきか**: 分配明細のみで足りるなら 037 の csv_data RLS 拡張は不要。
