import type { SupabaseClient } from "@supabase/supabase-js";

export type ModuleStatus = "locked" | "unlocked" | "passed";

export interface Attempt {
  date: string;
  correct: number;
  total: number;
  pct: number;
  passed: boolean;
}

export interface ModuleProgressRow {
  module_id: number;
  status: ModuleStatus;
  attempts: Attempt[];
  best_pct: number | null;
  last_pct: number | null;
}

export type ProgressMap = Record<number, ModuleProgressRow>;

/** Busca todas as linhas de progresso do usuário autenticado (RLS já
 * garante que só vêm linhas dele). Módulos sem linha ainda são
 * tratados como padrão: módulo 1 "unlocked", os demais "locked". */
export async function getProgressMap(
  supabase: SupabaseClient,
  userId: string
): Promise<ProgressMap> {
  const { data, error } = await supabase
    .from("module_progress")
    .select("module_id, status, attempts, best_pct, last_pct")
    .eq("user_id", userId);

  if (error) throw error;

  const map: ProgressMap = {};
  for (let i = 1; i <= 20; i++) {
    map[i] = {
      module_id: i,
      status: i === 1 ? "unlocked" : "locked",
      attempts: [],
      best_pct: null,
      last_pct: null,
    };
  }
  (data ?? []).forEach((row) => {
    map[row.module_id] = row as ModuleProgressRow;
  });
  return map;
}

export function overallPercent(map: ProgressMap): number {
  const passed = Object.values(map).filter((m) => m.status === "passed").length;
  return Math.round((passed / 20) * 100);
}
export function currentModuleId(map: ProgressMap): number {
  for (let i = 1; i <= 20; i++) if (map[i].status !== "passed") return i;
  return 20;
}
export function averageScore(map: ProgressMap): number {
  let sum = 0, n = 0;
  Object.values(map).forEach((m) => { if (m.last_pct !== null) { sum += m.last_pct; n++; } });
  return n ? Math.round(sum / n) : 0;
}
export function bestScoreOverall(map: ProgressMap): number {
  let best = 0;
  Object.values(map).forEach((m) => { if (m.best_pct !== null) best = Math.max(best, m.best_pct); });
  return best;
}
