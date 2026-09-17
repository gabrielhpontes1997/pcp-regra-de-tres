import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/utils/supabase/server";
import { getProgressMap } from "@/lib/progress";
import { THEORY } from "@/lib/theory";
import ExamRunner from "./ExamRunner";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const moduleId = Number(id);
  const m = THEORY.find((t) => t.n === moduleId);
  if (!m) notFound();

  const auth = await requireUser();
  if (!auth) redirect("/login");
  const { userId, supabase } = auth;
  const map = await getProgressMap(supabase, userId);

  if (map[moduleId].status === "locked") {
    redirect(`/modulos/${moduleId}`);
  }

  return <ExamRunner moduleId={moduleId} />;
}
