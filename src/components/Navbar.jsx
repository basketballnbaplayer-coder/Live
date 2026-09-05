import { useState } from "react";
import {
  Search, Bell, MessageSquare, User, Settings, Moon, Sun, LogOut, Radio, Menu, X, Film, Shield, LifeBuoy,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { ACCENT } from "../data/mockData";

export default function Navbar({ t, onToggleSidebar, searchQuery, setSearchQuery, navigate }) {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`h-14 flex items-center justify-between px-4 border-b ${t.border} flex-shrink-0 relative`}>
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className={`${t.sub} hover:${t.text}`}>
          <Menu size={20} />
        </button>
        <span className="font-extrabold text-xl tracking-tight cursor-pointer flex items-center gap-1.5" style={{ color: ACCENT }} onClick={() => navigate("")}>
          StreamHub
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${t.panel} border ${t.border} ${t.sub2}`}>v6.0</span>
        </span>
      </div>

      <div className="flex-1 max-w-md mx-6 hidden sm:block">
        <div className={`flex items-center rounded-full px-3 py-1.5 ${t.input}`}>
          <Search size={16} className={`${t.sub2} flex-shrink-0`} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels, games, titles..."
            className="bg-transparent outline-none text-sm px-2 flex-1"
          />
          {searchQuery && (
            <X size={14} className={`cursor-pointer ${t.sub2}`} onClick={() => setSearchQuery("")} />
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {user ? (
          <button onClick={() => navigate("studio")} className="hidden sm:flex items-center gap-1.5 text-white text-sm font-semibold px-3 py-1.5 rounded-md" style={{ backgroundColor: ACCENT }}>
            <Radio size={14} /> Creator Studio
          </button>
        ) : (
          <button onClick={() => navigate("login")} className="hidden sm:flex items-center gap-1.5 text-white text-sm font-semibold px-3 py-1.5 rounded-md" style={{ backgroundColor: ACCENT }}>
            <Radio size={14} /> Go Live
          </button>
        )}

        {!user ? (
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("support")} className={`hidden sm:block text-sm ${t.sub2} hover:${t.text}`}>
              Support
            </button>
            <button onClick={() => navigate("login")} className={`text-sm font-semibold px-3 py-1.5 rounded-md ${t.sub} hover:${t.text}`}>
              Log In
            </button>
            <button onClick={() => navigate("register")} className="text-sm font-semibold px-3 py-1.5 rounded-md text-white" style={{ backgroundColor: "#3a3a3d" }}>
              Sign Up
            </button>
          </div>
        ) : (
          <>
            <Bell size={19} className={`${t.sub2} hover:${t.text} cursor-pointer hidden sm:block`} />
            <MessageSquare size={19} className={`${t.sub2} hover:${t.text} cursor-pointer hidden sm:block`} />
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                style={{ background: `hsl(${user.hue} 70% 45%)` }}
              >
                {user.username.slice(0, 1).toUpperCase()}
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className={`absolute right-0 top-10 w-56 rounded-lg border ${t.border} ${t.panel} shadow-xl z-50 py-1.5 text-sm overflow-hidden`}>
                    <div className={`px-3 py-2 border-b ${t.border}`}>
                      <p className="font-semibold truncate">{user.username}</p>
                      <p className={`text-xs truncate ${t.sub2}`}>{user.email}</p>
                    </div>
                    <button onClick={() => { setMenuOpen(false); navigate("studio"); }} className={`w-full flex items-center gap-2.5 px-3 py-2 ${t.hover} ${t.text}`}>
                      <Film size={15} /> Creator Studio
                    </button>
                    <button onClick={() => { setMenuOpen(false); navigate(`channel/${user.username}`); }} className={`w-full flex items-center gap-2.5 px-3 py-2 ${t.hover} ${t.text}`}>
                      <User size={15} /> My Channel
                    </button>
                    {user.isAdmin && (
                      <button onClick={() => { setMenuOpen(false); navigate("admin"); }} className={`w-full flex items-center gap-2.5 px-3 py-2 ${t.hover}`} style={{ color: ACCENT }}>
                        <Shield size={15} /> Admin Panel
                      </button>
                    )}
                    <button onClick={() => { setMenuOpen(false); navigate("support"); }} className={`w-full flex items-center gap-2.5 px-3 py-2 ${t.hover} ${t.text}`}>
                      <LifeBuoy size={15} /> Support
                    </button>
                    <button onClick={toggleTheme} className={`w-full flex items-center gap-2.5 px-3 py-2 ${t.hover} ${t.text}`}>
                      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                      {theme === "dark" ? "Light theme" : "Dark theme"}
                    </button>
                    <div className={`h-px my-1 ${t.border} border-t`} />
                    <button onClick={() => { setMenuOpen(false); logout(); navigate(""); }} className={`w-full flex items-center gap-2.5 px-3 py-2 ${t.hover} text-red-400`}>
                      <LogOut size={15} /> Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
