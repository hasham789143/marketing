'use client';

import { useEffect } from 'react';
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
import { collection, doc, updateDoc } from 'firebase/firestore';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Product } from '@/lib/data';

const variantSchema = z.object({
    sku: z.string().min(1, { message: 'SKU is required.' }),
    price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
    stockQty: z.coerce.number().int().min(0, { message: 'Stock must be a positive integer.' }),
});

const imageSchema = z.object({
  url: z.string().url({ message: 'Please enter a valid URL.' }).min(1, 'URL is required.'),
});

const formSchema = z.object({
  name: z.string().min(2, { message: 'Product name must be at least 2 characters.' }),
  category: z.string().min(1, { message: 'Category is required.' }),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  images: z.array(imageSchema).min(1, 'At least one image URL is required.'),
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

export default function EditProductPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user } = useUser();

  const productId = params.productId as string;

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserData>(userDocRef);
  const shopId = userData?.shopId;
  const isOwner = userData?.role === 'owner';

  const productDocRef = useMemoFirebase(() => {
    if (!shopId || !productId) return null;
    return doc(firestore, `shops/${shopId}/products`, productId);
  }, [shopId, productId, firestore]);
  
  const { data: productData, isLoading: isProductLoading } = useDoc<Product>(productDocRef);

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
      subcategory: '',
      description: '',
      images: [{ url: '' }],
      variants: [{ sku: '', price: 0, stockQty: 0 }],
    },
  });
  
  useEffect(() => {
    if (productData) {
      form.reset({
        name: productData.name,
        category: productData.category,
        subcategory: productData.subcategory || '',
        description: productData.description,
        images: productData.images?.map(url => ({ url })) || [{ url: '' }],
        variants: productData.variants,
      });
    }
  }, [productData, form]);

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control,
    name: "variants"
  });

  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({
    control: form.control,
    name: "images"
  });


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!productDocRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'Product reference not found.' });
        return;
    }

    try {
      const totalStock = values.variants.reduce((sum, v) => sum + v.stockQty, 0);

      await updateDoc(productDocRef, {
        name: values.name,
        category: values.category,
        subcategory: values.subcategory,
        description: values.description,
        variants: values.variants,
        price: values.variants[0]?.price || 0, // Recalculate main price
        stockQty: totalStock, // Recalculate total stock
        images: values.images.map(img => img.url),
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: 'Product Updated',
        description: `Product "${values.name}" has been successfully updated.`,
      });

      router.push('/dashboard/products');

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Update Product',
        description: error.message,
      });
    }
  }

  const isLoading = isUserDataLoading || isProductLoading || areCategoriesLoading;
  
  if (isLoading) {
    return (
        <div className="flex w-full items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  if (!isOwner) {
    return (
        <div className="w-full">
            <Card>
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>Only shop owners can edit products.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.back()}>Go Back</Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!productData) {
     return (
        <div className="w-full">
            <Card>
                <CardHeader>
                    <CardTitle>Product Not Found</CardTitle>
                    <CardDescription>The product you are trying to edit does not exist.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <Button onClick={() => router.push('/dashboard/products')}>Go to Products</Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="w-full">
        <Card>
            <CardHeader>
            <CardTitle>Edit Product</CardTitle>
            <CardDescription>Update the details for your product.</CardDescription>
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
                        name="subcategory"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sub-category (Optional)</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., iPhone, Samsung" {...field} />
                            </FormControl>
                             <FormDescription>
                                A brand or type within the main category.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
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
                    
                    <Separator />

                     <div>
                        <h3 className="text-lg font-medium mb-4">Product Images</h3>
                        <div className="space-y-4">
                        {imageFields.map((field, index) => (
                            <div key={field.id} className="flex items-end gap-2">
                                <FormField
                                    control={form.control}
                                    name={`images.${index}.url`}
                                    render={({ field }) => (
                                        <FormItem className="flex-grow">
                                            <FormLabel>Image URL {index + 1}</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://example.com/image.png" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 {imageFields.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => removeImage(index)}
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
                            onClick={() => appendImage({ url: '' })}
                        >
                             <PlusCircle className="mr-2 h-4 w-4" />
                            Add Image URL
                        </Button>
                         <FormField
                            control={form.control}
                            name="images"
                            render={() => (
                                <FormItem>
                                     <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>


                    <Separator />

                    <div>
                        <h3 className="text-lg font-medium mb-4">Product Variants</h3>
                        <div className="space-y-6">
                        {variantFields.map((field, index) => (
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
                                {variantFields.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-3 -right-3 h-7 w-7"
                                        onClick={() => removeVariant(index)}
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
                            onClick={() => appendVariant({ sku: '', price: 0, stockQty: 0 })}
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
                        {form.formState.isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                    </Button>
                </form>
            </Form>
            </CardContent>
        </Card>
    </div>
  );
}
