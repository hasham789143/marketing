
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
import { Label } from '@/components/ui/label';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, setDoc, collection, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Loader2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Product } from '@/lib/data';

interface UserData {
  role: string;
}

interface PlatformSettings {
  connectedShopsEnabled: boolean;
  featuredProductId?: string;
}

export default function PlatformSettingsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [connectedShopsEnabled, setConnectedShopsEnabled] = useState(false);
  const [featuredProductId, setFeaturedProductId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // For product search popover
  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserData>(userDocRef);
  const isAdmin = userData?.role === 'admin';

  const settingsDocRef = useMemoFirebase(() => {
    return doc(firestore, 'platform_settings', 'features');
  }, [firestore]);

  const { data: platformSettings, isLoading: areSettingsLoading } = useDoc<PlatformSettings>(settingsDocRef);
  
  const allProductsRef = useMemoFirebase(() => {
    return query(collection(firestore, 'products')); // This might need to query a collection group
  }, [firestore]);
  const { data: allProducts, isLoading: areProductsLoading } = useCollection<Product>(allProductsRef);


  useEffect(() => {
    if (platformSettings) {
      setConnectedShopsEnabled(platformSettings.connectedShopsEnabled);
      setFeaturedProductId(platformSettings.featuredProductId);
    }
  }, [platformSettings]);

  useEffect(() => {
    if (featuredProductId && allProducts) {
        const product = allProducts.find(p => p.id === featuredProductId);
        setSelectedProduct(product || null);
    }
  }, [featuredProductId, allProducts]);


  const handleSaveChanges = async () => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only administrators can change platform settings.' });
      return;
    }
    
    setIsSaving(true);
    try {
      // Use setDoc with merge:true to create the doc if it doesn't exist
      await setDoc(settingsDocRef, {
        connectedShopsEnabled: connectedShopsEnabled,
        featuredProductId: featuredProductId || null,
      }, { merge: true });

      toast({ title: 'Platform Settings Saved', description: 'The changes have been applied globally.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isUserLoading || isUserDataLoading || areSettingsLoading || areProductsLoading;
  
  if (isLoading) {
    return <div className="flex w-full items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  
  if (!isAdmin) {
      return (
        <Card>
            <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>You do not have permission to view this page.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            </CardContent>
        </Card>
      )
  }

  return (
    <div className="w-full space-y-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Platform Settings</h1>
            <p className="text-muted-foreground">
                Manage global settings and feature flags for the entire application.
            </p>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>
            Enable or disable major features across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="connected-shops-switch" className="font-medium">
                Enable "Your Connected Shops"
              </Label>
              <p className="text-sm text-muted-foreground">
                Allows customers to connect to physical shops and see their specific products.
              </p>
            </div>
            <Switch
              id="connected-shops-switch"
              checked={connectedShopsEnabled}
              onCheckedChange={setConnectedShopsEnabled}
              disabled={isLoading || isSaving}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Banner Management</CardTitle>
          <CardDescription>
            Set a featured product to display in the main banner on the customer products page.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid gap-2">
                <Label>Featured Product</Label>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between"
                        >
                        {selectedProduct
                            ? `${selectedProduct.name} (ID: ${selectedProduct.id})`
                            : "Select product..."}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search product..." />
                            <CommandEmpty>No product found.</CommandEmpty>
                            <CommandList>
                                <CommandGroup>
                                {allProducts?.map((product) => (
                                    <CommandItem
                                        key={product.id}
                                        value={`${product.name} ${product.id}`}
                                        onSelect={() => {
                                            setFeaturedProductId(product.id);
                                            setSelectedProduct(product);
                                            setOpen(false);
                                        }}
                                    >
                                    {product.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                 <Button 
                    variant="link" 
                    className="p-0 h-auto self-start"
                    onClick={() => {
                        setFeaturedProductId(undefined);
                        setSelectedProduct(null);
                    }}
                >
                    Clear selection (auto-select by rating)
                </Button>
            </div>
        </CardContent>
      </Card>

      <div className="flex">
        <Button onClick={handleSaveChanges} disabled={isLoading || isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving All Settings...</> : 'Save All Settings'}
        </Button>
      </div>

    </div>
  );
}

    