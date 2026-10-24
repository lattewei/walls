"use client";

import { useSyncExternalStore } from "react";

import { peekToken, peekUser, subscribeSession } from "./auth";

export function useSessionUser() {
  return useSyncExternalStore(subscribeSession, peekUser, () => null);
}

export function useSessionToken() {
  return useSyncExternalStore(subscribeSession, peekToken, () => null);
}
