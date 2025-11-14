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
  User as UserIcon,
  Package
} from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { SidebarMenuSkeleton } from '@/components/ui/sidebar';

const adminNavItems = [
    { href: '/dashboard/shops', label: 'Shops', icon: Store },
];

const shopNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/dashboard/products', label: 'Products', icon: Box },
  { href: '/dashboard/staff', label: 'Staff', icon: Users },
];

const customerNavItems = [
    { href: '/customer/orders', label: 'My Orders', icon: Package },
    { href: '/customer/profile', label: 'Profile', icon: UserIcon },
];

const commonBottomNav = [
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];


export function Nav() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

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

  const role = userData?.role;

  let navItems = [];
  let bottomNavItems = commonBottomNav;

  if (pathname.startsWith('/customer')) {
      navItems = customerNavItems;
      bottomNavItems = []; // No settings for customers in this sidebar
  } else if (role === 'admin') {
      navItems = [...shopNavItems.slice(0,1), ...adminNavItems, ...shopNavItems.slice(1)];
  } else if (role === 'owner' || role === 'staff') {
      navItems = shopNavItems;
  }

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
