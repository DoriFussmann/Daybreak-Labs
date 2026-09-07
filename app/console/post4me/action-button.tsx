"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  generatePostsProposal,
  selectTopicForClient,
  sendToClientApproval,
} from "../post4me-actions";

function BusyButton({
  label,
  busyLabel,
  disabled,
  run,
}: {
  label: string;
  busyLabel: string;
  disabled?: boolean;
  run: () => Promise<{ ok: true; topicId?: string } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div>
      <button
        type="button"
        className="btn"
        disabled={busy || disabled}
        onClick={async () => {
          setError("");
          setBusy(true);
          try {
            const res = await run();
            if (!res.ok) setError(res.error);
            else router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "That did not finish.");
          }
          setBusy(false);
        }}
        style={{ opacity: busy || disabled ? 0.6 : 1 }}
      >
        {busy ? busyLabel : label}
      </button>
      {error ? (
        <p style={{ color: "var(--cinnabar)", fontSize: 14, margin: "12px 0 0" }}>{error}</p>
      ) : null}
    </div>
  );
}

export function TopicSelectButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div>
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={async () => {
          setError("");
          setBusy(true);
          try {
            const res = await selectTopicForClient(clientId);
            if (!res.ok) setError(res.error);
            else router.push(`/console/post4me?client=${encodeURIComponent(clientId)}&topic=${encodeURIComponent(res.topicId)}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "That did not finish.");
          }
          setBusy(false);
        }}
        style={{ opacity: busy ? 0.6 : 1 }}
      >
        {busy ? "Selecting" : "Topic selection"}
      </button>
      {error ? (
        <p style={{ color: "var(--cinnabar)", fontSize: 14, margin: "12px 0 0" }}>{error}</p>
      ) : null}
    </div>
  );
}

export function GenerateProposalButton({
  clientId,
  topicId,
}: {
  clientId: string;
  topicId: string | null;
}) {
  return (
    <BusyButton
      label="Generate posts proposal"
      busyLabel="Generating"
      disabled={!topicId}
      run={async () => {
        if (!topicId) return { ok: false, error: "Select a topic first." };
        return generatePostsProposal(clientId, topicId);
      }}
    />
  );
}

export function SendApprovalButton({
  cycleId,
  disabled,
}: {
  cycleId: string;
  disabled?: boolean;
}) {
  return (
    <BusyButton
      label="Send to client approval"
      busyLabel="Sending"
      disabled={disabled}
      run={() => sendToClientApproval(cycleId)}
    />
  );
}
