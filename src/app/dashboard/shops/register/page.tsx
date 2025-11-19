
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
import { useAuth, useFirestore } from '@/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


const formSchema = z.object({
  shopName: z.string().min(2, { message: 'Shop name must be at least 2 characters.' }),
  shopType: z.enum(['online', 'physical'], { required_error: 'You must select a shop type.'}),
  shopImageUrl: z.string().url({ message: "Please enter a valid URL for the shop image." }),
  ownerName: z.string().min(2, { message: 'Owner name must be at least 2 characters.' }),
  ownerEmail: z.string().email({ message: 'Invalid email address.' }),
  ownerPassword: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  ownerImageUrl: z.string().url({ message: "Please enter a valid URL for the owner's image." }),
  phone: z.string().min(1, { message: 'Phone number is required.' }),
  deliveryChargeDefault: z.coerce.number().min(0, { message: 'Must be a positive number.' }),
  currency: z.string().min(2, { message: 'Currency is required.' }),
  taxRate: z.coerce.number().min(0, { message: 'Must be a positive number.' }),
});

export default function RegisterShopPage() {
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shopName: '',
      shopType: 'physical',
      shopImageUrl: '',
      ownerName: '',
      ownerEmail: '',
      ownerPassword: '',
      ownerImageUrl: '',
      phone: '',
      deliveryChargeDefault: 150,
      currency: 'PKR',
      taxRate: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // It's not ideal to create users like this. A better approach would be a server-side function.
      // This is a temporary solution for the demo.
      const userCredential = await createUserWithEmailAndPassword(auth, values.ownerEmail, values.ownerPassword);
      const ownerUser = userCredential.user;

      const shopId = `SHOP-${uuidv4().substring(0, 4).toUpperCase()}`;

      // Create shop document
      await setDoc(doc(firestore, "shops", shopId), {
          shopId: shopId,
          shopName: values.shopName,
          type: values.shopType,
          ownerUserId: ownerUser.uid,
          email: values.ownerEmail,
          phone: values.phone,
          shopImageUrl: values.shopImageUrl,
          deliveryChargeDefault: values.deliveryChargeDefault,
          currency: values.currency,
          taxRate: values.taxRate,
          status: 'active',
          createdAt: serverTimestamp()
      });

      // Create owner user document
      await setDoc(doc(firestore, "users", ownerUser.uid), {
        userId: ownerUser.uid,
        name: values.ownerName,
        email: values.ownerEmail,
        phone: values.phone,
        role: 'owner',
        shopId: shopId,
        imageUrl: values.ownerImageUrl,
        createdAt: serverTimestamp()
      });

      toast({
        title: 'Shop Registered',
        description: `Shop "${values.shopName}" and owner have been created.`,
      });

      router.push('/dashboard/shops');

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.message,
      });
    }
  }

  return (
    <div className="w-full">
        <Card>
            <CardHeader>
            <CardTitle>Register a New Shop</CardTitle>
            <CardDescription>Fill out the details to create a new shop and its owner.</CardDescription>
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
                              defaultValue={field.value}
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
                    <h3 className="text-lg font-medium">Owner Details</h3>
                     <FormField
                        control={form.control}
                        name="ownerName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Owner's Full Name</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., Ali Hasham" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="ownerEmail"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Owner's Email</FormLabel>
                                <FormControl>
                                <Input type="email" placeholder="owner@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="ownerPassword"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Owner's Password</FormLabel>
                                <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="ownerImageUrl"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Owner Image URL</FormLabel>
                            <FormControl>
                            <Input placeholder="https://example.com/owner-photo.jpg" {...field} />
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
                        {form.formState.isSubmitting ? 'Registering...' : 'Register Shop'}
                    </Button>
                </form>
            </Form>
            </CardContent>
        </Card>
    </div>
  );
}

    