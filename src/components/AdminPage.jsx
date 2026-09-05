import { useState, useEffect } from "react";
import { Shield, Radio, Users, Flag, LifeBuoy, X, CheckCircle2, Loader2 } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { ACCENT, fmt } from "../data/mockData";
import { listLiveChannels } from "../lib/live";
import {
  listAllUsers, setUserAdmin, forceEndStream,
  listReports, resolveReport, listSupportTickets, resolveSupportTicket,
} from "../lib/admin";

const TABS = [
  { id: "live", label: "Live now", icon: Radio },
  { id: "users", label: "Users", icon: Users },
  { id: "reports", label: "Reports", icon: Flag },
  { id: "support", label: "Support", icon: LifeBuoy },
];

export default function AdminPage({ t, navigate }) {
  const user = useAppStore((s) => s.user);
  const [tab, setTab] = useState("live");

  const [liveList, setLiveList] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(null);

  const reload = async () => {
    setLoading(true);
    const [live, allUsers, openReports, openTickets] = await Promise.all([
      listLiveChannels(),
      listAllUsers(),
      listReports("open"),
      listSupportTickets("open"),
    ]);
    setLiveList(live);
    setUsers(allUsers);
    setReports(openReports);
    setTickets(openTickets);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  if (!user?.isAdmin) return null;

  const handleForceEnd = async (username) => {
    if (!confirm(`Force-end ${username}'s stream?`)) return;
    setEnding(username);
    await forceEndStream(username);
    setEnding(null);
    reload();
  };

  const handleToggleAdmin = async (u) => {
    if (u.id === user.id) return; // don't let someone demote themselves by accident
    if (!confirm(`${u.is_admin ? "Remove" : "Grant"} admin for ${u.username}?`)) return;
    await setUserAdmin(u.id, !u.is_admin);
    reload();
  };

  const handleResolveReport = async (id) => {
    await resolveReport(id);
    setReports((r) => r.filter((x) => x.id !== id));
  };

  const handleResolveTicket = async (id) => {
    await resolveSupportTicket(id);
    setTickets((t2) => t2.filter((x) => x.id !== id));
  };

  return (
    <div className={`h-screen w-full ${t.bg} ${t.text} flex flex-col`}>
      <div className={`h-12 flex items-center px-4 border-b ${t.border} flex-shrink-0 gap-4`}>
        <button onClick={() => navigate("")} className={`flex items-center gap-1 ${t.sub} text-sm`}>← Back</button>
        <span className="font-bold text-lg flex items-center gap-2" style={{ color: ACCENT }}>
          <Shield size={18} /> Admin Panel
        </span>
        <div className="flex-1" />
        {loading && <Loader2 size={16} className="animate-spin" style={{ color: ACCENT }} />}
      </div>

      <div className={`flex border-b ${t.border} px-4 gap-1 flex-shrink-0`}>
        {TABS.map((tb) => {
          const Icon = tb.icon;
          const count = tb.id === "reports" ? reports.length : tb.id === "support" ? tickets.length : tb.id === "live" ? liveList.length : 0;
          return (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2.5 border-b-2 -mb-px transition-colors`}
              style={{ borderColor: tab === tb.id ? ACCENT : "transparent", color: tab === tb.id ? ACCENT : undefined }}
            >
              <Icon size={14} /> {tb.label} {count > 0 && <span className={`text-[10px] px-1.5 rounded-full ${t.panel} border ${t.border}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {tab === "live" && (
          <div className="space-y-2">
            {liveList.length === 0 ? (
              <p className={`text-sm ${t.sub2}`}>Nobody is live right now.</p>
            ) : (
              liveList.map((s) => (
                <div key={s.username} className={`flex items-center justify-between rounded-lg border ${t.border} p-3`}>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{s.username}</p>
                    <p className={`text-xs truncate ${t.sub2}`}>{s.title} · {s.category}</p>
                  </div>
                  <button
                    onClick={() => handleForceEnd(s.username)}
                    disabled={ending === s.username}
                    className="text-xs font-semibold px-3 py-1.5 rounded-md text-white flex-shrink-0 disabled:opacity-60"
                    style={{ backgroundColor: "#e91916" }}
                  >
                    {ending === s.username ? "Ending…" : "Force End"}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-1.5">
            {users.map((u) => (
              <div key={u.id} className={`flex items-center justify-between rounded-lg border ${t.border} p-2.5 text-sm`}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: `hsl(${u.hue} 70% 45%)` }} />
                  <span className="truncate">{u.username}</span>
                  {u.is_admin && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: ACCENT, color: "white" }}>ADMIN</span>}
                </div>
                <button
                  onClick={() => handleToggleAdmin(u)}
                  disabled={u.id === user.id}
                  className={`text-xs font-medium px-2.5 py-1 rounded border ${t.border} disabled:opacity-40 flex-shrink-0`}
                >
                  {u.is_admin ? "Remove admin" : "Make admin"}
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "reports" && (
          <div className="space-y-2">
            {reports.length === 0 ? (
              <p className={`text-sm ${t.sub2}`}>No open reports.</p>
            ) : (
              reports.map((r) => (
                <div key={r.id} className={`rounded-lg border ${t.border} p-3`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {r.target_type === "channel" ? "Channel" : "Message"} report — {r.target_channel}
                      </p>
                      <p className={`text-xs mt-1 ${t.sub}`}>{r.reason}</p>
                      <p className={`text-[11px] mt-1 ${t.sub2}`}>{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleResolveReport(r.id)} className="text-xs font-semibold px-2.5 py-1 rounded border flex items-center gap-1 flex-shrink-0" style={{ borderColor: ACCENT, color: ACCENT }}>
                      <CheckCircle2 size={12} /> Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "support" && (
          <div className="space-y-2">
            {tickets.length === 0 ? (
              <p className={`text-sm ${t.sub2}`}>No open support tickets.</p>
            ) : (
              tickets.map((tk) => (
                <div key={tk.id} className={`rounded-lg border ${t.border} p-3`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{tk.subject}</p>
                      <p className={`text-xs mt-1 ${t.sub}`}>{tk.message}</p>
                      <p className={`text-[11px] mt-1 ${t.sub2}`}>
                        {tk.name} · {tk.email} · {new Date(tk.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button onClick={() => handleResolveTicket(tk.id)} className="text-xs font-semibold px-2.5 py-1 rounded border flex items-center gap-1 flex-shrink-0" style={{ borderColor: ACCENT, color: ACCENT }}>
                      <CheckCircle2 size={12} /> Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
