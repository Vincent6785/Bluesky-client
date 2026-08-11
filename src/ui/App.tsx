import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useNavigationStore, type View } from "@/store/navigationStore";
import { LoginScreen } from "@/ui/screens/LoginScreen";
import { TimelineScreen } from "@/ui/screens/TimelineScreen";
import { ThreadScreen } from "@/ui/screens/ThreadScreen";
import { ProfileScreen } from "@/ui/screens/ProfileScreen";
import { NotificationsScreen } from "@/ui/screens/NotificationsScreen";
import { SearchScreen } from "@/ui/screens/SearchScreen";
import { DebugNetworkPanel } from "@/ui/components/DebugNetworkPanel";
import "@/ui/styles.css";

const TITLES: Record<View["name"], string> = {
  timeline: "Home",
  thread: "Post",
  profile: "Profile",
  notifications: "Notifications",
  search: "Search",
};

function ViewRouter({ view }: { view: View }) {
  switch (view.name) {
    case "timeline":
      return <TimelineScreen />;
    case "thread":
      return <ThreadScreen uri={view.uri} />;
    case "profile":
      return <ProfileScreen actor={view.actor} />;
    case "notifications":
      return <NotificationsScreen />;
    case "search":
      return <SearchScreen />;
  }
}

function AppShell() {
  const did = useAuthStore((s) => (s.auth.status === "signed-in" ? s.auth.did : undefined));
  const signOut = useAuthStore((s) => s.signOut);
  const { current, stack, push, back, reset } = useNavigationStore();

  return (
    <div className="app-shell">
      <div className="top-bar">
        {stack.length > 1 && (
          <button type="button" className="icon-button" onClick={back} aria-label="Back">
            ←
          </button>
        )}
        <h1>{TITLES[current.name]}</h1>
        <button type="button" className="icon-button" onClick={() => did && push({ name: "profile", actor: did })}>
          Profile
        </button>
        <button type="button" className="icon-button" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
      <nav className="nav-bar">
        <button type="button" aria-current={current.name === "timeline"} onClick={() => reset({ name: "timeline" })}>
          Home
        </button>
        <button type="button" aria-current={current.name === "search"} onClick={() => reset({ name: "search" })}>
          Search
        </button>
        <button
          type="button"
          aria-current={current.name === "notifications"}
          onClick={() => reset({ name: "notifications" })}
        >
          Notifications
        </button>
      </nav>
      <ViewRouter view={current} />
    </div>
  );
}

function AuthErrorScreen({ message }: { message: string }) {
  const initialize = useAuthStore((s) => s.initialize);
  return (
    <div className="centered-message">
      <p className="error-text">{message}</p>
      <button type="button" className="primary-button" onClick={() => void initialize()}>
        Try again
      </button>
    </div>
  );
}

export function App() {
  const auth = useAuthStore((s) => s.auth);
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <>
      {auth.status === "loading" && <p className="centered-message">Loading…</p>}
      {auth.status === "signed-out" && <LoginScreen />}
      {auth.status === "error" && <AuthErrorScreen message={auth.message} />}
      {auth.status === "signed-in" && <AppShell />}
      <DebugNetworkPanel />
    </>
  );
}
