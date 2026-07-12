"use client";
import { useEffect, useRef, type RefObject } from "react";
import type { ChatStatus, UIMessage } from "ai";

/** Pins the transcript to its bottom edge while a reply streams.
 *
 * `messages` is a fresh array on every token, which is exactly the signal to follow; `status` covers
 * the edges where the array does not change but the layout does (the typing indicator appearing). */
export function useAutoScroll(
  messages: UIMessage[],
  status: ChatStatus,
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages, status]);

  return ref;
}
