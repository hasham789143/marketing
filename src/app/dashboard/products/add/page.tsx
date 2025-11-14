
'use client';

import { useFieldArray, useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { addDoc, collection, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const variantSchema = z.object({
    sku: z.string().min(1, { message: 'SKU is required.' }),
    price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
    stockQty: z.coerce.number().int().min(0, { message: 'Stock must be a positive integer.' }),
});

const formSchema = z.object({
  name: z.string().min(2, { message: 'Product name must be at least 2 characters.' }),
  category: z.string().min(1, { message: 'Category is required.' }),
  description: z.string().optional(),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).optional(),
  variants: z.array(variantSchema).min(1, 'You must add at least one product variant.'),
});

interface UserData {
    role: string;
    shopId?: string;
}

interface Category {
  id: string;
  name: string;
}

export default function AddProductPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserData>(userDocRef);
  const shopId = userData?.shopId;
  
  const categoriesRef = useMemoFirebase(() => {
    if (!shopId) return null;
    return collection(firestore, `shops/${shopId}/categories`);
  }, [firestore, shopId]);
  
  const { data: categories, isLoading: areCategoriesLoading } = useCollection<Category>(categoriesRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      description: '',
      imageUrl: '',
      variants: [{ sku: '', price: 0, stockQty: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants"
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!shopId) {
        toast({
            variant: 'destructive',
            title: 'Operation Failed',
            description: 'You are not associated with a shop.',
        });
        return;
    }

    try {
      const productId = `PROD-${uuidv4().substring(0, 4).toUpperCase()}`;
      const totalStock = values.variants.reduce((sum, v) => sum + v.stockQty, 0);

      await addDoc(collection(firestore, `shops/${shopId}/products`), {
        productId: productId,
        shopId: shopId,
        name: values.name,
        category: values.category,
        description: values.description,
        variants: values.variants,
        price: values.variants[0]?.price || 0,
        stockQty: totalStock,
        images: values.imageUrl ? [values.imageUrl] : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: 'Product Added',
        description: `Product "${values.name}" has been successfully added.`,
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

  const isLoading = isUserLoading || isUserDataLoading || areCategoriesLoading;
  const isOwner = userData?.role === 'owner';

  if (isLoading) {
    return <div className="max-w-4xl mx-auto">Loading...</div>;
  }

  if (!isOwner) {
    return (
        <div className="max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>Only shop owners can add new products.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.back()}>Go Back</Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
        <Card>
            <CardHeader>
            <CardTitle>Add a New Product</CardTitle>
            <CardDescription>Fill out the details for your new product and its variants.</CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Product Name</FormLabel>
                                <FormControl>
                                <Input placeholder="e.g., Classic T-Shirt" {...field} />
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {categories?.map((category) => (
                                            <SelectItem key={category.id} value={category.name}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                    <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Image URL</FormLabel>
                            <FormControl>
                            <Input placeholder="https://example.com/image.png" {...field} />
                            </FormControl>
                            <FormDescription>
                                Enter a valid URL for the product image.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />


                    <Separator />

                    <div>
                        <h3 className="text-lg font-medium mb-4">Product Variants</h3>
                        <div className="space-y-6">
                        {fields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-lg relative space-y-4">
                                <FormLabel className="font-semibold">Variant {index + 1}</FormLabel>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name={`variants.${index}.sku`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>SKU</FormLabel>
                                                <FormControl><Input placeholder="e.g., TSHIRT-BLK-M" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`variants.${index}.price`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Price</FormLabel>
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`variants.${index}.stockQty`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Stock</FormLabel>
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                {fields.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-3 -right-3 h-7 w-7"
                                        onClick={() => remove(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => append({ sku: '', price: 0, stockQty: 0 })}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Variant
                        </Button>
                        <FormField
                            control={form.control}
                            name="variants"
                            render={() => (
                                <FormItem>
                                     <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    
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
