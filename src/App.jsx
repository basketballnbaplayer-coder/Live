import { useState, useEffect } from "react";
import { useAppStore } from "./store/useAppStore";
import { THEME } from "./data/mockData";
import { listLiveChannels, subscribeLiveChannels } from "./lib/live";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import CategoryRail from "./components/CategoryRail";
import StreamGrid from "./components/StreamGrid";
import StreamPlayer from "./components/StreamPlayer";
import AuthPage from "./components/AuthPage";
import StudioPage from "./components/StudioPage";
import AdminPage from "./components/AdminPage";
import SupportPage from "./components/SupportPage";
import Footer from "./components/Footer";

// tiny in-memory router: { name: "home" | "login" | "register" | "studio" | "channel" | "admin" | "support", username? }
function parseRoute(path) {
  if (!path) return { name: "home" };
  if (path === "login") return { name: "login" };
  if (path === "register") return { name: "register" };
  if (path === "studio") return { name: "studio" };
  if (path === "admin") return { name: "admin" };
  if (path === "support") return { name: "support" };
  const m = path.match(/^channel\/(.+)$/);
  if (m) return { name: "channel", username: m[1] };
  return { name: "home" };
}

export default function App() {
  const theme = useAppStore((s) => s.theme);
  const user = useAppStore((s) => s.user);
  const authLoading = useAppStore((s) => s.authLoading);
  const initAuth = useAppStore((s) => s.initAuth);
  const t = THEME[theme];

  const [route, setRoute] = useState({ name: "home" });
  const navigate = (path) => setRoute(parseRoute(path));

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [liveList, setLiveList] = useState([]);
  const [liveLoading, setLiveLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (route.name === "studio" && !authLoading && !user) navigate("login");
  }, [route.name, user, authLoading]); // eslint-disable-line

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const list = await listLiveChannels();
      if (!cancelled) {
        setLiveList(list);
        setLiveLoading(false);
      }
    };
    load();
    const unsubscribe = subscribeLiveChannels(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (route.name === "login" || route.name === "register") {
    return <AuthPage t={t} mode={route.name} navigate={navigate} />;
  }
  if (route.name === "studio") {
    if (!user) return null;
    return <StudioPage t={t} navigate={navigate} />;
  }
  if (route.name === "admin") {
    if (!authLoading && !user?.isAdmin) {
      navigate("");
      return null;
    }
    if (!user?.isAdmin) return null;
    return <AdminPage t={t} navigate={navigate} />;
  }
  if (route.name === "support") {
    return <SupportPage t={t} navigate={navigate} />;
  }
  if (route.name === "channel") {
    return <StreamPlayer t={t} username={route.username} onBack={() => navigate("")} />;
  }

  const q = searchQuery.trim().toLowerCase();
  const filtered = liveList.filter((s) => {
    const matchesCategory = !activeCategory || s.category === activeCategory;
    const matchesSearch = !q || s.username.toLowerCase().includes(q) || (s.title || "").toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className={`h-screen w-full ${t.bg} ${t.text} flex flex-col overflow-hidden`}>
      <Navbar
        t={t}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        navigate={navigate}
      />
      <div className="flex flex-1 min-h-0">
        {sidebarOpen && <Sidebar t={t} onSelect={(name) => navigate(`channel/${name}`)} />}
        <div className="flex-1 overflow-y-auto">
          <CategoryRail t={t} activeCategory={activeCategory} setActiveCategory={setActiveCategory} liveList={liveList} />
          <StreamGrid
            t={t}
            streamers={filtered}
            onSelect={(name) => navigate(`channel/${name}`)}
            loading={liveLoading}
            activeCategory={activeCategory}
            onGoLive={() => navigate(user ? "studio" : "login")}
          />
          <Footer t={t} navigate={navigate} />
        </div>
      </div>
    </div>
  );
}
