"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/utils/supabase/server";
import type { Attempt, ModuleProgressRow } from "@/lib/progress";

// ============ AUTH ============

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Rota que trata o link de confirmação enviado por e-mail — só é
      // usada se "Confirm email" estiver ativado no Supabase. Com a
      // confirmação desativada (modo atual, para testes), o signUp já
      // devolve uma sessão válida e o usuário entra direto.
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message };
  }
  if (data.session) {
    // Confirmação por e-mail está desativada: já veio logado.
    redirect("/");
  }
  // Confirmação por e-mail ativada: sem sessão ainda, precisa checar o e-mail.
  return { needsConfirmation: true };
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const redirectTo = String(formData.get("redirectTo") || "/");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }
  redirect(redirectTo || "/");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ============ EXAM SUBMISSION ============

const PASS_THRESHOLD = 70;

export async function submitExamResult(moduleId: number, correct: number, total: number) {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  const { userId, supabase } = auth;

  const pct = Math.round((correct / total) * 1000) / 10;
  const passed = pct >= PASS_THRESHOLD;

  const { data: existingRows } = await supabase
    .from("module_progress")
    .select("*")
    .eq("user_id", userId)
    .in("module_id", [moduleId, moduleId + 1]);

  const existing = (existingRows ?? []).find((r) => r.module_id === moduleId) as
    | ModuleProgressRow
    | undefined;
  const nextExisting = (existingRows ?? []).find((r) => r.module_id === moduleId + 1) as
    | ModuleProgressRow
    | undefined;

  const prevAttempts: Attempt[] = existing?.attempts ?? [];
  const newAttempt: Attempt = { date: new Date().toISOString(), correct, total, pct, passed };
  const attempts = [...prevAttempts, newAttempt];
  const bestPct = existing?.best_pct != null ? Math.max(existing.best_pct, pct) : pct;
  const status = passed ? "passed" : existing?.status === "locked" ? "unlocked" : (existing?.status ?? "unlocked");

  const { error: upsertError } = await supabase.from("module_progress").upsert(
    {
      user_id: userId,
      module_id: moduleId,
      status,
      attempts,
      best_pct: bestPct,
      last_pct: pct,
    },
    { onConflict: "user_id,module_id" }
  );
  if (upsertError) throw upsertError;

  // Desbloqueia o próximo módulo, sem sobrescrever progresso existente nele.
  if (passed && moduleId < 20 && (!nextExisting || nextExisting.status === "locked")) {
    await supabase.from("module_progress").upsert(
      {
        user_id: userId,
        module_id: moduleId + 1,
        status: "unlocked",
        attempts: nextExisting?.attempts ?? [],
        best_pct: nextExisting?.best_pct ?? null,
        last_pct: nextExisting?.last_pct ?? null,
      },
      { onConflict: "user_id,module_id" }
    );
  }

  revalidatePath("/");
  revalidatePath("/modulos");

  return { correct, total, pct, passed };
}
