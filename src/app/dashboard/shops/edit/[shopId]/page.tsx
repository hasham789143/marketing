
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Shop } from '@/lib/data';


const formSchema = z.object({
  shopName: z.string().min(2, { message: 'Shop name must be at least 2 characters.' }),
  shopType: z.enum(['online', 'physical'], { required_error: 'You must select a shop type.'}),
  shopImageUrl: z.string().url({ message: "Please enter a valid URL for the shop image." }),
  phone: z.string().min(1, { message: 'Phone number is required.' }),
  deliveryChargeDefault: z.coerce.number().min(0, { message: 'Must be a positive number.' }),
  currency: z.string().min(2, { message: 'Currency is required.' }),
  taxRate: z.coerce.number().min(0, { message: 'Must be a positive number.' }),
});

export default function EditShopPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { user } = useUser();

    const shopId = params.shopId as string;

    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userData, isLoading: isUserLoading } = useDoc(userDocRef);
    const isAdmin = userData?.role === 'admin';

    const shopDocRef = useMemoFirebase(() => {
        if (!shopId) return null;
        return doc(firestore, 'shops', shopId);
    }, [shopId, firestore]);
    const { data: shopData, isLoading: isShopLoading } = useDoc<Shop>(shopDocRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shopName: '',
      shopType: 'physical',
      shopImageUrl: '',
      phone: '',
      deliveryChargeDefault: 150,
      currency: 'PKR',
      taxRate: 0,
    },
  });
  
  useEffect(() => {
    if (shopData) {
        form.reset(shopData);
    }
  }, [shopData, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!shopDocRef) return;
    try {
      await updateDoc(shopDocRef, {
        ...values,
        updatedAt: serverTimestamp()
      });

      toast({
        title: 'Shop Updated',
        description: `Shop "${values.shopName}" has been updated.`,
      });

      router.push('/dashboard/shops');

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message,
      });
    }
  }
  
  const isLoading = isUserLoading || isShopLoading;

  if (isLoading) {
    return <div className="flex w-full items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!isAdmin) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>You do not have permission to edit shops.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => router.back()}>Go Back</Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="w-full">
        <Card>
            <CardHeader>
            <CardTitle>Edit Shop</CardTitle>
            <CardDescription>Update the details for this shop.</CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Separator />
                    <h3 className="text-lg font-medium">Shop Details</h3>
                    <FormField
                        control={form.control}
                        name="shopName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Shop Name</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., Ali's Fashion" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                      control={form.control}
                      name="shopType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Shop Type</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="physical" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Physical (Requires customer connection)
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="online" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Online (Products are visible to all customers)
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                        control={form.control}
                        name="shopImageUrl"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Shop Image URL</FormLabel>
                            <FormControl>
                            <Input placeholder="https://example.com/shop-banner.jpg" {...field} />
                            </FormControl>
                             <FormDescription>This image will be used for the customer-facing slider.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Shop Phone Number</FormLabel>
                            <FormControl>
                            <Input placeholder="+92 300 1234567" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <Separator />
                    <h3 className="text-lg font-medium">Financial Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="deliveryChargeDefault"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Default Delivery</FormLabel>
                                <FormControl>
                                <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="currency"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Currency</FormLabel>
                                <FormControl>
                                <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="taxRate"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tax Rate (%)</FormLabel>
                                <FormControl>
                                <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                    </Button>
                </form>
            </Form>
            </CardContent>
        </Card>
    </div>
  );
}
