import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { SharedData, type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid, FolderKanban, Radius, BellElectric } from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutGrid,
  },
  {
    title: 'Drainase',
    href: '/admin/drainase',
    icon: FolderKanban,
  },
  {
    title: 'Rawan Banjir',
    href: '/admin/rawan-banjir',
    icon: Radius,
  },
  {
    title: 'Laporan Lokasi',
    href: '/report',
    icon: BellElectric,
  },
];

const footerNavItems: NavItem[] = [
  {
    title: 'Repository',
    href: 'https://github.com/laravel/react-starter-kit',
    icon: Folder,
  },
  {
    title: 'Documentation',
    href: 'https://laravel.com/docs/starter-kits#react',
    icon: BookOpen,
  },
];

export function AppSidebar() {
  const { auth } = usePage<SharedData>().props;

  // Filter menu berdasarkan role, misal hanya 'admin' yang boleh lihat menu tertentu
  const filteredMainNavItems = mainNavItems.filter(item => {
    // Jika menu admin (href diawali /admin/), hanya admin boleh lihat
    if (item.href.startsWith('/admin/')) {
      return auth.user.role === 'Admin';
    }
    return true; // selain menu admin, tampilkan semua
  });

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" prefetch>
                <AppLogo />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Kirim yang sudah difilter */}
        <NavMain items={filteredMainNavItems} />
      </SidebarContent>

      <SidebarFooter>
        <NavFooter items={footerNavItems} className="mt-auto" />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}

