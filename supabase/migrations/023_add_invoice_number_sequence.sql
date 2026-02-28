-- 請求書番号の生成をシーケンステーブル方式に変更
-- SELECT→INSERT の競合を排除し、原子的に番号を採番する
-- 全行ロックを避け、プレフィックスごとに1行だけロックする

CREATE TABLE IF NOT EXISTS public.invoice_number_sequences (
  prefix TEXT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
);

ALTER TABLE public.invoice_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_seq_admin ON public.invoice_number_sequences
  FOR ALL USING (get_user_role() = 'system_admin');

CREATE OR REPLACE FUNCTION public.next_invoice_number(p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  v_seq INT;
BEGIN
  -- プレフィックス行がなければ挿入（初回のみ）
  INSERT INTO public.invoice_number_sequences (prefix, last_number)
  VALUES (p_prefix, 0)
  ON CONFLICT (prefix) DO NOTHING;

  -- 1行だけロックしてインクリメント
  UPDATE public.invoice_number_sequences
  SET last_number = last_number + 1
  WHERE prefix = p_prefix
  RETURNING last_number INTO v_seq;

  RETURN p_prefix || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
