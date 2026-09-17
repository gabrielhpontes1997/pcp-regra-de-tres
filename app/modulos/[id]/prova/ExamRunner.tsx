
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { generateExam, type Question } from "@/lib/generators";
import { submitExamResult } from "@/app/actions";

type Answer = { selected: number; confirmed: boolean; correct: boolean } | null;

const LETTERS = ["A", "B", "C", "D"];

export default function ExamRunner({ moduleId }: { moduleId: number }) {
  const router = useRouter();
  // gerado uma única vez por montagem (nova tentativa = nova navegação = novo componente)
  const questions = useMemo<Question[]>(() => generateExam(moduleId), [moduleId]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(new Array(questions.length).fill(null));
  const [result, setResult] = useState<null | { correct: number; total: number; pct: number; passed: boolean }>(null);
  const [submitting, setSubmitting] = useState(false);

  const q = questions[index];
  const ans = answers[index];

  function selectOption(i: number) {
    if (ans?.confirmed) return;
    const next = [...answers];
    next[index] = { selected: i, confirmed: false, correct: false };
    setAnswers(next);
  }
  function confirmAnswer() {
    if (!ans) return;
    const next = [...answers];
    next[index] = { ...ans, confirmed: true, correct: !!q.options[ans.selected].correct };
    setAnswers(next);
  }
  async function nextOrFinish() {
    if (index < questions.length - 1) {
      setIndex(index + 1);
    } else {
      const correct = answers.filter((a) => a?.correct).length;
      setSubmitting(true);
      const r = await submitExamResult(moduleId, correct, questions.length);
      setSubmitting(false);
      setResult(r);
    }
  }

  if (result) {
    const wrongItems = questions
      .map((qq, i) => ({ qq, a: answers[i]! }))
      .filter((x) => !x.a.correct);

    return (
      <>
        <div className="panel result-hero">
          <div className="eyebrow">RESULTADO — MÓDULO {String(moduleId).padStart(2, "0")}</div>
          <div className="result-score">{result.correct} / {result.total}</div>
          <div className="result-pct">{result.pct.toString().replace(".", ",")}%</div>
          <span className={`result-status ${result.passed ? "ok" : "bad"}`}>
            {result.passed ? "✓ APROVADO" : "✕ NÃO APROVADO"}
          </span>
          <p style={{ marginTop: 16 }}>
            {result.passed
              ? "Parabéns! Você atingiu o mínimo de 70% e desbloqueou o próximo módulo."
              : "Você precisa atingir pelo menos 70% para avançar. Revise o conteúdo e tente novamente."}
          </p>
          <div className="btn-row" style={{ justifyContent: "center" }}>
            {result.passed ? (
              <button className="btn" onClick={() => router.push(moduleId >= 20 ? "/certificado" : `/modulos/${moduleId + 1}`)}>
                {moduleId >= 20 ? "VER CERTIFICADO" : "PRÓXIMO MÓDULO"}
              </button>
            ) : (
              <button className="btn" onClick={() => router.push(`/modulos/${moduleId}/prova`)}>
                TENTAR NOVAMENTE
              </button>
            )}
            <button className="btn secondary" onClick={() => router.push(`/modulos/${moduleId}`)}>REVISAR MÓDULO</button>
          </div>
        </div>
        {wrongItems.length > 0 && (
          <div className="panel" style={{ marginTop: 14 }}>
            <h2>Questões que você errou</h2>
            {wrongItems.map(({ qq, a }, i) => (
              <div className="review-item" key={i}>
                <div className="review-q">{qq.statement}</div>
                <p style={{ marginBottom: 4 }}>
                  Sua resposta: <strong style={{ color: "var(--bad)" }}>{LETTERS[a.selected]}) {qq.options[a.selected].text}</strong>
                </p>
                <p style={{ marginBottom: 4 }}>
                  Resposta correta: <strong style={{ color: "var(--ok)" }}>
                    {LETTERS[qq.options.findIndex((o) => o.correct)]}) {qq.options.find((o) => o.correct)!.text}
                  </strong>
                </p>
                <p>{qq.explanation}</p>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  const pct = Math.round((index / questions.length) * 100);

  return (
    <div className="panel">
      <div className="exam-header">
        <span>PROVA — MÓDULO {String(moduleId).padStart(2, "0")}</span>
        <span>Questão {index + 1} de {questions.length}</span>
      </div>
      <div className="progressbar-track" style={{ marginBottom: 6 }}>
        <div className="progressbar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="exam-q">{q.statement}</div>
      {q.options.map((o, i) => {
        let cls = "option";
        if (ans) {
          if (ans.confirmed) {
            if (o.correct) cls += " correct";
            else if (i === ans.selected) cls += " incorrect";
          } else if (i === ans.selected) cls += " selected";
        }
        return (
          <div className={cls} key={i} onClick={() => selectOption(i)}>
            <span className="option-letter">{LETTERS[i]}</span>
            <span>{o.text}</span>
          </div>
        );
      })}
      {ans?.confirmed && (
        <div className={`feedback-box ${ans.correct ? "ok" : "bad"}`}>
          <div className={`feedback-title ${ans.correct ? "ok" : "bad"}`}>
            {ans.correct ? "✓ RESPOSTA CORRETA" : "✕ RESPOSTA INCORRETA"}
          </div>
          {q.explanation}
        </div>
      )}
      <div className="btn-row">
        {!ans && <button className="btn" disabled>CONFIRMAR RESPOSTA</button>}
        {ans && !ans.confirmed && <button className="btn" onClick={confirmAnswer}>CONFIRMAR RESPOSTA</button>}
        {ans?.confirmed && (
          <button
            className="btn"
            disabled={submitting}
            onClick={() => {
              if (index === questions.length - 1) {
                if (confirm("Finalizar a prova? Você não poderá alterar as respostas depois.")) nextOrFinish();
              } else {
                nextOrFinish();
              }
            }}
          >
            {submitting ? "ENVIANDO…" : index === questions.length - 1 ? "FINALIZAR PROVA" : "PRÓXIMA QUESTÃO"}
          </button>
        )}
      </div>
    </div>
  );
}
