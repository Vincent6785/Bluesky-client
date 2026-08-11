import { lazy, Suspense, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useNavigationStore, type View } from "@/store/navigationStore";
import { LoginScreen } from "@/ui/screens/LoginScreen";
import { DebugNetworkPanel } from "@/ui/components/DebugNetworkPanel";
import { ErrorBoundary } from "@/ui/components/ErrorBoundary";
import "@/ui/styles.css";

// Lazy-loaded: only a signed-in user ever needs any of these, and only one
// is ever visible at a time — no reason to ship all five in the initial,
// signed-out-visitor bundle alongside LoginScreen.
const TimelineScreen = lazy(() => import("@/ui/screens/TimelineScreen").then((m) => ({ default: m.TimelineScreen })));
const ThreadScreen = lazy(() => import("@/ui/screens/ThreadScreen").then((m) => ({ default: m.ThreadScreen })));
const ProfileScreen = lazy(() => import("@/ui/screens/ProfileScreen").then((m) => ({ default: m.ProfileScreen })));
const NotificationsScreen = lazy(() =>
  import("@/ui/screens/NotificationsScreen").then((m) => ({ default: m.NotificationsScreen })),
);
const SearchScreen = lazy(() => import("@/ui/screens/SearchScreen").then((m) => ({ default: m.SearchScreen })));

const TITLES: Record<View["name"], string> = {
  timeline: "Home",
  thread: "Post",
  profile: "Profile",
  notifications: "Notifications",
  search: "Search",
};

function viewKey(view: View): string {
  switch (view.name) {
    case "thread":
      return `thread:${view.uri}`;
    case "profile":
      return `profile:${view.actor}`;
    default:
      return view.name;
  }
}

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

  useEffect(() => {
    document.title = `${TITLES[current.name]} — Bluesky Client`;
  }, [current.name]);

  return (
    <div className="app-shell">
      <header className="top-bar">
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
      </header>
      <nav className="nav-bar" aria-label="Main">
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
      <main>
        <ErrorBoundary key={viewKey(current)}>
          <Suspense fallback={<p className="centered-message">Loading…</p>}>
            <ViewRouter view={current} />
          </Suspense>
        </ErrorBoundary>
      </main>
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
