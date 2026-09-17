import { redirect } from "next/navigation";
import { requireUser } from "@/utils/supabase/server";
import { getProgressMap, overallPercent, currentModuleId, averageScore, bestScoreOverall } from "@/lib/progress";
import { THEORY } from "@/lib/theory";

export default async function DashboardPage() {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  const { userId, supabase } = auth;

  const map = await getProgressMap(supabase, userId);
  const pct = overallPercent(map);
  const curId = currentModuleId(map);
  const curMod = THEORY.find((m) => m.n === curId)!;
  const curStatus = map[curId];
  const passedCount = Object.values(map).filter((m) => m.status === "passed").length;
  const totalAnswered = Object.values(map).reduce(
    (acc, m) => acc + m.attempts.reduce((a, at) => a + at.total, 0),
    0
  );

  let statusLabel = "Não iniciado", statusClass = "";
  if (curStatus.attempts.length > 0 && curStatus.status !== "passed") { statusLabel = "Em andamento"; statusClass = "accent"; }
  else if (curStatus.status === "passed") { statusLabel = "Aprovado"; statusClass = "ok"; }
  else if (curStatus.status === "unlocked") { statusLabel = "Disponível"; statusClass = "accent"; }

  return (
    <>
      <div className="panel">
        <div className="eyebrow">DASHBOARD DO ALUNO</div>
        <h1>Do básico ao avançado aplicado ao PCP</h1>
        <p>20 módulos · progressão obrigatória · aprovação mínima de 70% por módulo</p>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-faint)", marginBottom: 6 }}>
          <span>PROGRESSO GERAL</span><span>{pct}%</span>
        </div>
        <div className="progressbar-track"><div className="progressbar-fill" style={{ width: `${pct}%` }} /></div>

        <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="eyebrow">MÓDULO ATUAL</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Módulo {String(curId).padStart(2, "0")} — {curMod.titulo}</div>
          </div>
          <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
        </div>
        <div className="btn-row">
          <a className="btn" href={curId === 20 && curStatus.status === "passed" ? "/certificado" : `/modulos/${curId}`}>
            {curId === 20 && curStatus.status === "passed" ? "VER CERTIFICADO" : "CONTINUAR ESTUDOS"}
          </a>
          <a className="btn secondary" href="/modulos">VER TODOS OS MÓDULOS</a>
        </div>
      </div>

      <div className="panel">
        <div className="eyebrow" style={{ marginBottom: 10 }}>DESEMPENHO</div>
        <div className="stat-grid">
          <div className="stat-box"><div className="stat-num">{passedCount}/20</div><div className="stat-lbl">Módulos concluídos</div></div>
          <div className="stat-box"><div className="stat-num">{bestScoreOverall(map)}%</div><div className="stat-lbl">Melhor desempenho</div></div>
          <div className="stat-box"><div className="stat-num">{averageScore(map)}%</div><div className="stat-lbl">Média das provas</div></div>
          <div className="stat-box"><div className="stat-num">{totalAnswered}</div><div className="stat-lbl">Questões respondidas</div></div>
        </div>
      </div>
    </>
  );
}
