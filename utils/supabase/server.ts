import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado a partir de um Server Component — pode ser ignorado
            // porque o middleware já renova a sessão a cada requisição.
          }
        },
      },
    }
  );
}

/**
 * Helper para páginas/Server Actions que exigem usuário autenticado.
 * Usa getClaims() (não getSession()/getUser()) porque é o único método
 * que valida a assinatura do JWT a cada chamada — é o que a Supabase
 * recomenda atualmente para proteger dados e rotas no servidor.
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;
  return { userId: data.claims.sub as string, supabase };
}
