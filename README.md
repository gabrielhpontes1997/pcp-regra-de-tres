# PCP Cerâmico — Regra de Três (Next.js + Supabase)

## 1. Banco de dados (Supabase) — fazer primeiro

1. Abra seu projeto em supabase.com → **SQL Editor**.
2. Cole e rode o conteúdo de `supabase/schema.sql` (cria a tabela
   `module_progress`, ativa Row Level Security e as policies).
3. Em **Authentication → Providers**, confirme que "Email" está habilitado.
4. Em **Authentication → URL Configuration → Redirect URLs**, adicione:
   - `http://localhost:3000/auth/confirm` (para testar localmente)
   - `https://SEU-DOMINIO-NA-VERCEL/auth/confirm` (depois do deploy)
   Sem isso, o link de confirmação de e-mail do cadastro é rejeitado.

## 2. Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000 — você deve cair na tela de login. Crie uma
conta em `/signup`, confirme o e-mail (verifique a caixa de entrada) e
entre.

O arquivo `.env.local` já está preenchido com a URL e a publishable key
do seu projeto Supabase (a publishable key é segura para expor no
navegador — as regras de acesso reais estão nas policies de RLS, não
nela).

## 3. Estrutura do projeto

```
app/
  layout.tsx              → layout raiz, barra superior, botão sair
  page.tsx                → dashboard (Server Component)
  login/, signup/         → telas de autenticação
  auth/confirm/route.ts   → confirma o link de e-mail do cadastro
  modulos/page.tsx        → grade dos 20 módulos
  modulos/[id]/page.tsx   → conteúdo da aula
  modulos/[id]/prova/     → prova interativa (Client Component) +
                            página que checa bloqueio (Server Component)
  certificado/page.tsx    → certificado final
  actions.ts              → Server Actions: login, cadastro, logout,
                            e o registro do resultado da prova no Supabase
lib/
  theory.ts               → conteúdo teórico dos 20 módulos
  generators.ts           → motor de geração de questões (matemática +
                            distratores realistas), portado do protótipo
  progress.ts             → leitura/agregação do progresso vindo do Supabase
utils/supabase/
  client.ts               → cliente para Client Components
  server.ts               → cliente para Server Components/Actions
  middleware.ts           → renova sessão e protege rotas
middleware.ts             → conecta o middleware acima a cada requisição
supabase/schema.sql       → SQL para rodar no Supabase (tabela + RLS)
```

## 4. Como o progresso é salvo

Cada aluno só enxerga e altera as próprias linhas da tabela
`module_progress` — isso é garantido pelas policies de Row Level
Security (`auth.uid() = user_id`), não pelo código do app. Mesmo que
alguém inspecione o JavaScript do navegador e veja a `publishable key`,
não consegue ler ou escrever o progresso de outra pessoa.

O único momento em que o app escreve no banco é ao finalizar uma prova
(`submitExamResult` em `app/actions.ts`), rodando no servidor via
Server Action — o navegador nunca fala diretamente com o Postgres.

## 5. Deploy na Vercel

1. Suba este projeto para um repositório no GitHub.
2. Em vercel.com → **New Project** → importe o repositório.
3. Em **Environment Variables**, adicione as três variáveis do seu
   `.env.local` (com `NEXT_PUBLIC_SITE_URL` apontando para o domínio
   que a Vercel vai te dar, ex: `https://pcp-regra-de-tres.vercel.app`).
4. Deploy.
5. Volte ao Supabase e adicione essa URL final em **Redirect URLs**
   (passo 1.4 acima) — sem isso o cadastro por e-mail quebra em produção.

## 6. O que eu validei aqui, e o que não dá para validar sem acesso à rede

Meu ambiente não alcança `supabase.co` nem `vercel.com`, então não
rodei o SQL no seu projeto real nem testei um cadastro/login de
verdade. O que eu validei:

- `npm install` + `npm run build` completam sem erros de TypeScript
  em nenhuma rota
- O motor de geração de questões (`lib/generators.ts`) é o mesmo já
  auditado em massa no protótipo (9.600 questões, 0 problemas)

O que só se confirma testando com sua conta real: login/cadastro
funcionando ponta a ponta, RLS bloqueando corretamente o progresso de
terceiros, e o link de confirmação de e-mail chegando.
