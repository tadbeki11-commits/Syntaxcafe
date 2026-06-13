import { redirect } from "next/navigation";

export default function Home() {
  // Middleware sends unauthenticated users from /dashboard to /login.
  redirect("/dashboard/overview");
}
