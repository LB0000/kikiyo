"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("パスワードが一致しません");
      return;
    }

    if (password.length < 8) {
      toast.error("パスワードは8文字以上で入力してください");
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error("パスワードには英大文字・小文字・数字を含めてください");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      toast.error("パスワードの更新に失敗しました", {
        description: error.message,
      });
    } else {
      toast.success("パスワードを更新しました");
      router.push("/dashboard");
    }

    setLoading(false);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.7_0.18_350_/_0.05),transparent,transparent)]" />
      <Card className="relative w-full max-w-md overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary/70" />
        <CardHeader className="pt-8 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
            <Image src="/logo.png" alt="KIKIYO" width={36} height={36} />
          </div>
          <CardTitle className="text-2xl font-bold tracking-wider">
            パスワードリセット
          </CardTitle>
          <CardDescription className="mt-2">
            新しいパスワードを設定してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">新しいパスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">パスワード確認</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "更新中..." : "パスワードを更新"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
