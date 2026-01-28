```tsx
import React, { useEffect, useState } from "react";

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber?: number | null;
  position?: string | null;
};

type ReferralResponse = {
  id: string;
  referralReference?: string;
  referredTo?: string;
  createdAt?: string;
};

type Props = {
  teamId: string;
  // Manager identity (can be obtained from auth/session instead)
  managerId: string;
  managerName?: string;
  // Optional endpoint override for testing
  rosterEndpoint?: string;
  referralsEndpoint?: string;
};

const INJURY_TYPES = [
  "Ankle",
  "Muscle",
  "Head",
  "Knee",
  "Shoulder",
  "Back",
  "Fracture",
  "Laceration",
  "Other",
];

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const InjuryReportForm: React.FC<Props> = ({
  teamId,
  managerId,
  managerName,
  rosterEndpoint,
  referralsEndpoint,
}) => {
  const rosterUrl = rosterEndpoint ?? `/api/teams/${teamId}/roster`;
  const referralsUrl = referralsEndpoint ?? `/api/referrals`;

  const [players, setPlayers] = useState<Player[] | null>(null);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(true);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [injuryType, setInjuryType] = useState<string>(INJURY_TYPES[0]);
  const [severity, setSeverity] = useState<string>(SEVERITIES[1]); // default MEDIUM
  const [notes, setNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastReferral, setLastReferral] = useState<ReferralResponse | null>(
    null
  );

  useEffect(() => {
    let mounted = true;
    setLoadingRoster(true);
    setRosterError(null);

    fetch(rosterUrl, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to fetch roster");
        }
        return res.json();
      })
      .then((data: { players: Player[] } | Player[]) => {
        if (!mounted) return;
        // Support two common shapes: { players: [...] } or direct array
        const list = Array.isArray(data) ? data : (data.players ?? []);
        setPlayers(list);
        if (list.length > 0) setSelectedPlayerId((prev) => prev || list[0].id);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setRosterError(err?.message ?? "Error fetching roster");
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingRoster(false);
      });

    return () => {
      mounted = false;
    };
  }, [rosterUrl, teamId]);

  const findPlayer = (id: string) => players?.find((p) => p.id === id) ?? null;

  const generateVoucherHtml = (
    referral: ReferralResponse,
    player: Player | null
  ) => {
    const date = new Date(referral.createdAt ?? Date.now()).toLocaleString();
    const referralRef = referral.referralReference ?? referral.id;
    const referredTo = referral.referredTo ?? "AO Clinic";

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Digital Referral Voucher - ${referralRef}</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #111827; }
            .card { border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; max-width: 700px; margin: 0 auto;}
            h1 { font-size: 20px; margin-bottom: 8px; }
            .meta { color: #6b7280; margin-bottom: 16px; }
            .row { display:flex; justify-content:space-between; margin-bottom:8px; }
            .label { color: #6b7280; font-size: 12px; }
            .value { font-weight: 600; }
            .notes { margin-top: 16px; white-space: pre-wrap; background:#f9fafb;padding:12px;border-radius:6px;}
            .footer { margin-top: 22px; font-size: 12px; color:#6b7280; }
            .logo { font-weight:700; color:#1f2937;}
          </style>
        </head>
        <body>
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div>
                <div class="logo">Sesigo Hive</div>
                <div class="meta">Digital Referral Voucher</div>
              </div>
              <div style="text-align:right;">
                <div>Referral #: <strong>${referralRef}</strong></div>
                <div>${date}</div>
              </div>
            </div>

            <h1>Patient & Referral Details</h1>

            <div class="row">
              <div>
                <div class="label">Player</div>
                <div class="value">${player ? escapeHtml(
                  `${player.firstName} ${player.lastName}`
                ) : "—"}</div>
              </div>
              <div>
                <div class="label">Referred To</div>
                <div class="value">${escapeHtml(referredTo)}</div>
              </div>
            </div>

            <div class="row">
              <div>
                <div class="label">Manager</div>
                <div class="value">${escapeHtml(managerName ?? "Manager")}</div>
              </div>
              <div>
                <div class="label">Referral ID</div>
                <div class="value">${referralRef}</div>
              </div>
            </div>

            <div class="notes">
              This voucher authorises ${escapeHtml(
                managerName ?? "the manager"
              )} to refer the player to ${escapeHtml(referredTo)}. Please present this voucher at the clinic reception.
            </div>

            <div class="footer">
              Generated by Sesigo Hive • ${new Date().toLocaleString()}
            </div>
          </div>
        </body>
      </html>
    `;
  };

  // small helper to prevent injection in voucher html
  const escapeHtml = (str: string) =>
    String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const openVoucherWindow = (html: string) => {
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      alert(
        "Popup blocked. Your browser prevented the voucher window from opening. Please allow popups for this site to view/print voucher."
      );
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // Give the browser a moment to render before calling print if desired
    setTimeout(() => {
      // Optionally trigger print:
      // w.print();
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedPlayerId) {
      setSubmitError("Please select a player who is injured.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        playerId: selectedPlayerId,
        reportedById: managerId,
        injuryType,
        severity,
        notes,
        referredTo: "AO Clinic", // default referral target (can be selected/enhanced)
      };

      const resp = await fetch(referralsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `Failed to create referral (${resp.status})`);
      }

      const data: ReferralResponse = await resp.json();
      setLastReferral(data);

      // Generate voucher HTML and open for printing/downloading
      const player = findPlayer(selectedPlayerId);
      const html = generateVoucherHtml(data, player);
      openVoucherWindow(html);

      // Reset form (optional)
      setNotes("");
      setInjuryType(INJURY_TYPES[0]);
      setSeverity(SEVERITIES[1]);
      // Keep selected player to allow multiple referrals quickly

    } catch (err: any) {
      setSubmitError(err?.message ?? "Failed to submit referral");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl bg-white shadow-sm rounded-md p-6">
      <h2 className="text-lg font-semibold mb-4">Report an Injury & Create Referral</h2>

      {loadingRoster ? (
        <div className="text-sm text-gray-500">Loading team roster...</div>
      ) : rosterError ? (
        <div className="text-sm text-red-600">Roster error: {rosterError}</div>
      ) : players && players.length === 0 ? (
        <div className="text-sm text-gray-700">No players found for this team.</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Player</label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
              aria-label="Select injured player"
            >
              {players?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.jerseyNumber ? `#${p.jerseyNumber} ` : ""}
                  {p.firstName} {p.lastName} {p.position ? `— ${p.position}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Injury Type</label>
              <select
                value={injuryType}
                onChange={(e) => setInjuryType(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                aria-label="Injury type"
              >
                {INJURY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                aria-label="Severity"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add context: how injury happened, immediate treatment, contact details..."
            />
          </div>

          {submitError && <div className="text-sm text-red-600">{submitError}</div>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 rounded-md text-white ${
                submitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {submitting ? "Reporting…" : "Report & Generate Referral Voucher"}
            </button>

            {lastReferral && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  const player = findPlayer(selectedPlayerId);
                  const html = generateVoucherHtml(lastReferral, player);
                  openVoucherWindow(html);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Re-open last voucher
              </a>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default InjuryReportForm;