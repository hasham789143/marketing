
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
import { addDoc, collection, doc, serverTimestamp, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { PlusCircle, Trash2, Edit, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Banner } from '@/lib/data';
import Image from 'next/image';

const formSchema = z.object({
  title: z.string().min(2, { message: 'Title is required.' }),
  subtitle: z.string().optional(),
  imageUrl: z.string().url({ message: 'A valid image URL is required.' }),
  targetUrl: z.string().url({ message: 'A valid target link URL is required.' }),
  isActive: z.boolean().default(false),
});

type BannerFormValues = z.infer<typeof formSchema>;

interface UserData {
    role: string;
}

function BannerForm({ banner, onFormSubmit, isSubmitting }: { banner?: Banner, onFormSubmit: (values: BannerFormValues) => void, isSubmitting: boolean }) {
  const form = useForm<BannerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: banner || {
      title: '',
      subtitle: '',
      imageUrl: '',
      targetUrl: '',
      isActive: false,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
        <FormField name="title" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Summer Sale" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField name="subtitle" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Subtitle (Optional)</FormLabel><FormControl><Input placeholder="e.g., Up to 50% off!" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField name="imageUrl" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Image URL</FormLabel><FormControl><Input placeholder="https://example.com/banner.png" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField name="targetUrl" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Target Link</FormLabel><FormControl><Input placeholder="https://shopsy.com/products/summer-collection" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField name="isActive" control={form.control} render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                    <FormLabel>Activate Banner</FormLabel>
                    <FormMessage />
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
        )} />
        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (banner ? 'Saving...' : 'Adding...') : (banner ? 'Save Changes' : 'Add Banner')}
        </Button>
      </form>
    </Form>
  )
}

export default function BannersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | undefined>(undefined);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserData>(userDocRef);
  const isAdmin = userData?.role === 'admin';

  const bannersRef = useMemoFirebase(() => collection(firestore, 'banners'), [firestore]);
  const { data: banners, isLoading: areBannersLoading } = useCollection<Banner>(bannersRef);

  // When a banner is marked as active, all others should be deactivated.
  const handleActivation = async (values: BannerFormValues, bannerId?: string) => {
    const batch = writeBatch(firestore);
    
    // Deactivate all other banners if this one is being activated
    if (values.isActive && banners) {
        banners.forEach(banner => {
            if (banner.id !== bannerId) {
                 const bannerRef = doc(firestore, 'banners', banner.id);
                 batch.update(bannerRef, { isActive: false });
            }
        });
    }

    if (bannerId) { // Updating existing banner
        const bannerRef = doc(firestore, 'banners', bannerId);
        batch.update(bannerRef, values);
    } else { // Creating new banner
        const newBannerId = uuidv4();
        const newBannerRef = doc(firestore, 'banners', newBannerId);
        batch.set(newBannerRef, { ...values, id: newBannerId, createdAt: serverTimestamp() });
    }

    await batch.commit();
  }

  async function handleFormSubmit(values: BannerFormValues) {
    if (!isAdmin) return;
    setIsSubmitting(true);
    try {
      await handleActivation(values, editingBanner?.id);
      toast({ title: editingBanner ? 'Banner Updated' : 'Banner Added' });
      setIsDialogOpen(false);
      setEditingBanner(undefined);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  async function handleDelete(bannerId: string) {
    if (!isAdmin) return;
    try {
        await deleteDoc(doc(firestore, 'banners', bannerId));
        toast({ title: 'Banner Deleted' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error deleting banner', description: error.message });
    }
  }
  
  const handleOpenDialog = (banner?: Banner) => {
    setEditingBanner(banner);
    setIsDialogOpen(true);
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
        setEditingBanner(undefined);
    }
    setIsDialogOpen(open);
  }

  const isLoading = isUserDataLoading || areBannersLoading;

  if (!isAdmin && !isLoading) {
    return (
        <Card><CardHeader><CardTitle>Access Denied</CardTitle><CardDescription>Only administrators can manage banners.</CardDescription></CardHeader></Card>
    );
  }

  return (
    <div className="grid gap-8">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold">Banner Management</h1>
                <p className="text-muted-foreground">Create and manage promotional banners.</p>
            </div>
            {isAdmin && (
                <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Banner
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingBanner ? 'Edit Banner' : 'Add New Banner'}</DialogTitle>
                        </DialogHeader>
                        <BannerForm onFormSubmit={handleFormSubmit} isSubmitting={isSubmitting} banner={editingBanner} />
                    </DialogContent>
                </Dialog>
            )}
        </div>
        <Card>
            <CardContent className="p-0">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Image</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan={4} className="text-center h-24">Loading banners...</TableCell></TableRow>}
                        {!isLoading && banners?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center h-24">No banners found.</TableCell></TableRow>}
                        {!isLoading && banners?.map((banner) => (
                            <TableRow key={banner.id}>
                                <TableCell>
                                    <Image src={banner.imageUrl} alt={banner.title} width={120} height={60} className="rounded-md object-cover aspect-video" />
                                </TableCell>
                                <TableCell className="font-medium">{banner.title}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${banner.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {banner.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                     <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(banner)}><Edit className="h-4 w-4" /></Button>
                                     <Button variant="ghost" size="icon" onClick={() => handleDelete(banner.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            </CardContent>
        </Card>
    </div>
  );
}

    