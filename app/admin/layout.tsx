import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  // If we wanted a global admin sidebar or topbar, it could go here.
  // For now, the dashboard and login pages manage their own full-screen layouts.
  return <>{children}</>;
}
