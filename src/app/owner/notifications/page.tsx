import { NotificationsList } from "@/components/layout/notifications-list";
import { getOwnNotifications } from "@/lib/notifications/get-notifications";

export default async function OwnerNotificationsPage() {
  const { notifications } = await getOwnNotifications();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
      <NotificationsList notifications={notifications} revalidatePath="/owner/notifications" />
    </div>
  );
}
