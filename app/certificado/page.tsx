
import { redirect } from "next/navigation";
import { requireUser } from "@/utils/supabase/server";
import { getProgressMap, averageScore } from "@/lib/progress";

export default async function CertificadoPage() {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  const { userId, supabase } = auth;
  const map = await getProgressMap(supabase, userId);
  const allPassed = Object.values(map).every((m) => m.status === "passed");

  if (!allPassed) {
    return (
      <div className="panel">
        <h2>Certificado indisponível</h2>
        <p>Conclua os 20 módulos com aprovação para liberar seu certificado.</p>
        <a className="btn" href="/modulos">VER MÓDULOS</a>
      </div>
    );
  }

  const totalAnswered = Object.values(map).reduce(
    (acc, m) => acc + m.attempts.reduce((a, at) => a + at.total, 0),
    0
  );
  const date = new Date().toLocaleDateString("pt-BR");

  return (
    <>
      <div className="panel">
        <div className="cert">
          <div className="cert-eyebrow">CERTIFICADO DE CONCLUSÃO</div>
          <div className="cert-title">FORMAÇÃO CONCLUÍDA</div>
          <div className="cert-sub">PCP Cerâmico — Regra de Três aplicada ao Planejamento e Controle da Produção</div>
          <div className="cert-stats">
            <div><div className="cert-stat-num">20/20</div><div className="cert-stat-lbl">Módulos concluídos</div></div>
            <div><div className="cert-stat-num">{averageScore(map)}%</div><div className="cert-stat-lbl">Percentual médio</div></div>
            <div><div className="cert-stat-num">{totalAnswered}</div><div className="cert-stat-lbl">Questões respondidas</div></div>
          </div>
          <div className="cert-date">Concluído em {date}</div>
        </div>
      </div>
      <div className="panel"><a className="btn secondary" href="/">VOLTAR AO DASHBOARD</a></div>
    </>
  );
}
