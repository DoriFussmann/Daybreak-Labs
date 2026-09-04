import { redirect } from "next/navigation";
import { getSessionAccess, homePath } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon && !url.startsWith("YOUR_")) {
    const session = await getSessionAccess();
    if (session && (session.isAdmin || session.clientIds.length > 0)) {
      redirect(homePath(session));
    }
  }
  return <LoginForm />;
}
