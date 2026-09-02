"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setError(""); setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setError("Those details didn't match an account. Check and try again."); return; }
    router.push("/console");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 24px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 30, fontWeight: 300, color: "var(--ink)", letterSpacing: "-0.02em" }}>Blueprint</div>
          <div style={{ color: "var(--ash)", fontSize: 14, marginTop: 8 }}>Sign in to your console</div>
        </div>
        <div className="card" style={{ padding: "36px 32px" }}>
          <div style={{ marginBottom: 20 }}>
            <div className="label" style={{ marginBottom: 8 }}>Email</div>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div style={{ marginBottom: error ? 12 : 24 }}>
            <div className="label" style={{ marginBottom: 8 }}>Password</div>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && signIn()} />
          </div>
          {error && <div style={{ color: "var(--cinnabar)", fontSize: 14, marginBottom: 20 }}>{error}</div>}
          <button className="btn" style={{ width: "100%" }} onClick={signIn} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
        <div style={{ textAlign: "center", color: "var(--ash)", fontSize: 13, marginTop: 24 }}>
          Access is limited to Blueprint operators and clients.
        </div>
      </div>
    </div>
  );
}
