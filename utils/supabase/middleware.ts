import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/auth/confirm"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Com Fluid Compute / edge, nunca reutilize este cliente entre requisições:
  // crie um novo a cada chamada de middleware.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() valida o JWT contra as chaves públicas do projeto a cada
  // chamada — é o método correto para checagem de sessão no servidor.
  // getSession() NÃO revalida o token e nunca deve ser usado para
  // controle de acesso.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = !!data?.claims;

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!isAuthenticated && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // IMPORTANTE: sempre devolva supabaseResponse (ou uma cópia com os
  // mesmos cookies) — devolver um NextResponse novo aqui descartaria os
  // cookies de sessão renovados e deslogaria o usuário de forma
  // intermitente.
  return supabaseResponse;
}
