
'use client';

import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm, useWatch, Control } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';


const imageSchema = z.object({
  url: z.string().url({ message: 'Please enter a valid URL.' }).min(1, 'URL is required.'),
});

const specificationValueSchema = z.object({
  name: z.string(),
  value: z.string(),
});

const productVariantSchema = z.object({
  specifications: z.array(specificationValueSchema),
  sku: z.string().min(1, "SKU is required."),
  price: z.coerce.number().min(0, "Price must be a positive number."),
  stockQty: z.coerce.number().int().min(0, "Stock must be a positive integer."),
});

const specificationTypeSchema = z.object({
  name: z.string().min(1, "Specification name is required."),
  values: z.array(z.string().min(1, "Value cannot be empty.")).min(1, "At least one value is required."),
});

const formSchema = z.object({
  name: z.string().min(2, { message: 'Product name must be at least 2 characters.' }),
  category: z.string().min(1, { message: 'Category is required.' }),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  images: z.array(imageSchema).min(1, 'At least one image URL is required.'),
  specificationTypes: z.array(specificationTypeSchema),
  variants: z.array(productVariantSchema).min(1, "At least one product variant must be configured."),
});


type FormValues = z.infer<typeof formSchema>;

interface UserData {
    role: string;
    shopId?: string;
}

interface Category {
  id: string;
  name: string;
}

// Helper function to generate cartesian product of specifications
const getVariantCombinations = (specTypes: FormValues['specificationTypes']) => {
    if (!specTypes || specTypes.length === 0) {
      return [];
    }
    const result: { [key: string]: string }[][] = [];
    const recurse = (specs: FormValues['specificationTypes'], index: number, current: { [key: string]: string }[]) => {
      if (index === specs.length) {
        result.push(current);
        return;
      }
      const spec = specs[index];
      const validValues = spec.values.filter(v => v.trim() !== '');
      if (validValues.length === 0 && spec.name.trim() !== '') {
          recurse(specs, index + 1, current);
          return;
      }
      for (const value of validValues) {
        recurse(specs, index + 1, [...current, { name: spec.name, value }]);
      }
    };
    const validSpecTypes = specTypes.filter(st => st.name && st.name.trim() !== '');
    recurse(validSpecTypes, 0, []);
    return result;
};

// Component to manage the nested array of specification values
function SpecificationValues({ specTypeIndex, control }: { specTypeIndex: number, control: Control<FormValues> }) {
    const { fields: valueFields, append: appendValue, remove: removeValue } = useFieldArray({
        control,
        name: `specificationTypes.${specTypeIndex}.values`
    });

    return (
        <div className="space-y-2">
            {valueFields.map((valueField, valueIndex) => (
                <div key={valueField.id} className="flex items-center gap-2">
                    <FormField 
                        name={`specificationTypes.${specTypeIndex}.values.${valueIndex}`} 
                        control={control} 
                        render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormControl>
                                    <Input placeholder="e.g. Red, Large, 8GB" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} 
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeValue(valueIndex)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => appendValue('')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Value
            </Button>
        </div>
    );
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
  }, [user, firestore]);

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: productData ? {
        name: productData.name || '',
        category: productData.category || '',
        subcategory: productData.subcategory || '',
        description: productData.description || '',
        images: productData.images?.map(url => ({ url })) || [{ url: '' }],
        specificationTypes: productData.specificationTypes || [],
        variants: productData.variants || [],
      } : undefined,
  });
  
  useEffect(() => {
    if (productData) {
      form.reset({
        name: productData.name || '',
        category: productData.category || '',
        subcategory: productData.subcategory || '',
        description: productData.description || '',
        images: productData.images?.map(url => ({ url })) || [{ url: '' }],
        specificationTypes: productData.specificationTypes || [],
        variants: productData.variants || [],
      });
    }
  }, [productData, form]);

  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({ control: form.control, name: "images" });
  const { fields: specTypeFields, append: appendSpecType, remove: removeSpecType } = useFieldArray({ control: form.control, name: "specificationTypes" });
  const { fields: variantFields, replace: replaceVariants } = useFieldArray({ control: form.control, name: "variants" });

  const watchedSpecTypes = useWatch({ control: form.control, name: 'specificationTypes' });

  // Synchronize variants table with specification types
  useEffect(() => {
    if (!watchedSpecTypes) return;

    // A stringified version of the current variants for comparison
    const currentVariantsString = JSON.stringify(
      form.getValues('variants').map(v => v.specifications)
    );

    const combinations = getVariantCombinations(watchedSpecTypes);

    // A stringified version of the new combinations
    const newCombinationsString = JSON.stringify(combinations);
    
    // Only update if the combinations have actually changed.
    if (currentVariantsString === newCombinationsString) {
      return;
    }
    
    const newVariants = combinations.map(combo => {
      // Try to find an existing variant that matches the new combination
      const existingVariant = variantFields.find(v => 
        JSON.stringify(v.specifications) === JSON.stringify(combo)
      );
      // If found, keep its data; otherwise, create a new blank entry
      return {
        specifications: combo,
        sku: existingVariant?.sku || '',
        price: existingVariant?.price ?? 0,
        stockQty: existingVariant?.stockQty ?? 0
      };
    });
    
    replaceVariants(newVariants);
  }, [watchedSpecTypes, replaceVariants, form, variantFields]);


  async function onSubmit(values: FormValues) {
    if (!productDocRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'Product reference not found.' });
        return;
    }

    try {
      await updateDoc(productDocRef, {
        ...values,
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

  const isLoading = isUserDataLoading || isProductLoading || areCategoriesLoading || !form.formState.isDirty && !productData;
  
  if (isLoading || !productData) {
    return <div className="flex w-full items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!isOwner) {
    return <Card><CardHeader><CardTitle>Access Denied</CardTitle><CardDescription>Only shop owners can edit products.</CardDescription></CardHeader><CardContent><Button onClick={() => router.back()}>Go Back</Button></CardContent></Card>;
  }

  return (
    <div className="w-full">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                 <Card>
                    <CardHeader><CardTitle>Edit Product</CardTitle><CardDescription>Update the details for your product.</CardDescription></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField name="name" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField name="category" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                                </Select><FormMessage /></FormItem>
                            )} />
                        </div>
                        <FormField name="subcategory" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Sub-category (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name="description" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Product Images</CardTitle><CardDescription>Manage image URLs for your product.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                        {imageFields.map((field, index) => (
                            <div key={field.id} className="flex items-end gap-2">
                                <FormField name={`images.${index}.url`} control={form.control} render={({ field }) => (
                                    <FormItem className="flex-grow"><FormLabel className={cn(index !== 0 && "sr-only")}>Image URL {index + 1}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeImage(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendImage({ url: '' })}><PlusCircle className="mr-2 h-4 w-4" />Add Image URL</Button>
                        <FormField name="images" control={form.control} render={() => <FormItem><FormMessage /></FormItem>} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Product Specifications</CardTitle><CardDescription>Manage specifications and their values.</CardDescription></CardHeader>
                    <CardContent className="space-y-6">
                        {specTypeFields.map((specTypeField, specTypeIndex) => (
                             <div key={specTypeField.id} className="p-4 border rounded-lg space-y-4">
                                <div className="flex items-end gap-2">
                                     <FormField name={`specificationTypes.${specTypeIndex}.name`} control={form.control} render={({ field }) => (
                                        <FormItem className="flex-grow"><FormLabel>Specification Type</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <Button type="button" variant="destructive" size="icon" onClick={() => removeSpecType(specTypeIndex)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                                <div className="pl-4 space-y-2">
                                     <FormLabel>Values</FormLabel>
                                     <SpecificationValues specTypeIndex={specTypeIndex} control={form.control} />
                                </div>
                            </div>
                        ))}
                         <Button type="button" variant="secondary" onClick={() => appendSpecType({ name: '', values: [''] })}><PlusCircle className="mr-2 h-4 w-4" />Add Specification Type</Button>
                    </CardContent>
                </Card>

                {variantFields.length > 0 && (
                    <Card>
                         <CardHeader><CardTitle>Product Variants</CardTitle><CardDescription>Set the price and stock for each combination.</CardDescription></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow>
                                    {watchedSpecTypes?.filter(spec => spec.name).map(spec => <TableHead key={spec.name}>{spec.name}</TableHead>)}
                                    <TableHead>Price</TableHead><TableHead>Stock</TableHead><TableHead>SKU</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>{variantFields.map((variantField, index) => (
                                    <TableRow key={variantField.id}>
                                        {variantField.specifications.map(spec => <TableCell key={`${spec.name}-${spec.value}`}>{spec.value}</TableCell>)}
                                        <TableCell><FormField name={`variants.${index}.price`} control={form.control} render={({ field }) => (<FormItem><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} /></TableCell>
                                        <TableCell><FormField name={`variants.${index}.stockQty`} control={form.control} render={({ field }) => (<FormItem><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} /></TableCell>
                                        <TableCell><FormField name={`variants.${index}.sku`} control={form.control} render={({ field }) => (<FormItem><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /></TableCell>
                                    </TableRow>
                                ))}</TableBody>
                            </Table>
                            <FormField name="variants" control={form.control} render={() => <FormItem><FormMessage className="mt-4" /></FormItem>} />
                        </CardContent>
                    </Card>
                )}
                
                <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </Button>
            </form>
        </Form>
    </div>
  );
}
