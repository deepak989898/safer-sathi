import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminAuthGuard } from "@/components/auth/admin-auth-guard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-muted/30">
        <AdminSidebar />
        <div className="pl-0 md:pl-64">
          <main className="min-h-screen pt-14 md:pt-0">{children}</main>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
