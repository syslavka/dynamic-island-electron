import { describe, expect, it } from "vitest";
import { notificationReducer } from "../hooks/useNotifications";
import type { IslandNotification } from "../types";

const notification = (id: string): IslandNotification => ({
  id,
  source: "Studio",
  title: `Message ${id}`,
  body: "A little heads-up",
  createdAt: 0,
});
describe("notification delivery", () => {
  it("queues messages in delivery order", () => {
    expect(
      notificationReducer([notification("1")], {
        type: "add",
        notification: notification("2"),
        behavior: "queue",
      }).map((item) => item.id),
    ).toEqual(["1", "2"]);
  });
  it("replaces the queue with only the latest message", () => {
    expect(
      notificationReducer([notification("1"), notification("2")], {
        type: "add",
        notification: notification("3"),
        behavior: "replace",
      }).map((item) => item.id),
    ).toEqual(["3"]);
  });
  it("stacks the newest message first", () => {
    expect(
      notificationReducer([notification("1")], {
        type: "add",
        notification: notification("2"),
        behavior: "stack",
      }).map((item) => item.id),
    ).toEqual(["2", "1"]);
  });
  it("dismisses a message without changing the remaining order", () => {
    expect(
      notificationReducer(
        [notification("1"), notification("2"), notification("3")],
        { type: "dismiss", id: "2" },
      ).map((item) => item.id),
    ).toEqual(["1", "3"]);
  });
  it("bounds the queue during long-running sessions", () => {
    const messages = Array.from({ length: 20 }, (_, index) =>
      notification(String(index)),
    );
    const next = notificationReducer(messages, {
      type: "add",
      notification: notification("latest"),
      behavior: "queue",
    });
    expect(next).toHaveLength(20);
    expect(next[0].id).toBe("1");
    expect(next[19].id).toBe("latest");
  });
  it("clears every message", () => {
    expect(notificationReducer([notification("1")], { type: "clear" })).toEqual(
      [],
    );
  });
});
