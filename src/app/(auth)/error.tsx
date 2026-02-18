"use client";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h2 className="text-xl font-semibold">エラーが発生しました</h2>
      <p className="text-muted-foreground text-sm">
        {error.message || "予期しないエラーが発生しました。"}
      </p>
      <button
        type="button"
        className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
        onClick={reset}
      >
        再試行
      </button>
    </div>
  );
}
