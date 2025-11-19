
'use client';

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
import { addDoc, collection, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SpecificationType } from '@/lib/data';

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
  specificationTypes?: SpecificationType[];
}

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

function SpecificationValues({ specTypeIndex, control }: { specTypeIndex: number; control: Control<FormValues> }) {
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      subcategory: '',
      description: '',
      images: [{ url: '' }],
      specificationTypes: [],
      variants: [],
    },
  });

  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({
    control: form.control,
    name: "images"
  });
  
  const { fields: specTypeFields, append: appendSpecType, remove: removeSpecType, replace: replaceSpecTypes } = useFieldArray({
    control: form.control,
    name: "specificationTypes",
  });
  
  const { fields: variantFields, replace: replaceVariants } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const watchedSpecTypes = useWatch({ control: form.control, name: 'specificationTypes' });
  const watchedCategory = useWatch({ control: form.control, name: 'category' });

  useEffect(() => {
    const combinations = getVariantCombinations(watchedSpecTypes);
    const newVariants = combinations.map(combo => {
      const existingVariant = variantFields.find(v => 
        JSON.stringify(v.specifications) === JSON.stringify(combo)
      );
      return existingVariant || {
        specifications: combo,
        sku: '',
        price: 0,
        stockQty: 0
      };
    });
    replaceVariants(newVariants);
  }, [JSON.stringify(watchedSpecTypes), replaceVariants]);

  useEffect(() => {
    if (watchedCategory && categories) {
        const selectedCategory = categories.find(c => c.name === watchedCategory);
        if (selectedCategory?.specificationTypes) {
            replaceSpecTypes(selectedCategory.specificationTypes);
        } else {
            replaceSpecTypes([]);
        }
    }
  }, [watchedCategory, categories, replaceSpecTypes]);
  

  async function onSubmit(values: FormValues) {
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

      await addDoc(collection(firestore, `shops/${shopId}/products`), {
        productId: productId,
        shopId: shopId,
        name: values.name,
        category: values.category,
        subcategory: values.subcategory,
        description: values.description,
        specificationTypes: values.specificationTypes,
        variants: values.variants,
        images: values.images.map(img => img.url),
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
    return <div className="w-full">Loading...</div>;
  }

  if (!isOwner) {
    return (
        <div className="w-full">
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
    <div className="w-full">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Add a New Product</CardTitle>
                        <CardDescription>Fill out the basic details for your new product.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField name="name" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Product Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., Classic T-Shirt" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField name="category" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                                        <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField name="subcategory" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sub-category (Optional)</FormLabel>
                                <FormControl><Input placeholder="e.g., iPhone, Samsung" {...field} /></FormControl>
                                <FormDescription>A brand or type within the main category.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="description" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl><Textarea placeholder="Briefly describe the product" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Product Images</CardTitle>
                        <CardDescription>Add one or more image URLs for your product.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {imageFields.map((field, index) => (
                            <div key={field.id} className="flex items-end gap-2">
                                <FormField name={`images.${index}.url`} control={form.control} render={({ field }) => (
                                    <FormItem className="flex-grow">
                                        <FormLabel className={cn(index !== 0 && "sr-only")}>Image URL {index + 1}</FormLabel>
                                        <FormControl><Input placeholder="https://example.com/image.png" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeImage(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendImage({ url: '' })}><PlusCircle className="mr-2 h-4 w-4" />Add Image URL</Button>
                        <FormField name="images" control={form.control} render={() => <FormItem><FormMessage /></FormItem>} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Product Specifications</CardTitle>
                        <CardDescription>Specifications are loaded from the selected category. You can modify them for this product only.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {specTypeFields.map((specTypeField, specTypeIndex) => (
                             <div key={specTypeField.id} className="p-4 border rounded-lg space-y-4">
                                <div className="flex items-end gap-2">
                                     <FormField name={`specificationTypes.${specTypeIndex}.name`} control={form.control} render={({ field }) => (
                                        <FormItem className="flex-grow">
                                            <FormLabel>Specification Type</FormLabel>
                                            <FormControl><Input placeholder="e.g. Color, Size, RAM" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
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
                         <CardHeader>
                            <CardTitle>Product Variants</CardTitle>
                            <CardDescription>A list of all possible variants based on the specifications above. Set the price and stock for each combination.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {watchedSpecTypes.map(spec => spec.name && <TableHead key={spec.name}>{spec.name}</TableHead>)}
                                        <TableHead>Price</TableHead>
                                        <TableHead>Stock</TableHead>
                                        <TableHead>SKU</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {variantFields.map((variantField, index) => (
                                        <TableRow key={variantField.id}>
                                            {variantField.specifications.map(spec => <TableCell key={`${spec.name}-${spec.value}`}>{spec.value}</TableCell>)}
                                            <TableCell>
                                                 <FormField name={`variants.${index}.price`} control={form.control} render={({ field }) => (
                                                    <FormItem><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                            </TableCell>
                                             <TableCell>
                                                 <FormField name={`variants.${index}.stockQty`} control={form.control} render={({ field }) => (
                                                    <FormItem><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                            </TableCell>
                                            <TableCell>
                                                 <FormField name={`variants.${index}.sku`} control={form.control} render={({ field }) => (
                                                    <FormItem><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <FormField name="variants" control={form.control} render={() => <FormItem><FormMessage className="mt-4" /></FormItem>} />
                        </CardContent>
                    </Card>
                )}
                
                <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Adding Product...' : 'Add Product'}
                </Button>
            </form>
        </Form>
    </div>
  );
}
