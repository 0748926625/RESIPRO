import { createClient } from "@/lib/supabase/server";

export async function getOwnNotifications() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { notifications: [], unreadCount: 0 };
  }

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, is_read, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = data ?? [];
  return { notifications, unreadCount: notifications.filter((n) => !n.is_read).length };
}
