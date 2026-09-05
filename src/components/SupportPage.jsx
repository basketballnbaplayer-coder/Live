import { useState } from "react";
import { LifeBuoy, CheckCircle2 } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { ACCENT } from "../data/mockData";
import { submitSupportTicket } from "../lib/admin";

export default function SupportPage({ t, navigate }) {
  const user = useAppStore((s) => s.user);
  const [name, setName] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError("Please fill in every field.");
      return;
    }
    setLoading(true);
    const result = await submitSupportTicket({
      userId: user?.id || null,
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "Couldn't send your message — try again.");
      return;
    }
    setSent(true);
  };

  return (
    <div className={`h-screen w-full ${t.bg} ${t.text} flex items-center justify-center px-4 overflow-y-auto py-10`}>
      <div className={`w-full max-w-md rounded-xl border ${t.border} ${t.panel} p-6 shadow-xl`}>
        {sent ? (
          <div className="text-center py-6">
            <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: ACCENT }} />
            <p className="font-bold text-lg">Message sent</p>
            <p className={`text-sm mt-2 ${t.sub}`}>We'll get back to you at {email}.</p>
            <button onClick={() => navigate("")} className="mt-4 text-sm font-semibold px-4 py-2 rounded-md text-white" style={{ backgroundColor: ACCENT }}>
              Back to StreamHub
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <LifeBuoy size={26} className="mx-auto mb-2" style={{ color: ACCENT }} />
              <p className="font-bold text-lg">Contact support</p>
              <p className={`text-sm mt-1 ${t.sub}`}>Report a problem or ask us anything.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={`text-xs font-semibold ${t.sub2}`}>Your name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={`mt-1 w-full text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-[#9147FF] ${t.input}`} />
              </div>
              <div>
                <label className={`text-xs font-semibold ${t.sub2}`}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1 w-full text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-[#9147FF] ${t.input}`} />
              </div>
              <div>
                <label className={`text-xs font-semibold ${t.sub2}`}>Subject</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Can't start my stream" className={`mt-1 w-full text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-[#9147FF] ${t.input}`} />
              </div>
              <div>
                <label className={`text-xs font-semibold ${t.sub2}`}>Message</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className={`mt-1 w-full text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-[#9147FF] resize-none ${t.input}`} />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="button"
                disabled={loading}
                onClick={submit}
                className="w-full text-white text-sm font-semibold py-2.5 rounded-md disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
              >
                {loading ? "Sending…" : "Send message"}
              </button>
              <button type="button" onClick={() => navigate("")} className={`w-full text-sm ${t.sub2}`}>
                ← Back to StreamHub
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
