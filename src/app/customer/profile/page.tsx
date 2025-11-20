
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
import { useFirestore, useUser, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { arrayRemove, arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedCallback } from 'use-debounce';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, Info, Loader2, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface ShopConnection {
    shopId: string;
    shopName: string;
    status: 'pending' | 'active';
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  deliveryAddress?: string;
  shopConnections?: ShopConnection[];
}

interface ShopData {
    shopName: string;
}

interface PlatformSettings {
    connectedShopsEnabled: boolean;
}

export default function CustomerProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // For the "Add Shop" form
  const [shopIdInput, setShopIdInput] = useState('');
  const [verifiedShop, setVerifiedShop] = useState<{ id: string; name: string } | null>(null);
  const [isCheckingShop, setIsCheckingShop] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);
  const [isAddingShop, setIsAddingShop] = useState(false);

  const platformSettingsRef = useMemoFirebase(() => doc(firestore, 'platform_settings', 'features'), [firestore]);
  const { data: platformSettings, isLoading: areSettingsLoading } = useDoc<PlatformSettings>(platformSettingsRef);
  const connectedShopsEnabled = platformSettings?.connectedShopsEnabled ?? false;

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setPhone(userProfile.phone || '');
      setDeliveryAddress(userProfile.deliveryAddress || '');
    }
  }, [userProfile]);

  const debouncedCheckShopId = useDebouncedCallback(async (id: string) => {
    if (id) {
        setIsCheckingShop(true);
        setVerifiedShop(null);
        setShopError(null);
        try {
            const shopDocRef = doc(firestore, 'shops', id);
            const shopDoc = await getDoc(shopDocRef);
            if (shopDoc.exists()) {
                const shopData = shopDoc.data() as ShopData;
                setVerifiedShop({ id: shopDoc.id, name: shopData.shopName });
            } else {
                setShopError('No shop found with this ID.');
            }
        } catch (error) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `shops/${id}`, operation: 'get' }));
            setShopError('Failed to verify Shop ID.');
        } finally {
            setIsCheckingShop(false);
        }
    } else {
        setVerifiedShop(null);
        setShopError(null);
    }
  }, 500);

  const handleAddShopRequest = async () => {
    if (!userDocRef || !verifiedShop) return;
    setIsAddingShop(true);

    const newConnection: ShopConnection = {
      shopId: verifiedShop.id,
      shopName: verifiedShop.name,
      status: 'pending',
    };
    
    updateDoc(userDocRef, {
        shopConnections: arrayUnion(newConnection),
        shopConnectionIds: arrayUnion(verifiedShop.id) // Add to the queryable array
    }).then(() => {
        toast({ title: 'Request Sent', description: `Your request to join ${verifiedShop.name} has been sent.` });
        setShopIdInput('');
        setVerifiedShop(null);
    }).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: { shopConnections: '...' }
        }));
    }).finally(() => {
        setIsAddingShop(false);
    });
  };
  
  const handleRemoveShop = async (shopToRemove: ShopConnection) => {
    if (!userDocRef) return;
     updateDoc(userDocRef, {
        shopConnections: arrayRemove(shopToRemove),
        shopConnectionIds: arrayRemove(shopToRemove.shopId) // Also remove from queryable array
    }).then(() => {
        toast({ title: 'Shop Removed', description: `You have left ${shopToRemove.shopName}.` });
    }).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: { shopConnections: '...' }
        }));
    });
  };


  const handleSaveChanges = async () => {
    if (!userDocRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'User not found.'});
        return;
    };
    setIsSaving(true);
    const updatedData = {
        name: name,
        phone: phone,
        deliveryAddress: deliveryAddress,
    };
    updateDoc(userDocRef, updatedData).then(() => {
        toast({ title: 'Profile Updated', description: 'Your information has been saved successfully.'});
    }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: updatedData
        }));
    }).finally(() => {
        setIsSaving(false);
    });
  };
  
  const isLoading = isUserLoading || isProfileLoading || areSettingsLoading;
  const getStatusVariant = (status: string) => {
    switch (status) {
        case 'active': return 'default';
        case 'pending': return 'secondary';
        default: return 'outline';
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 grid w-full gap-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">My Profile</h1>
        
        <Card>
            <CardHeader>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>Update your account information.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
            <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading || isSaving} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={userProfile?.email || ''} readOnly disabled />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isLoading || isSaving} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="deliveryAddress">Delivery Address</Label>
                <Textarea id="deliveryAddress" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} disabled={isLoading || isSaving} placeholder="123 Main St, Anytown, USA 12345" />
            </div>
            </CardContent>
            <CardFooter>
            <Button onClick={handleSaveChanges} disabled={isLoading || isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
            </Button>
            </CardFooter>
        </Card>

        {connectedShopsEnabled && (
            <Card>
                <CardHeader>
                    <CardTitle>Manage Shop Connections</CardTitle>
                    <CardDescription>Request to join new shops or remove existing ones.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Label htmlFor="shop-id-input">Request to Join a New Shop</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input 
                                id="shop-id-input"
                                placeholder="Enter Shop ID"
                                value={shopIdInput}
                                onChange={(e) => {
                                    setShopIdInput(e.target.value);
                                    debouncedCheckShopId(e.target.value);
                                }}
                            />
                            <Button onClick={handleAddShopRequest} disabled={!verifiedShop || isAddingShop}>
                                {isAddingShop ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Send Request
                            </Button>
                        </div>
                        {isCheckingShop && (
                            <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</div>
                        )}
                        {shopError && (
                            <Alert variant="destructive" className="mt-2"><Info className="h-4 w-4"/><AlertDescription>{shopError}</AlertDescription></Alert>
                        )}
                        {verifiedShop && (
                            <Alert className="mt-2"><CheckCircle className="h-4 w-4"/><AlertDescription>Shop Found: <strong>{verifiedShop.name}</strong></AlertDescription></Alert>
                        )}
                    </div>
                    <Separator className="my-6" />
                    <h3 className="text-md font-medium mb-4">Your Shops</h3>
                    <div className="space-y-3">
                        {userProfile?.shopConnections && userProfile.shopConnections.length > 0 ? (
                            userProfile.shopConnections.map((conn) => (
                            <div key={conn.shopId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-2">
                                    <div>
                                        <p className="font-medium">{conn.shopName}</p>
                                        <p className="text-sm text-muted-foreground">{conn.shopId}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={getStatusVariant(conn.status)}>{conn.status}</Badge>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveShop(conn)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                            </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">You are not connected to any shops yet.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
