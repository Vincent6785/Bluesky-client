import type { AppBskyActorDefs } from "@atproto/api";

/** Full profile, as returned by getProfile — used for profile screens. */
export type ProfileDetailed = AppBskyActorDefs.ProfileViewDetailed;

/** Lightweight profile, as embedded in posts/notifications/follow lists. */
export type ProfileBasic = AppBskyActorDefs.ProfileViewBasic;

/** Profile with bio/counts but not the full detailed view — returned by actor search. */
export type Profile = AppBskyActorDefs.ProfileView;

export type ProfileViewer = AppBskyActorDefs.ViewerState;
