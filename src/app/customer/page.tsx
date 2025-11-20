
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import Image from 'next/image';
import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Order } from '@/lib/data';
import { Separator } from '@/components/ui/separator';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';

interface ShopConnection {
  shopId: string;
  shopName: string;
  status: 'pending' | 'active';
}

interface UserData {
  shopConnections?: ShopConnection[];
  phone?: string;
}

interface ShopData {
  shopName: string;
  phone: string;
  shopImageUrl: string;
}

interface PlatformSettings {
    connectedShopsEnabled: boolean;
}

// New component to handle the logic for a single shop
function ShopDashboardCard({ shopId }: { shopId: string }) {
    const firestore = useFirestore();
    const { user } = useUser();

    const shopDocRef = useMemoFirebase(() => {
        return doc(firestore, 'shops', shopId);
    }, [firestore, shopId]);

    const { data: shopData, isLoading: isShopDataLoading } = useDoc<ShopData>(shopDocRef);

    const ordersRef = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `shops/${shopId}/orders`), where('customerId', '==', user.uid));
    }, [firestore, user, shopId]);

    const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersRef);

    const { totalBill, totalPaid, totalUnpaid } = useMemo(() => {
        if (!orders) return { totalBill: 0, totalPaid: 0, totalUnpaid: 0 };
        
        const bill = orders.reduce((sum, order) => sum + order.total, 0);
        const paid = orders
            .filter(order => order.paymentStatus === 'Paid')
            .reduce((sum, order) => sum + order.total, 0);
        
        return {
            totalBill: bill,
            totalPaid: paid,
            totalUnpaid: bill - paid,
        };
    }, [orders]);
    
    const heroImage = PlaceHolderImages.find(p => p.id === 'landing-hero');

    if (isShopDataLoading || areOrdersLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <p>Loading shop details...</p>
                </CardContent>
            </Card>
        )
    }

    if (!shopData) {
        return null; // Or some error/not found state
    }

    return (
        <Card className="overflow-hidden">
            <div className="relative w-full h-48 md:h-64">
                <Image
                    src={shopData.shopImageUrl || heroImage?.imageUrl || 'https://placehold.co/1200x400'}
                    alt={shopData.shopName}
                    fill
                    className="object-cover"
                    data-ai-hint="retail store"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4 md:p-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{shopData.shopName}</h1>
                    <p className="text-base md:text-lg text-white/90">Your go-to place for quality products.</p>
                </div>
            </div>
            <CardContent className="p-4 md:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col gap-1 p-4 rounded-lg bg-secondary">
                        <span className="text-sm text-muted-foreground">Total Bill</span>
                        <span className="text-xl md:text-2xl font-bold">PKR {totalBill.toLocaleString()}</span>
                    </div>
                        <div className="flex flex-col gap-1 p-4 rounded-lg bg-green-100 dark:bg-green-900/50">
                        <span className="text-sm text-green-700 dark:text-green-400">Total Paid</span>
                        <span className="text-xl md:text-2xl font-bold text-green-800 dark:text-green-300">PKR {totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col gap-1 p-4 rounded-lg bg-red-100 dark:bg-red-900/50">
                        <span className="text-sm text-red-700 dark:text-red-400">Total Unpaid</span>
                        <span className="text-xl md:text-2xl font-bold text-red-800 dark:text-red-300">PKR {totalUnpaid.toLocaleString()}</span>
                    </div>
                </div>
                <Separator className="my-6" />
                <div>
                    <h3 className="text-lg font-semibold mb-2">Shop Information</h3>
                    <p className="text-muted-foreground">
                        <strong>Shop Name:</strong> {shopData.shopName}
                    </p>
                    <p className="text-muted-foreground">
                        <strong>Contact:</strong> {shopData.phone}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}


export default function CustomerDashboardPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserData>(userDocRef);

  const platformSettingsRef = useMemoFirebase(() => doc(firestore, 'platform_settings', 'features'), [firestore]);
  const { data: platformSettings, isLoading: areSettingsLoading } = useDoc<PlatformSettings>(platformSettingsRef);

  useEffect(() => {
    // If settings have loaded and connected shops are disabled, redirect.
    if (!areSettingsLoading && platformSettings?.connectedShopsEnabled === false) {
      router.replace('/customer/products');
    }
  }, [platformSettings, areSettingsLoading, router]);
  
  // Find ALL active shop connections
  const activeShopConnections = useMemo(() => {
    return userData?.shopConnections?.filter(c => c.status === 'active') ?? [];
  }, [userData]);

  const isLoading = isUserLoading || isUserDataLoading || areSettingsLoading;
  
  // While loading or if redirection is imminent, show a loader.
  if (isLoading || (!areSettingsLoading && platformSettings?.connectedShopsEnabled === false)) {
    return (
        <div className="flex justify-center items-center h-64">
            <p>Loading your dashboard...</p>
        </div>
    );
  }

  if (!user) {
     return (
        <div className="flex justify-center items-center h-64">
            <p>Please <Link href="/login" className="underline">log in</Link> to view your dashboard.</p>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 grid gap-8">
        {activeShopConnections.length > 0 ? (
            activeShopConnections.map(connection => (
                <ShopDashboardCard key={connection.shopId} shopId={connection.shopId} />
            ))
        ) : (
             <Card>
                <CardHeader>
                    <CardTitle>Welcome!</CardTitle>
                    <CardDescription>It looks like you don't have an active shop connection yet.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>You can request to join a shop from your <Link href="/customer/profile" className="underline font-medium">profile page</Link>.</p>
                    <p className="text-sm text-muted-foreground mt-2">If you have a pending request, please wait for the shop owner to approve it.</p>
                </CardContent>
             </Card>
        )}
    </div>
  );
}
