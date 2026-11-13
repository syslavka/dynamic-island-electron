import { useCallback, useReducer } from "react";
import type { IslandNotification, NotificationBehavior } from "../types";
import { notificationService } from "../services/mockServices";

export type NotificationAction =
  | {
      type: "add";
      notification: IslandNotification;
      behavior: NotificationBehavior;
    }
  | { type: "dismiss"; id: string }
  | { type: "clear" };
/** Keep a bounded queue so a long-running demo cannot grow memory indefinitely. */
const MAX_NOTIFICATIONS = 20;
export function notificationReducer(
  state: IslandNotification[],
  action: NotificationAction,
): IslandNotification[] {
  if (action.type === "clear") return [];
  if (action.type === "dismiss")
    return state.filter((item) => item.id !== action.id);
  if (action.behavior === "replace") return [action.notification];
  if (action.behavior === "stack")
    return [action.notification, ...state].slice(0, MAX_NOTIFICATIONS);
  return [...state, action.notification].slice(-MAX_NOTIFICATIONS);
}
export function useNotifications(behavior: NotificationBehavior) {
  const [notifications, dispatch] = useReducer(notificationReducer, []);
  const push = useCallback(
    () =>
      dispatch({
        type: "add",
        notification: notificationService.create(),
        behavior,
      }),
    [behavior],
  );
  const dismiss = useCallback(
    (id: string) => dispatch({ type: "dismiss", id }),
    [],
  );
  const clear = useCallback(() => dispatch({ type: "clear" }), []);
  return { notifications, push, dismiss, clear };
}
