import { redirect } from "next/navigation";
import { requireUser } from "@/utils/supabase/server";
import { getProgressMap, currentModuleId } from "@/lib/progress";
import { THEORY } from "@/lib/theory";

export default async function ModulosPage() {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  const { userId, supabase } = auth;
  const map = await getProgressMap(supabase, userId);
  const curId = currentModuleId(map);

  return (
    <>
      <div className="panel">
        <h1>Trilha de módulos</h1>
        <p>Complete cada módulo com 70% ou mais para desbloquear o próximo.</p>
      </div>
      <div className="mod-grid">
        {THEORY.map((m) => {
          const p = map[m.n];
          let statusClass = "", badge, actionLabel = "INICIAR MÓDULO";
          if (p.status === "locked") {
            statusClass = "status-locked";
            badge = <span className="status-pill">🔒 BLOQUEADO</span>;
          } else if (p.status === "passed") {
            statusClass = "status-done";
            badge = <span className="status-pill ok">APROVADO {p.best_pct}%</span>;
            actionLabel = "REVISAR";
          } else {
            statusClass = m.n === curId ? "status-current" : "";
            badge = p.attempts.length > 0
              ? <span className="status-pill bad">ÚLTIMA: {p.last_pct}%</span>
              : <span className="status-pill">DISPONÍVEL</span>;
            actionLabel = p.attempts.length > 0 ? "REVISAR / TENTAR NOVAMENTE" : "INICIAR MÓDULO";
          }
          return (
            <div className={`mod-card ${statusClass}`} key={m.n}>
              <div className="mod-card-top">
                <div>
                  <div className="mod-num">MÓDULO {String(m.n).padStart(2, "0")}</div>
                  <div className="mod-name">{m.titulo}</div>
                </div>
                {badge}
              </div>
              <div className="mod-desc">{m.objetivo}</div>
              <div className="mod-meta">
                <span>{p.attempts.length} tentativa{p.attempts.length === 1 ? "" : "s"}</span>
                <span>12 questões</span>
              </div>
              {p.status === "locked" ? (
                <button className="btn secondary" disabled>BLOQUEADO</button>
              ) : (
                <a className="btn" href={`/modulos/${m.n}`}>{actionLabel}</a>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
