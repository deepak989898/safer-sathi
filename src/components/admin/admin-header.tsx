import { Search } from "lucide-react";
import { AdminNotificationsBell } from "@/components/admin/admin-notifications-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

interface AdminHeaderProps {
  title: string;
  description?: string;
  adminName?: string;
}

export function AdminHeader({
  title,
  description,
  adminName = "Admin User",
}: AdminHeaderProps) {
  const initials = adminName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 md:sticky md:top-0 md:z-30">
      <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 md:h-16 md:px-6 md:py-0">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h1>
          {description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:line-clamp-1 sm:text-sm">
              {description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." className="w-64 pl-9" />
          </div>
          <div className="hidden md:block">
            <AdminNotificationsBell />
          </div>
          <div className="flex items-center gap-2 border-l pl-2 sm:gap-3 sm:pl-4">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium leading-none">{adminName}</p>
              <p className="mt-1 text-xs text-muted-foreground">Super Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
