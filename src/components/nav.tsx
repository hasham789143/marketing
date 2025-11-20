
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSkeleton,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Box,
  ShoppingCart,
  Users,
  Settings,
  Store,
  User as UserIcon,
  Package,
  Users2,
  ShoppingBag,
  List,
  BellRing,
  Globe,
} from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { useMemo } from 'react';


interface ShopConnection {
    shopId: string;
    shopName: string;
    status: 'pending' | 'active';
}
interface ConnectionRequest {
    id: string; // This will be the user's ID
    name: string;
    email: string;
    shopConnections: ShopConnection[];
}

interface PlatformSettings {
    connectedShopsEnabled: boolean;
}


const adminNavItems = [
    { href: '/dashboard/shops', label: 'Shops', icon: Store },
    { href: '/dashboard/users', label: 'Users', icon: Users2 },
    { href: '/dashboard/settings/platform', label: 'Platform', icon: Globe },
];

const shopNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/dashboard/products', label: 'Products', icon: Box },
  { href: '/dashboard/categories', label: 'Categories', icon: List },
  { href: '/dashboard/requests', label: 'Requests', icon: BellRing },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/staff', label: 'Staff', icon: Users2 },
];

const customerNavItems = [
    { href: '/customer', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/customer/products', label: 'Browse Products', icon: ShoppingBag },
    { href: '/customer/cart', label: 'My Cart', icon: ShoppingCart },
    { href: '/customer/orders', label: 'My Bills', icon: Package },
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

  const { data: userData, isLoading: isUserDataLoading } = useDoc<{ role: string, shopId?: string }>(userDocRef);
  
  const platformSettingsRef = useMemoFirebase(() => doc(firestore, 'platform_settings', 'features'), [firestore]);
  const { data: platformSettings, isLoading: areSettingsLoading } = useDoc<PlatformSettings>(platformSettingsRef);

  const requestsRef = useMemoFirebase(() => {
    if (!userData?.shopId || userData.role !== 'owner') return null;
    return query(
        collection(firestore, 'users'), 
        where('shopConnectionIds', 'array-contains', userData.shopId)
    );
  }, [firestore, userData]);

  const { data: usersWithRequests } = useCollection<ConnectionRequest>(requestsRef);

  const pendingRequestsCount = useMemo(() => {
    if (!usersWithRequests || !userData?.shopId) return 0;
    return usersWithRequests
      .map(u => u.shopConnections.find(sc => sc.shopId === userData.shopId && sc.status === 'pending'))
      .filter(Boolean).length;
  }, [usersWithRequests, userData?.shopId]);


  const isLoading = isUserLoading || isUserDataLoading || areSettingsLoading;

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
  const connectedShopsEnabled = platformSettings?.connectedShopsEnabled ?? false;

  let navItems = [];
  let bottomNavItems = [];

  if (pathname.startsWith('/customer')) {
      if (connectedShopsEnabled) {
        navItems = customerNavItems;
      } else {
        navItems = customerNavItems.filter(item => item.href === '/customer/products');
      }
      bottomNavItems = []; // No settings for customers in this sidebar
  } else if (role === 'admin') {
      navItems = [...shopNavItems.slice(0,1), ...adminNavItems, ...shopNavItems.slice(1)];
      bottomNavItems = commonBottomNav;
  } else if (role === 'owner' || role === 'staff') {
      navItems = shopNavItems;
      bottomNavItems = commonBottomNav;
  } else {
    // Fallback for users with no role or customers visiting dashboard URLs
    if (pathname.startsWith('/customer')) {
        if (connectedShopsEnabled) {
            navItems = customerNavItems;
        } else {
            navItems = customerNavItems.filter(item => item.href === '/customer/products');
        }
        bottomNavItems = [];
    } else {
        return null;
    }
  }

  const finalNavItems = [...navItems, ...bottomNavItems];
  
  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/customer') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <SidebarMenu>
      {finalNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={isActive(item.href)}
            tooltip={item.label}
          >
            <Link href={item.href}>
                <item.icon />
                <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
          {item.href === '/dashboard/requests' && pendingRequestsCount > 0 && (
             <SidebarMenuBadge>{pendingRequestsCount}</SidebarMenuBadge>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
