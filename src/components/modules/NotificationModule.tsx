import { Icon } from "../Icon";
import { useSettings } from "../../hooks/useSettings";
import type { IslandController } from "../../hooks/useDynamicIsland";

export function NotificationModule({ island }: { island: IslandController }) {
  const { settings } = useSettings();
  const visible =
    settings.notificationBehavior === "stack"
      ? island.notifications.slice(0, 3)
      : island.notifications.slice(0, 1);
  return (
    <div className="notification-module module-enter">
      <div className="module-section-label">
        <span>
          {island.notifications.length
            ? `${island.notifications.length} notification${island.notifications.length === 1 ? "" : "s"}`
            : "All clear"}
        </span>
        {island.notifications.length > 0 && (
          <button className="text-button" onClick={island.clear}>
            Clear all
          </button>
        )}
      </div>
      {visible.length ? (
        visible.map((item) => (
          <article className="notification-item" key={item.id}>
            <div className="notification-avatar">
              {item.source === "Messages" ? (
                "AM"
              ) : (
                <Icon
                  name={item.source === "Calendar" ? "calendar" : "sparkle"}
                  size={18}
                />
              )}
            </div>
            <div>
              <div className="notification-source">
                {item.source}
                <time dateTime={new Date(item.createdAt).toISOString()}>
                  {Date.now() - item.createdAt < 60000
                    ? "now"
                    : `${Math.floor((Date.now() - item.createdAt) / 60000)}m ago`}
                </time>
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
            <button
              className="icon-button dismiss"
              aria-label={`Dismiss notification from ${item.title}`}
              onClick={() => island.dismiss(item.id)}
            >
              <Icon name="close" size={14} />
            </button>
          </article>
        ))
      ) : (
        <div className="empty-notifications">
          <Icon name="bell" size={30} />
          <h3>A moment of quiet.</h3>
          <p>We’ll keep the important things here.</p>
        </div>
      )}
      <button className="module-action" onClick={island.notify}>
        <Icon name="bell" size={14} /> Send a sample notification
      </button>
    </div>
  );
}
