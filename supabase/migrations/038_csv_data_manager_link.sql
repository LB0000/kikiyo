-- ============================================
-- csv_data に manager_id（派生・任意）を追加
-- ============================================
-- 要望#4 / 4-A（docs/4A_data_model_design.md）。
-- マネージャー単位の月次集計を高速化するための非正規化（派生）列。
-- 真実のソースは manager_agencies（agency_id → manager_id）であり、本列はキャッシュ。
-- 4-B の再計算RPC（recalculate_distributions 等）で agency_id から解決して同期する。
-- 手動更新は禁止（RPC経由のみ）。NULL 許容（紐付け前・解決不能行）。

-- ON DELETE SET NULL: 派生キャッシュ列のため、マネージャー削除時はキャッシュを NULL に戻す
-- （真実のソースは manager_agencies。明細の確定値は distributions スナップショットが保持）。
ALTER TABLE csv_data ADD COLUMN manager_id UUID REFERENCES managers(id) ON DELETE SET NULL;
CREATE INDEX idx_csv_data_manager ON csv_data(manager_id) WHERE manager_id IS NOT NULL;

COMMENT ON COLUMN csv_data.manager_id IS '派生キャッシュ列。真実のソースは manager_agencies。4-B のRPCでのみ同期する';
