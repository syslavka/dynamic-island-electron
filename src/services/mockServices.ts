import type { IslandNotification, MediaTrack } from "../types";

/** Replace this adapter with an API subscription without changing view components. */
export const mediaService = {
  tracks: [
    {
      id: "coast",
      title: "Weightless",
      artist: "Amara Sol",
      album: "Slow mornings",
      duration: 234,
      color: "coast",
    },
    {
      id: "dawn",
      title: "First Light",
      artist: "Kairo",
      album: "Daybreak",
      duration: 198,
      color: "dawn",
    },
    {
      id: "forest",
      title: "Somewhere, Slowly",
      artist: "The Quiet Hours",
      album: "A place to land",
      duration: 265,
      color: "forest",
    },
  ] satisfies MediaTrack[],
};
const messages = [
  {
    source: "Messages",
    title: "Alex Morgan",
    body: "Coffee in 10? Found a little place you’d love. ☕",
  },
  {
    source: "Calendar",
    title: "A little heads-up",
    body: "Your design catch-up starts in 15 minutes.",
  },
  {
    source: "Studio",
    title: "You’re all caught up",
    body: "Take a breath. Good things take a little space.",
  },
];
let messageIndex = 0;
export const notificationService = {
  create(): IslandNotification {
    const message = messages[messageIndex++ % messages.length];
    return { ...message, id: crypto.randomUUID(), createdAt: Date.now() };
  },
};
export const weatherService = {
  getCurrent: () => ({
    city: "San Francisco",
    temperature: 19,
    condition: "Mostly sunny",
    high: 21,
    low: 14,
  }),
};
export const calendarService = {
  getNext: () => ({
    title: "Design catch-up",
    time: "14:30 – 15:00",
    attendees: "You, Alex & Jamie",
    location: "Studio room · Video call",
  }),
};
