import type { ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Header } from '@/components/header';
import { Nav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bot, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar
          variant="sidebar"
          collapsible="icon"
        >
          <SidebarHeader>
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-sidebar-foreground hover:text-sidebar-accent transition-colors">
              <Bot className="h-6 w-6 text-sidebar-accent" />
              <span className="duration-200 group-data-[collapsible=icon]:hidden">ShopSync</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <Nav />
          </SidebarContent>
          <SidebarFooter>
             <Button asChild variant="ghost" className="w-full justify-start gap-2">
                <Link href="/">
                    <LogOut/>
                    <span className="duration-200 group-data-[collapsible=icon]:hidden">Logout</span>
                </Link>
             </Button>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex flex-col">
          <Header />
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
