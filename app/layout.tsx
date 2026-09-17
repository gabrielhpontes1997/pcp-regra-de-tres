import type { Metadata } from "next";
import "./globals.css";
import { requireUser } from "@/utils/supabase/server";
import { signOutAction } from "./actions";

export const metadata: Metadata = {
  title: "PCP Cerâmico — Formação em Regra de Três",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireUser();

  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div id="shell">
          <div className="topbar">
            <a className="brand" href="/">
              <div className="brand-mark">3:1</div>
              <div className="brand-text">
                <div className="t1">PCP CERÂMICO</div>
                <div className="t2">Formação em Regra de Três</div>
              </div>
            </a>
            {auth && (
              <form action={signOutAction}>
                <button className="btn secondary" type="submit" style={{ padding: "8px 14px", fontSize: 12 }}>
                  SAIR
                </button>
              </form>
            )}
          </div>
          {children}
          <footer className="appfooter">
            PCP CERÂMICO · FORMAÇÃO EM REGRA DE TRÊS · progresso salvo na sua conta
          </footer>
        </div>
      </body>
    </html>
  );
}
