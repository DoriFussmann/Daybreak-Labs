"use client";

import { useState, useTransition } from "react";
import { Dropdown } from "@/app/ui/dropdown";
import { INTAKE_FIELDS, LEVELS } from "@/lib/onboarding";
import { submitIntake } from "./actions";

export function IntakeForm({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="card" style={{ padding: "36px 32px", marginTop: 32 }}>
        <h3 style={{ margin: 0 }}>Intake received</h3>
        <p style={{ color: "var(--ash)", marginTop: 12, lineHeight: 1.7 }}>
          Thanks — this client is now in the system. You&rsquo;ll get the client-ready email and links back shortly.
        </p>
      </div>
    );
  }

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await submitIntake(token, formData);
      if (res.ok) setDone(true);
      else setError(res.message);
    });
  }

  return (
    <form action={onSubmit} style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 20 }}>
      {INTAKE_FIELDS.map((field) => (
        <div key={field.key}>
          <div className="label" style={{ marginBottom: 8 }}>{field.label}</div>
          {field.type === "textarea" ? (
            <textarea
              name={field.key}
              className="input"
              placeholder={"placeholder" in field ? (field.placeholder as string) : undefined}
              style={{ height: 96, padding: "12px 14px", resize: "vertical" }}
            />
          ) : (
            <input
              name={field.key}
              type={field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
              className="input"
              placeholder={"placeholder" in field ? (field.placeholder as string) : undefined}
            />
          )}
        </div>
      ))}

      <div>
        <div className="label" style={{ marginBottom: 8 }}>Recommended level</div>
        <Dropdown name="level" options={[{ value: "", label: "Not sure yet" }, ...LEVELS]} placeholder="Not sure yet" />
        <p style={{ color: "var(--ash)", fontSize: 13, marginTop: 8 }}>
          The client can change this when they sign.
        </p>
      </div>

      {error ? <p style={{ color: "var(--cinnabar)", fontSize: 14 }}>{error}</p> : null}

      <div>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Submit intake"}
        </button>
      </div>
    </form>
  );
}
