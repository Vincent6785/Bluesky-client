import { create } from "zustand";

export type View =
  | { name: "timeline" }
  | { name: "thread"; uri: string }
  | { name: "profile"; actor: string }
  | { name: "notifications" }
  | { name: "search" };

type NavigationStore = {
  stack: View[];
  current: View;
  push: (view: View) => void;
  back: () => void;
  reset: (view: View) => void;
};

const HOME: View = { name: "timeline" };

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  stack: [HOME],
  current: HOME,
  push: (view) => set(({ stack }) => ({ stack: [...stack, view], current: view })),
  back: () => {
    const { stack } = get();
    if (stack.length <= 1) return;
    const nextStack = stack.slice(0, -1);
    set({ stack: nextStack, current: nextStack[nextStack.length - 1] ?? HOME });
  },
  reset: (view) => set({ stack: [view], current: view }),
}));
