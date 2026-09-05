import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, X, Mail, Loader2, Check } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { ACCENT } from "../data/mockData";
import { checkUsernameAvailable } from "../lib/auth";
import LegalModal from "./legal/LegalModal";
import { PRIVACY_POLICY_TEXT } from "./legal/privacyPolicyText";
import { TERMS_TEXT } from "./legal/termsText";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function GoogleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.6 0-14.1 4.3-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.5 35 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.9 39.6 16.4 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.6 5.6C41.1 36.5 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

export default function AuthPage({ t, mode, navigate }) {
  const register = useAppStore((s) => s.register);
  const login = useAppStore((s) => s.login);
  const loginWithGoogle = useAppStore((s) => s.loginWithGoogle);
  const isRegister = mode === "register";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sentTo, setSentTo] = useState(null); // set after successful signup
  const [legalModal, setLegalModal] = useState(null); // null | 'privacy' | 'terms'
  const [agreedError, setAgreedError] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const usernameCheckRef = useRef(0);

  useEffect(() => {
    if (!isRegister) return;
    const trimmed = name.trim();
    if (!USERNAME_RE.test(trimmed)) {
      setUsernameStatus(null);
      return;
    }
    const requestId = ++usernameCheckRef.current;
    setUsernameStatus("checking");
    const id = setTimeout(async () => {
      const available = await checkUsernameAvailable(trimmed);
      if (usernameCheckRef.current !== requestId) return; // a newer keystroke superseded this check
      if (available === null) setUsernameStatus(null);
      else setUsernameStatus(available ? "available" : "taken");
    }, 450);
    return () => clearTimeout(id);
  }, [name, isRegister]);

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    const result = await loginWithGoogle();
    if (!result.ok) {
      setGoogleLoading(false);
      setError(result.error || "Couldn't start Google sign-in.");
    }
    // on success the browser navigates away to Google, so nothing
    // else to do here — we come back with a session automatically
  };

  const handleRegister = async () => {
    setError("");
    setAgreedError(false);
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Please fill in every field.");
      return;
    }
    if (!USERNAME_RE.test(name.trim())) {
      setError("Username: 3-20 characters, letters/numbers/underscore only.");
      return;
    }
    if (usernameStatus === "taken") {
      setError("That username is already taken.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (!agreed) {
      setAgreedError(true);
      setError("You need to accept the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    const result = await register(name.trim(), email.trim(), password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setSentTo(email.trim());
    } else {
      navigate("");
    }
  };

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please fill in every field.");
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate("");
  };

  const onEnter = (e) => {
    if (e.key !== "Enter") return;
    isRegister ? handleRegister() : handleLogin();
  };

  return (
    <div className={`h-screen w-full ${t.bg} ${t.text} flex items-center justify-center px-4`}>
      <div className={`w-full max-w-sm rounded-xl border ${t.border} ${t.panel} p-6 shadow-xl relative`}>
        <button onClick={() => navigate("")} className={`absolute right-4 top-4 ${t.sub2} hover:${t.text}`} title="Back to StreamHub">
          <X size={18} />
        </button>

        {sentTo ? (
          <div className="text-center py-4">
            <Mail size={30} className="mx-auto mb-3" style={{ color: ACCENT }} />
            <p className="font-bold text-lg">Check your email</p>
            <p className={`text-sm mt-2 ${t.sub}`}>
              We sent a real confirmation link to <span className="font-medium">{sentTo}</span>. Click it, then come back and log in.
            </p>
            <button onClick={() => navigate("login")} className="mt-4 text-sm font-semibold px-4 py-2 rounded-md text-white" style={{ backgroundColor: ACCENT }}>
              Go to Log In
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <span className="font-extrabold text-2xl tracking-tight cursor-pointer" style={{ color: ACCENT }} onClick={() => navigate("")}>
                StreamHub
              </span>
              <p className={`text-sm mt-1 ${t.sub}`}>{isRegister ? "Create your account" : "Log in to your account"}</p>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className={`w-full flex items-center justify-center gap-2.5 text-sm font-semibold py-2.5 rounded-md border ${t.border} ${t.hover} disabled:opacity-60 transition-colors`}
            >
              <GoogleIcon size={16} />
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className={`flex-1 h-px ${t.border} border-t`} />
              <span className={`text-xs ${t.sub2}`}>or</span>
              <div className={`flex-1 h-px ${t.border} border-t`} />
            </div>
            <div className="space-y-3">
              {isRegister && (
                <div>
                  <label className={`text-xs font-semibold ${t.sub2}`}>Username</label>
                  <div className="relative mt-1">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={onEnter}
                      placeholder="e.g. nvra_ok"
                      className={`w-full text-sm rounded px-3 py-2 pr-8 outline-none focus:ring-1 focus:ring-[#9147FF] ${t.input} ${usernameStatus === "taken" ? "ring-1 ring-red-500" : ""}`}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {usernameStatus === "checking" && <Loader2 size={14} className={`animate-spin ${t.sub2}`} />}
                      {usernameStatus === "available" && <Check size={14} className="text-emerald-500" />}
                      {usernameStatus === "taken" && <X size={14} className="text-red-500" />}
                    </span>
                  </div>
                  {usernameStatus === "taken" && <p className="text-xs text-red-400 mt-1">Username already taken.</p>}
                  {usernameStatus === "available" && <p className="text-xs text-emerald-500 mt-1">Available!</p>}
                </div>
              )}
              <div>
                <label className={`text-xs font-semibold ${t.sub2}`}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onEnter} placeholder="you@example.com" className={`mt-1 w-full text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-[#9147FF] ${t.input}`} />
              </div>
              <div>
                <label className={`text-xs font-semibold ${t.sub2}`}>Password</label>
                <div className="relative mt-1">
                  <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={onEnter} placeholder="••••••••" className={`w-full text-sm rounded px-3 py-2 pr-9 outline-none focus:ring-1 focus:ring-[#9147FF] ${t.input}`} />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${t.sub2}`}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {isRegister && (
                <div>
                  <label className={`text-xs font-semibold ${t.sub2}`}>Confirm password</label>
                  <input type={showPw ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={onEnter} placeholder="••••••••" className={`mt-1 w-full text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-[#9147FF] ${t.input}`} />
                </div>
              )}
              {isRegister && (
                <div className={`flex items-start gap-2 text-xs ${t.sub} rounded p-1.5 -m-1.5 ${agreedError ? "ring-1 ring-red-500 bg-red-500/5" : ""}`}>
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => {
                      setAgreed(e.target.checked);
                      if (e.target.checked) setAgreedError(false);
                    }}
                    className="mt-0.5 accent-[#9147FF] cursor-pointer flex-shrink-0"
                  />
                  <span>
                    I agree to the{" "}
                    <button type="button" onClick={() => setLegalModal("terms")} className="underline font-medium" style={{ color: ACCENT }}>
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button type="button" onClick={() => setLegalModal("privacy")} className="underline font-medium" style={{ color: ACCENT }}>
                      Privacy Policy
                    </button>
                    .
                  </span>
                </div>
              )}
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="button"
                disabled={loading}
                onClick={isRegister ? handleRegister : handleLogin}
                className="w-full text-white text-sm font-semibold py-2.5 rounded-md transition-transform active:scale-[0.98] disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
              >
                {loading ? "Please wait…" : isRegister ? "Sign Up" : "Log In"}
              </button>
            </div>
            <p className={`text-center text-sm mt-4 ${t.sub}`}>
              {isRegister ? "Already have an account?" : "New to StreamHub?"}{" "}
              <button onClick={() => navigate(isRegister ? "login" : "register")} className="font-semibold" style={{ color: ACCENT }}>
                {isRegister ? "Log In" : "Sign Up"}
              </button>
            </p>
          </>
        )}
      </div>

      {legalModal === "privacy" && <LegalModal t={t} title="Privacy Policy" markdown={PRIVACY_POLICY_TEXT} onClose={() => setLegalModal(null)} />}
      {legalModal === "terms" && <LegalModal t={t} title="Terms of Service" markdown={TERMS_TEXT} onClose={() => setLegalModal(null)} />}
    </div>
  );
}
