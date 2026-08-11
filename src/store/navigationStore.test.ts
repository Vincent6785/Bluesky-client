import { beforeEach, describe, expect, it } from "vitest";
import { useNavigationStore } from "./navigationStore";

beforeEach(() => {
  useNavigationStore.setState({ stack: [{ name: "timeline" }], current: { name: "timeline" } });
});

describe("navigationStore", () => {
  it("pushes views onto the stack", () => {
    useNavigationStore.getState().push({ name: "profile", actor: "did:plc:abc" });
    const { current, stack } = useNavigationStore.getState();
    expect(current).toEqual({ name: "profile", actor: "did:plc:abc" });
    expect(stack).toHaveLength(2);
  });

  it("back() pops to the previous view", () => {
    useNavigationStore.getState().push({ name: "search" });
    useNavigationStore.getState().push({ name: "notifications" });
    useNavigationStore.getState().back();
    expect(useNavigationStore.getState().current).toEqual({ name: "search" });
  });

  it("back() is a no-op at the root of the stack", () => {
    useNavigationStore.getState().back();
    expect(useNavigationStore.getState().current).toEqual({ name: "timeline" });
    expect(useNavigationStore.getState().stack).toHaveLength(1);
  });

  it("reset() replaces the whole stack", () => {
    useNavigationStore.getState().push({ name: "search" });
    useNavigationStore.getState().reset({ name: "notifications" });
    expect(useNavigationStore.getState().stack).toEqual([{ name: "notifications" }]);
  });
});
