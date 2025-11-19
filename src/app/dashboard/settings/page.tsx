'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UserData {
  role: string;
  shopId?: string;
  email: string;
}

interface ShopData {
  shopName: string;
  deliveryChargeDefault: number;
  currency: string;
}

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [shopName, setShopName] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState<number | string>('');
  const [currency, setCurrency] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserLoading } = useDoc<UserData>(userDocRef);
  const shopId = userData?.shopId;
  const isOwner = userData?.role === 'owner';

  const shopDocRef = useMemoFirebase(() => {
    if (!shopId) return null;
    return doc(firestore, 'shops', shopId);
  }, [shopId, firestore]);

  const { data: shopData, isLoading: isShopLoading } = useDoc<ShopData>(shopDocRef);

  useEffect(() => {
    if (shopData) {
      setShopName(shopData.shopName || '');
      setDeliveryCharge(shopData.deliveryChargeDefault || '');
      setCurrency(shopData.currency || '');
    }
  }, [shopData]);

  const handleSaveChanges = async () => {
    if (!shopDocRef) {
      toast({ variant: 'destructive', title: 'Error', description: 'Shop reference not found.' });
      return;
    }
    if (!isOwner) {
       toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only shop owners can change settings.' });
       return;
    }
    
    setIsSaving(true);
    try {
      await updateDoc(shopDocRef, {
        shopName: shopName,
        deliveryChargeDefault: Number(deliveryCharge),
        currency: currency,
      });
      toast({ title: 'Settings Saved', description: 'Your shop information has been updated.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isUserLoading || isShopLoading;

  if (isLoading) {
    return (
        <div className="max-w-2xl mx-auto">
            <p>Loading settings...</p>
        </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2 font-headline">Settings</h1>
        <p className="text-muted-foreground mb-8">
            Manage your shop settings and preferences.
        </p>
      <Card>
        <CardHeader>
          <CardTitle>Shop Details</CardTitle>
          <CardDescription>
            {isOwner ? "Update your shop's information." : "View your shop's information. Only owners can make changes."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="shop-name">Shop Name</Label>
            <Input id="shop-name" value={shopName} onChange={e => setShopName(e.target.value)} disabled={isLoading || isSaving || !isOwner} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="shop-id">Shop ID</Label>
            <Input id="shop-id" value={shopId || 'N/A'} readOnly disabled />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="grid gap-2">
                <Label htmlFor="delivery-charge">Default Delivery Charge</Label>
                <Input id="delivery-charge" type="number" value={deliveryCharge} onChange={e => setDeliveryCharge(e.target.value)} disabled={isLoading || isSaving || !isOwner} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" value={currency} onChange={e => setCurrency(e.target.value)} disabled={isLoading || isSaving || !isOwner} />
            </div>
          </div>
           <div className="grid gap-2">
            <Label htmlFor="owner-email">Owner Email</Label>
            <Input id="owner-email" type="email" value={userData?.email || ''} readOnly disabled />
          </div>
        </CardContent>
        {isOwner && (
            <CardFooter>
                <Button onClick={handleSaveChanges} disabled={isLoading || isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
