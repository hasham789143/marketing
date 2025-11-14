
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface Shop {
    id: string;
    shopName: string;
}

const formSchema = z.object({
  shopId: z.string().min(1, { message: 'Please select a shop.' }),
  name: z.string().min(2, { message: 'Product name must be at least 2 characters.' }),
  sku: z.string().min(1, { message: 'SKU is required.' }),
  category: z.string().min(1, { message: 'Category is required.' }),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  stockQty: z.coerce.number().int().min(0, { message: 'Stock must be a positive integer.' }),
  description: z.string().optional(),
});

export default function AddProductPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const shopsRef = useMemoFirebase(() => collection(firestore, 'shops'), [firestore]);
  const { data: shops, isLoading: isLoadingShops } = useCollection<Shop>(shopsRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shopId: '',
      name: '',
      sku: '',
      category: '',
      price: 0,
      stockQty: 0,
      description: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const { shopId, ...productData } = values;
      const productId = `PROD-${uuidv4().substring(0, 4).toUpperCase()}`;

      await addDoc(collection(firestore, `shops/${shopId}/products`), {
        ...productData,
        productId: productId,
        shopId: shopId,
        images: [], // Default to empty array
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: 'Product Added',
        description: `Product "${values.name}" has been successfully added to the shop.`,
      });

      router.push('/dashboard/products');

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Add Product',
        description: error.message,
      });
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
        <Card>
            <CardHeader>
            <CardTitle>Add a New Product</CardTitle>
            <CardDescription>Fill out the details to add a new product to a shop.</CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="shopId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Shop</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingShops}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder={isLoadingShops ? "Loading shops..." : "Select a shop"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {shops?.map(shop => (
                                        <SelectItem key={shop.id} value={shop.id}>
                                            {shop.shopName} (ID: {shop.id})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Product Name</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., Men's T-Shirt" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="sku"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>SKU</FormLabel>
                                <FormControl>
                                <Input placeholder="e.g., TSHIRT-BLK-M" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <FormControl>
                                <Input placeholder="e.g., Apparel" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Price</FormLabel>
                                <FormControl>
                                <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="stockQty"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Stock Quantity</FormLabel>
                                <FormControl>
                                <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                     <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                            <Input placeholder="Briefly describe the product" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Adding Product...' : 'Add Product'}
                    </Button>
                </form>
            </Form>
            </CardContent>
        </Card>
    </div>
  );
}
