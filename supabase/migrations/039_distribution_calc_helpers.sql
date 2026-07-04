-- ============================================
-- 分配計算ヘルパ（率解決 ＋ %の掛け方の戦略隔離）
-- ============================================
-- 要望#4 / 4-B（docs/4B_distribution_calc_design.md）。
-- 中核RPC recalculate_distributions（040）から呼ぶ純粋関数群。
--
-- ⚠️ %の掛け方（並列(あ)/カスケード(い)）は発注元 v5 回答待ち。
--    切替点はこのファイルの calc_distribution_base() 1関数のみに物理隔離する。
--    回答到着後、本体を 1〜2 行差し替えるだけで切替できる（040 は不変）。
--    現状デフォルトは「並列(あ)＝みんな同じ gross が基準」。
--
-- これらは recalculate_distributions（SECURITY DEFINER・admin限定）からのみ呼ばれる
-- 内部ヘルパ。distribution_rules は admin RLS だが、定義者文脈（テーブルowner）で
-- 実行されるため RLS をバイパスして率を解決できる。

-- --------------------------------------------
-- 率解決: 指定スコープ×分配先のアクティブな分配率を返す（無ければ 0）
-- --------------------------------------------
-- 排他的アークのため、payee_kind に対応する1つの id だけが非NULL。
-- 035 の uq_distribution_rules_active により (agency, payee_kind, payee) は一意 → LIMIT 1 は
-- 最大1行の防御的指定（実質ユニーク保証済み）。

-- 040 の tier1/tier2 ループは (agency_id, payee_kind) WHERE is_deleted=false で絞るため複合インデックスを追加。
CREATE INDEX IF NOT EXISTS idx_distribution_rules_agency_kind
  ON public.distribution_rules(agency_id, payee_kind)
  WHERE is_deleted = false;
CREATE OR REPLACE FUNCTION public.get_distribution_rate(
  p_agency_id UUID,
  p_payee_kind payee_kind,
  p_manager_id UUID,
  p_scout_id UUID,
  p_payee_agency_id UUID
)
RETURNS NUMERIC AS $$
  SELECT COALESCE(
    (SELECT dr.rate
       FROM public.distribution_rules dr
      WHERE dr.agency_id = p_agency_id
        AND dr.payee_kind = p_payee_kind
        AND dr.is_deleted = false
        AND COALESCE(dr.manager_id, '00000000-0000-0000-0000-000000000000')
              = COALESCE(p_manager_id, '00000000-0000-0000-0000-000000000000')
        AND COALESCE(dr.scout_id, '00000000-0000-0000-0000-000000000000')
              = COALESCE(p_scout_id, '00000000-0000-0000-0000-000000000000')
        AND COALESCE(dr.payee_agency_id, '00000000-0000-0000-0000-000000000000')
              = COALESCE(p_payee_agency_id, '00000000-0000-0000-0000-000000000000')
      LIMIT 1),
    0
  );
$$ LANGUAGE sql STABLE SET search_path = public;

-- --------------------------------------------
-- ★切替点★ 分配率を掛ける「基準額」を返す（並列/カスケードの唯一の隔離点）
-- --------------------------------------------
--   p_gross   … その source の元本（円・既に丸め済み）
--   p_running … その source で既に分配済みの累計額（円）
--
-- 並列(あ): 全員が同じ p_gross を基準にする      → RETURN p_gross;
-- カスケード(い): 残額 (p_gross - p_running) を基準 → RETURN p_gross - p_running;
--
-- 発注元回答が「カスケード(い)」だった場合は、下の本体を
--   RETURN p_gross - p_running;
-- の 1 行に差し替えるだけでよい（コメントのブロックも入替）。
CREATE OR REPLACE FUNCTION public.calc_distribution_base(
  p_gross NUMERIC,
  p_running NUMERIC
)
RETURNS NUMERIC AS $$
  -- 並列(あ)＝デフォルト。全分配先が同じ元本を基準に計算する。
  SELECT p_gross;
  -- カスケード(い)に切り替える場合は上を消し、下を有効化:
  -- SELECT p_gross - p_running;
$$ LANGUAGE sql IMMUTABLE;

-- --------------------------------------------
-- 分配額: ROUND(base × rate, 2)（明細 amount_jpy の単一計算口）
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.calc_distribution_amount(
  p_base NUMERIC,
  p_rate NUMERIC
)
RETURNS NUMERIC AS $$
  SELECT ROUND(p_base * p_rate, 2);
$$ LANGUAGE sql IMMUTABLE;
