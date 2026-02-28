/**
 * 日本語 UI ラベル定数 — テスト全体で再利用
 */
export const JP = {
  // ── ログイン ──
  EMAIL_LABEL: "メールアドレス",
  PASSWORD_LABEL: "パスワード",
  LOGIN_BUTTON: "ログイン",
  LOGGING_IN: "ログイン中...",
  LOGOUT_BUTTON: "ログアウト",
  FORGOT_PASSWORD: "パスワードをお忘れの方",
  LOGIN_DESCRIPTION: "アカウントにログインしてください",
  LOGIN_ERROR: "ログインに失敗しました",
  LOGIN_ERROR_DESC: "メールアドレスまたはパスワードが正しくありません。",

  // ── パスワードリセット（ログインページダイアログ） ──
  PASSWORD_RESET_TITLE: "パスワードリセット",
  PASSWORD_RESET_DESC: "登録されたメールアドレスにリセットリンクを送信します。",
  RESET_SEND_BUTTON: "リセットリンクを送信",
  RESET_SENDING: "送信中...",

  // ── パスワードリセットページ ──
  RESET_PAGE_TITLE: "パスワードリセット",
  RESET_PAGE_DESC: "新しいパスワードを設定してください",
  NEW_PASSWORD_LABEL: "新しいパスワード",
  CONFIRM_PASSWORD_LABEL: "パスワード確認",
  UPDATE_PASSWORD_BUTTON: "パスワードを更新",
  UPDATING_PASSWORD: "更新中...",
  PASSWORD_MISMATCH: "パスワードが一致しません",
  PASSWORD_TOO_SHORT: "パスワードは8文字以上で入力してください",
  PASSWORD_COMPLEXITY: "パスワードには英大文字・小文字・数字を含めてください",

  // ── パスワード変更（設定ページ） ──
  SETTINGS_HEADING: "パスワード変更",
  SETTINGS_CARD_TITLE: "新しいパスワードを設定",
  SETTINGS_CARD_DESC: "英大文字・小文字・数字を含む8文字以上で入力してください",
  CURRENT_PASSWORD_LABEL: "現在のパスワード",
  NEW_PASSWORD_SETTINGS: "新しいパスワード",
  CONFIRM_PASSWORD_SETTINGS: "新しいパスワード（確認）",
  CHANGE_PASSWORD_BUTTON: "パスワードを変更",
  CHANGING_PASSWORD: "変更中...",
  PASSWORD_SAME_ERROR: "現在のパスワードと同じパスワードは設定できません",
  PASSWORD_NEW_MISMATCH: "新しいパスワードが一致しません",

  // ── サイドバー ──
  SIDEBAR_MENU_LABEL: "メニュー",
  PASSWORD_CHANGE: "パスワード変更",

  // ── ナビ項目 ──
  NAV_LIVERS: "ライバー名簿",
  NAV_AGENCIES: "代理店一覧",
  NAV_DASHBOARD: "TikTokバックエンド",
  NAV_BACKSTAGE: "TikTok Backstage",
  NAV_ALL_APPS: "申請一覧",
  NAV_APPS: "TikTok申請",
  NAV_INVOICES: "請求書",

  // ── ダッシュボード ──
  DASHBOARD_HEADING: "オールインTikTokバックエンド",
  DASHBOARD_DESC: "月次レポートとデータの確認・管理",
  CSV_UPLOAD: "CSV登録",
  EXCHANGE_RATE: "為替レート変更",
  REFUND_REGISTER: "返金登録",
  SPECIAL_BONUS_REGISTER: "特別ボーナス登録",
  DATA_TAB: "データ一覧",
  REFUND_TAB: "返金一覧",
  SPECIAL_BONUS_TAB: "特別ボーナス一覧",
  FILTER_ALL: "全表示",
  FILTER_AGENCY: "代理店指定",
  DISPLAY_PERIOD: "表示期間",

  // ── CSV アップロードダイアログ ──
  CSV_DIALOG_TITLE: "CSVアップロード",
  CSV_FILE_LABEL: "CSVファイル",
  CSV_RATE_LABEL: "為替レート",
  CSV_TASK_LABEL: "収益タスク",
  CSV_UPLOAD_BUTTON: "CSVをアップロード",

  // ── 返金ダイアログ ──
  REFUND_DIALOG_TITLE: "返金登録",

  // ── 特別ボーナスダイアログ ──
  SPECIAL_BONUS_DIALOG_TITLE: "特別ボーナス登録",

  // ── 為替レートダイアログ ──
  EXCHANGE_RATE_DIALOG_TITLE: "為替レート変更",

  // ── 代理店 ──
  AGENCY_LIST: "代理店リスト",
  AGENCY_DESC: "代理店の登録情報と契約条件の管理",
  AGENCY_REGISTER: "代理店登録",
  NEW_AGENCY_TITLE: "代理店新規登録",
  AGENCY_SEARCH: "代理店名で検索",
  AGENCY_RANK_FILTER: "ランク絞り込み",
  AGENCY_STATUS_FILTER: "ステータス絞り込み",
  AGENCY_STATUS_ALL: "すべてのステータス",
  AGENCY_STATUS_NOT_INVITED: "未招待",
  AGENCY_STATUS_INVITED: "招待済",
  AGENCY_STATUS_ACTIVE: "利用開始",

  // ── ライバー ──
  LIVER_LIST: "ライバー名簿",
  LIVER_DESC: "配信者の情報管理と申請状況の確認",
  LIVER_EDIT_TITLE: "ライバー情報更新",
  BULK_STATUS: "申請状況一括変更",
  CSV_IMPORT: "CSVインポート",
  LIVER_SEARCH: "氏名・ID・ニックネームで検索",
  LIVER_STATUS_FILTER: "ステータス絞り込み",

  // ── 申請フォーム ──
  APPLICATION_HEADING: "TikTok申請",
  APPLICATION_DESC: "各種申請フォームの入力と送信",
  CONFIRM_BUTTON: "確認画面へ",
  BACK_BUTTON: "戻る",
  SUBMIT_BUTTON: "送信",
  NEW_APPLICATION: "新しい申請を作成",
  STEP_INPUT: "入力",
  STEP_CONFIRM: "確認",
  STEP_COMPLETE: "完了",
  OTHER_APP_TYPES: "その他の申請種別",

  // ── 申請一覧 ──
  ALL_APPLICATIONS_HEADING: "申請一覧",
  ALL_APPLICATIONS_DESC: "すべての申請の確認とステータス管理",
  ALL_APPLICATIONS_SEARCH: "代理店名・氏名・メールで検索",
  APPLICATION_DETAIL_TITLE: "申請詳細",

  // ── 請求書 ──
  INVOICE_LIST: "請求書一覧",
  INVOICE_DESC: "月次レポートに基づく請求書の管理",
  INVOICE_CREATE: "請求書作成",
  INVOICE_SEARCH: "代理店名・請求書番号で検索",

  // ── 共通 ──
  SAVE: "保存",
  CANCEL: "キャンセル",
  CSV_EXPORT: "CSVエクスポート",
  UPDATE: "更新する",
} as const;
