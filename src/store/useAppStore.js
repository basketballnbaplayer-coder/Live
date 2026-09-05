import { create } from "zustand";
import { signUp, signIn, signOut, signInWithGoogle, getProfile, onAuthChange } from "../lib/auth";
import { listFollowed, followChannel, unfollowChannel } from "../lib/follows";

/**
 * Global app store. `user` is backed by a real Supabase session
 * (see src/lib/auth.js) — call initAuth() once when the app mounts
 * (App.jsx's top-level useEffect) to start listening for
 * login/logout/session-refresh. `followed` is a plain array of
 * usernames, synced from the real `follows` table whenever the
 * session changes.
 */
export const useAppStore = create((set, get) => ({
  followed: [],
  theme: "dark",
  user: null, // { id, username, email, hue } once logged in
  authLoading: true,

  initAuth: () => {
    onAuthChange(async (session) => {
      if (!session) {
        set({ user: null, authLoading: false, followed: [] });
        return;
      }
      const profile = await getProfile(session.user.id);
      const user = profile
        ? { id: session.user.id, username: profile.username, email: session.user.email, hue: profile.hue, isAdmin: !!profile.is_admin }
        : null;
      const followed = user ? await listFollowed(user.id) : [];
      set({ user, authLoading: false, followed });
    });
  },

  register: async (username, email, password) => {
    const result = await signUp(username, email, password);
    if (!result.ok) return result;
    // Supabase requires the confirmation link to be clicked before a
    // session exists, so `user` stays null here — onAuthChange picks
    // it up automatically the moment they confirm and log in.
    return { ok: true, needsEmailConfirmation: !result.session };
  },

  login: async (email, password) => {
    const result = await signIn(email, password);
    if (!result.ok) return result;
    return { ok: true };
  },

  loginWithGoogle: async () => {
    // navigates the whole page away to Google, then back — no local
    // state to update here, initAuth's listener picks up the new
    // session automatically once the redirect completes.
    return signInWithGoogle();
  },

  logout: async () => {
    await signOut();
    set({ user: null, followed: [] });
  },

  isFollowing: (username) => get().followed.includes(username),

  toggleFollow: async (username) => {
    const { user, followed } = get();
    if (!user) return;
    const following = followed.includes(username);
    // optimistic update, then sync with the real table
    set({ followed: following ? followed.filter((f) => f !== username) : [username, ...followed] });
    if (following) await unfollowChannel(user.id, username);
    else await followChannel(user.id, username);
  },

  toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
}));
