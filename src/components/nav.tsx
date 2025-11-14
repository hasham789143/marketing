'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Box,
  ShoppingCart,
  Users,
  Settings,
  Store,
} from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { SidebarMenuSkeleton } from '@/components/ui/sidebar';

const baseNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/dashboard/products', label: 'Products', icon: Box },
  { href: '/dashboard/staff', label: 'Staff', icon: Users },
];

const adminNavItems = [
    { href: '/dashboard/shops', label: 'Shops', icon: Store },
];

const bottomNavItems = [
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Nav() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user || isUserLoading) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, isUserLoading, firestore]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<{ role: string }>(userDocRef);

  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading) {
      return (
          <SidebarMenu>
              <SidebarMenuItem>
                  <SidebarMenuSkeleton showIcon={true} />
              </SidebarMenuItem>
               <SidebarMenuItem>
                  <SidebarMenuSkeleton showIcon={true} />
              </SidebarMenuItem>
               <SidebarMenuItem>
                  <SidebarMenuSkeleton showIcon={true} />
              </SidebarMenuItem>
          </SidebarMenu>
      )
  }

  const isAdmin = userData?.role === 'admin';

  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : [...baseNavItems];
  const finalNavItems = [...navItems, ...bottomNavItems];

  return (
    <SidebarMenu>
      {finalNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href) && (item.href === '/dashboard' ? pathname === item.href : true)}
            tooltip={item.label}
          >
            <Link href={item.href}>
                <item.icon />
                <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
