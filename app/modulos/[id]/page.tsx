import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/utils/supabase/server";
import { getProgressMap } from "@/lib/progress";
import { THEORY } from "@/lib/theory";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const moduleId = Number(id);
  const m = THEORY.find((t) => t.n === moduleId);
  if (!m) notFound();

  const auth = await requireUser();
  if (!auth) redirect("/login");
  const { userId, supabase } = auth;
  const map = await getProgressMap(supabase, userId);
  const p = map[moduleId];

  if (p.status === "locked") {
    return (
      <div className="panel">
        <h2>Módulo bloqueado</h2>
        <p>Conclua o módulo anterior com 70% ou mais para desbloquear este conteúdo.</p>
        <a className="btn" href="/modulos">VOLTAR AOS MÓDULOS</a>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="eyebrow">MÓDULO {String(moduleId).padStart(2, "0")} DE 20</div>
      <h1>{m.titulo}</h1>
      <p><strong>Objetivo:</strong> {m.objetivo}</p>

      <div className="lesson-section">
        <h3>Conteúdo</h3>
        {m.teoria.map((par, i) => <p key={i}>{par}</p>)}
      </div>

      <div className="lesson-section">
        <h3>Exemplo simples</h3>
        <ul>{m.exemplosSimples.map((e, i) => <li key={i}>{e}</li>)}</ul>
      </div>

      <div className="lesson-section">
        <h3>Aplicado à cerâmica</h3>
        {m.exemplosCeramica.map((e, i) => <div className="ceramic-box" key={i}>{e}</div>)}
      </div>

      <div className="lesson-section">
        <h3>Passo a passo</h3>
        {m.passoAPasso.map((s, i) => {
          const parts = s.split(":");
          parts.shift();
          return (
            <div className="step-item" key={i}>
              <span className="step-num">{i + 1}</span>
              <span>{parts.join(":").trim()}</span>
            </div>
          );
        })}
      </div>

      <div className="lesson-section">
        <h3>Erros comuns</h3>
        <ul>{m.errosComuns.map((e, i) => <li key={i}>{e}</li>)}</ul>
      </div>

      <div className="lesson-section">
        <h3>Dicas práticas</h3>
        <ul>{m.dicas.map((e, i) => <li key={i}>{e}</li>)}</ul>
      </div>

      <div className="lesson-section">
        <h3>Resumo do módulo</h3>
        <p>{m.resumo}</p>
      </div>

      <div className="lesson-section">
        <h3>Checklist de aprendizagem</h3>
        {m.checklist.map((c, i) => (
          <div className="checklist-item" key={i}>
            <span className="check-box" />
            <span>{c}</span>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 18, fontWeight: 600, color: "var(--text)" }}>
        Você está pronto para fazer a prova?
      </p>
      <div className="btn-row">
        <a className="btn" href={`/modulos/${moduleId}/prova`}>INICIAR PROVA</a>
        <a className="btn secondary" href="/modulos">VOLTAR AOS MÓDULOS</a>
      </div>
    </div>
  );
}
