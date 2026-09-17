"use client";

import { useState } from "react";
import { signUpAction } from "@/app/actions";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (done) {
    return (
      <div className="panel auth-form">
        <div className="eyebrow">QUASE LÁ</div>
        <h1>Confirme seu e-mail</h1>
        <p>Enviamos um link de confirmação. Clique nele para ativar sua conta e poder entrar.</p>
      </div>
    );
  }

  return (
    <div className="panel auth-form">
      <div className="eyebrow">NOVO ALUNO</div>
      <h1>Criar conta</h1>
      <p>Seu progresso na formação fica salvo nesta conta.</p>
      {error && <div className="error">{error}</div>}
      <form
        action={async (formData) => {
          setPending(true);
          setError(null);
          const res = await signUpAction(formData);
          if (res?.error) setError(res.error);
          else if (res?.needsConfirmation) setDone(true);
          setPending(false);
        }}
      >
        <input type="email" name="email" placeholder="E-mail" required autoComplete="email" />
        <input
          type="password"
          name="password"
          placeholder="Senha (mínimo 6 caracteres)"
          required
          minLength={6}
          autoComplete="new-password"
        />
        <button className="btn" type="submit" disabled={pending} style={{ width: "100%" }}>
          {pending ? "CRIANDO…" : "CRIAR CONTA"}
        </button>
      </form>
      <div className="switch">
        Já tem conta? <a href="/login" style={{ color: "var(--accent)" }}>Entrar</a>
      </div>
    </div>
  );
}
