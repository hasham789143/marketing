
'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from '@/components/ui/table';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { SpecificationType } from '@/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

const specificationTypeSchema = z.object({
  name: z.string().min(1, "Specification name is required."),
  values: z.array(z.string().min(1, "Value cannot be empty.")).min(1, "At least one value is required."),
});

const formSchema = z.object({
  name: z.string().min(2, { message: 'Category name must be at least 2 characters.' }),
  specificationTypes: z.array(specificationTypeSchema).optional(),
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface UserData {
    role: string;
    shopId?: string;
}

interface Category {
    id: string;
    name: string;
    createdAt: Timestamp;
    specificationTypes?: SpecificationType[];
}

function SpecValues({ specIndex, control }: { specIndex: number, control: any }) {
    const { fields: valFields, append: appendVal, remove: removeVal } = useFieldArray({
      control,
      name: `specificationTypes.${specIndex}.values`
    });

    return (
      <div className="pl-4 space-y-2">
        <FormLabel>Values</FormLabel>
        {valFields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
             <FormField
              control={control}
              name={`specificationTypes.${specIndex}.values.${index}`}
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <Input placeholder="e.g. Red, Large, 8GB" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeVal(index)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
         <Button type="button" variant="outline" size="sm" onClick={() => appendVal('')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Value
        </Button>
      </div>
    );
}

function CategoryForm({ category, onFormSubmit, isSubmitting }: { category?: Category, onFormSubmit: (values: CategoryFormValues) => void, isSubmitting: boolean }) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: category ? {
      name: category.name,
      specificationTypes: category.specificationTypes || [],
    } : {
      name: '',
      specificationTypes: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'specificationTypes',
  });
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Apparel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Separator />
        <div>
          <h3 className="text-md font-medium mb-2">Specification Templates</h3>
          <p className="text-sm text-muted-foreground mb-4">Define reusable specifications for this category.</p>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-4">
                 <div className="flex items-end gap-2">
                   <FormField
                    control={form.control}
                    name={`specificationTypes.${index}.name`}
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormLabel>Specification Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Color, Size, RAM" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <SpecValues specIndex={index} control={form.control} />
              </div>
            ))}
             <Button type="button" variant="secondary" onClick={() => append({ name: '', values: [''] })}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Specification Type
            </Button>
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (category ? 'Saving...' : 'Adding...') : (category ? 'Save Changes' : 'Add Category')}
        </Button>
      </form>
    </Form>
  )
}

export default function CategoriesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserData>(userDocRef);
  const shopId = userData?.shopId;
  const isOwner = userData?.role === 'owner';

  const categoriesRef = useMemoFirebase(() => {
    if (!shopId) return null;
    return collection(firestore, `shops/${shopId}/categories`);
  }, [firestore, shopId]);

  const { data: categories, isLoading: areCategoriesLoading } = useCollection<Category>(categoriesRef);

  async function handleAddCategory(values: CategoryFormValues) {
    if (!shopId || !categoriesRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'No shop associated with your account.' });
        return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(categoriesRef, {
        categoryId: uuidv4(),
        shopId: shopId,
        name: values.name,
        specificationTypes: values.specificationTypes || [],
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Category Added', description: `"${values.name}" has been added.` });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error adding category', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  async function handleUpdateCategory(values: CategoryFormValues, categoryId: string) {
    if (!shopId) return;
    setIsSubmitting(true);
    try {
      const categoryDocRef = doc(firestore, `shops/${shopId}/categories`, categoryId);
      await updateDoc(categoryDocRef, {
          name: values.name,
          specificationTypes: values.specificationTypes || [],
      });
      toast({ title: 'Category Updated', description: `"${values.name}" has been updated.` });
      setIsDialogOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error updating category', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const isLoading = isUserDataLoading || areCategoriesLoading;

  return (
    <div className="grid gap-8">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold">Product Categories</h1>
                <p className="text-muted-foreground">Manage categories and their specification templates for your shop.</p>
            </div>
             {isOwner && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Category
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[625px]">
                        <DialogHeader>
                            <DialogTitle>Add New Category</DialogTitle>
                        </DialogHeader>
                        <CategoryForm onFormSubmit={handleAddCategory} isSubmitting={isSubmitting} />
                    </DialogContent>
                </Dialog>
            )}
        </div>
        <Card>
            <CardContent className="p-0">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Specifications</TableHead>
                            <TableHead>Created At</TableHead>
                            {isOwner && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan={isOwner ? 4 : 3} className="text-center h-24">Loading categories...</TableCell></TableRow>}
                        {!isLoading && categories?.length === 0 && <TableRow><TableCell colSpan={isOwner ? 4 : 3} className="text-center h-24">No categories found.</TableCell></TableRow>}
                        {!isLoading && categories?.map((cat) => (
                            <TableRow key={cat.id}>
                                <TableCell className="font-medium">{cat.name}</TableCell>
                                <TableCell>
                                    {cat.specificationTypes && cat.specificationTypes.length > 0
                                        ? cat.specificationTypes.map(st => st.name).join(', ')
                                        : <span className="text-muted-foreground">None</span>
                                    }
                                </TableCell>
                                <TableCell>{cat.createdAt ? format(cat.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                                {isOwner && (
                                    <TableCell className="text-right">
                                         <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm">Edit</Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[625px]">
                                                <DialogHeader>
                                                    <DialogTitle>Edit Category: {cat.name}</DialogTitle>
                                                </DialogHeader>
                                                <CategoryForm 
                                                    category={cat}
                                                    onFormSubmit={(values) => handleUpdateCategory(values, cat.id)} 
                                                    isSubmitting={isSubmitting} 
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            </CardContent>
        </Card>
    </div>
  );
}
