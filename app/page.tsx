import { redirect } from "next/navigation";
import { getSessionAccess, homePath } from "@/lib/auth";

export default async function Home() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || url.startsWith("YOUR_")) redirect("/login");

  const session = await getSessionAccess();
  redirect(session && (session.isAdmin || session.clientIds.length > 0) ? homePath(session) : "/login");
}
