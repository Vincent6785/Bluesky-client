import { useEffect, useState } from "react";
import { onNetworkActivity, type NetworkLogEntry } from "@/network/loggingFetch";
import { DEBUG_NETWORK } from "@/config/env";

const MAX_ENTRIES = 50;

/**
 * Dev-only transparency panel: shows every outgoing request (method, host+path,
 * status, duration) as it happens. Never displays headers, bodies, query
 * strings, cookies, or tokens — see network/loggingFetch.ts.
 */
export function DebugNetworkPanel() {
  const [entries, setEntries] = useState<NetworkLogEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!DEBUG_NETWORK) return;
    return onNetworkActivity((entry) => {
      setEntries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
    });
  }, []);

  if (!DEBUG_NETWORK) return null;

  return (
    <div style={{ position: "fixed", bottom: 0, right: 0, zIndex: 100, fontFamily: "monospace", fontSize: 12 }}>
      <button type="button" className="icon-button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        network ({entries.length})
      </button>
      {open && (
        <div
          style={{
            width: 420,
            maxHeight: 300,
            overflowY: "auto",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            padding: 8,
          }}
        >
          {entries.map((entry, i) => (
            <div key={i}>
              {entry.method} {entry.url} → {entry.status} ({entry.durationMs.toFixed(0)}ms)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
