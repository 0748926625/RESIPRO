import { NOTIFICATION_TYPE_LABELS } from "@/lib/constants/notifications";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications/actions";

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

export function NotificationsList({
  notifications,
  revalidatePath,
}: {
  notifications: NotificationRow[];
  revalidatePath: string;
}) {
  const hasUnread = notifications.some((notification) => !notification.is_read);

  return (
    <div className="flex flex-col gap-4">
      {hasUnread ? (
        <form action={markAllNotificationsRead.bind(null, revalidatePath)}>
          <button type="submit" className="text-xs underline">
            Tout marquer comme lu
          </button>
        </form>
      ) : null}

      {notifications.length === 0 ? (
        <p className="text-sm text-foreground/60">Aucune notification pour le moment.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`flex items-start justify-between gap-4 px-4 py-3 text-sm ${
                notification.is_read ? "" : "bg-foreground/5"
              }`}
            >
              <div>
                <p className="text-xs text-foreground/50">
                  {NOTIFICATION_TYPE_LABELS[notification.type] ?? notification.type} ·{" "}
                  {dateTimeFormatter.format(new Date(notification.created_at))}
                </p>
                <p className="font-medium text-foreground">{notification.title}</p>
                {notification.body ? <p className="text-foreground/70">{notification.body}</p> : null}
              </div>
              {!notification.is_read ? (
                <form action={markNotificationRead.bind(null, notification.id, revalidatePath)}>
                  <button type="submit" className="text-xs text-foreground/60 underline">
                    Marquer lu
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
