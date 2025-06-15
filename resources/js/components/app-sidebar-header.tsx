import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';

import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, router, usePage } from '@inertiajs/react';



export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {

  const { notifications, hasUnreadNotifications } = (usePage().props as unknown) as {
    notifications: {
      id: string;
      title: string;
      body: string;
      report_id: number;
      read_at: string | null;
      created_at: string;
    }[];
    hasUnreadNotifications: boolean;
  };

  const markAllNotificationsAsRead = () => {
    router.post(route('notifications.read.all'), {}, {
      preserveScroll: true,
      preserveState: true,
      only: ['notifications', 'hasUnreadNotifications'], // request hanya bagian ini
    });
  };


  return (
    <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
      {/* Kiri: Sidebar & Breadcrumbs */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Breadcrumbs breadcrumbs={breadcrumbs} />
      </div>

      {/* Kanan: Notifikasi */}
      <div className="relative mx-4">
        <DropdownMenu onOpenChange={(open) => open && markAllNotificationsAsRead()}>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 rounded-full hover:bg-muted transition focus:outline-none cursor-pointer">
              <Bell className="w-5 h-5" />
              {/* Indikator notifikasi baru hanya muncul jika ada notifikasi belum dibaca */}
              {hasUnreadNotifications && (
                <span className="absolute top-1.5 right-1.5 inline-flex h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-full">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <Link href={route('report.detail', notif.report_id)}>
                  <DropdownMenuItem key={notif.id} className="py-2 cursor-pointer">
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-medium">{notif.title}</div>
                      <div className="text-sm">{notif.body}</div>
                      <div className="text-xs text-muted-foreground">{notif.created_at}</div>
                    </div>
                  </DropdownMenuItem>
                </Link>
              ))
            ) : (
              <DropdownMenuItem disabled className="py-2 text-center text-sm text-muted-foreground">
                Belum ada notifikasi
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
