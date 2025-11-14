
'use client';

import { useForm } from 'react-hook-form';
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
import { addDoc, collection, doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { PlusCircle } from 'lucide-react';
import { format } from 'date-fns';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Category name must be at least 2 characters.' }),
});

interface UserData {
    role: string;
    shopId?: string;
}

interface Category {
    id: string;
    name: string;
    createdAt: string;
}

export default function CategoriesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!shopId) {
        toast({ variant: 'destructive', title: 'Error', description: 'No shop associated with your account.' });
        return;
    }
    try {
      await addDoc(categoriesRef, {
        categoryId: uuidv4(),
        shopId: shopId,
        name: values.name,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Category Added', description: `"${values.name}" has been added.` });
      form.reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error adding category', description: error.message });
    }
  }
  
  const isLoading = isUserDataLoading || areCategoriesLoading;

  return (
    <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Product Categories</CardTitle>
                    <CardDescription>A list of all product categories for your shop.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Created At</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && <TableRow><TableCell colSpan={2} className="text-center">Loading categories...</TableCell></TableRow>}
                            {!isLoading && categories?.length === 0 && <TableRow><TableCell colSpan={2} className="text-center">No categories found.</TableCell></TableRow>}
                            {!isLoading && categories?.map((cat) => (
                                <TableRow key={cat.id}>
                                    <TableCell className="font-medium">{cat.name}</TableCell>
                                    <TableCell>{cat.createdAt ? format(new Date(cat.createdAt), 'PPP') : 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                     </Table>
                </CardContent>
            </Card>
        </div>
        <div>
            {isOwner && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Add New Category</CardTitle>
                        <CardDescription>Create a new category for your products.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    {form.formState.isSubmitting ? 'Adding...' : 'Add Category'}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            )}
            {!isOwner && !isLoading && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Manage Categories</CardTitle>
                        <CardDescription>Only shop owners can add or manage categories.</CardDescription>
                    </CardHeader>
                </Card>
            )}
        </div>
    </div>
  );
}
