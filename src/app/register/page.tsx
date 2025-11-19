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
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { arrayUnion, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, Info, Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  shopId: z.string().optional(),
});

interface ShopData {
    shopName: string;
}

export default function RegisterPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  // Use state to manage the input value separately from the form state
  const [shopIdInput, setShopIdInput] = useState('');
  const [verifiedShop, setVerifiedShop] = useState<{ id: string; name: string } | null>(null);
  const [isCheckingShop, setIsCheckingShop] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      shopId: '',
    },
  });

  const debouncedCheckShopId = useDebouncedCallback(async (id: string) => {
    if (id) {
        setIsCheckingShop(true);
        setVerifiedShop(null);
        setShopError(null);
        try {
            const shopDocRef = doc(firestore, 'shops', id);
            const shopDoc = await getDoc(shopDocRef);
            if (shopDoc.exists()) {
                const shopData = shopDoc.data() as ShopData;
                setVerifiedShop({ id: shopDoc.id, name: shopData.shopName });
                // Set the value in the form state once verified
                form.setValue('shopId', id);
            } else {
                setShopError('No shop found with this ID.');
                form.setValue('shopId', ''); // Clear form value if invalid
            }
        } catch (error) {
            setShopError('Failed to verify Shop ID.');
            form.setValue('shopId', ''); // Clear form value on error
        } finally {
            setIsCheckingShop(false);
        }
    } else {
        setVerifiedShop(null);
        setShopError(null);
        form.setValue('shopId', '');
    }
  }, 500);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (shopIdInput && !verifiedShop) {
        toast({
            variant: "destructive",
            title: "Invalid Shop ID",
            description: "Please use a valid Shop ID or leave the field blank.",
        });
        return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      const role = values.email.endsWith('@admin.com') ? 'admin' : 'customer';

      const newUserDocData = {
        userId: user.uid,
        name: values.name,
        email: values.email,
        phone: '', 
        role: role, 
        createdAt: serverTimestamp(),
        imageUrl: '',
        shopConnections: [],
        shopConnectionIds: [],
      };

      const userDocRef = doc(firestore, "users", user.uid);
      await setDoc(userDocRef, newUserDocData);
      
      // If a valid shop was entered, create the pending connection request
      if (verifiedShop) {
        const newConnection = {
          shopId: verifiedShop.id,
          shopName: verifiedShop.name,
          status: 'pending',
        };
        await setDoc(userDocRef, {
            shopConnections: arrayUnion(newConnection),
            shopConnectionIds: arrayUnion(verifiedShop.id)
        }, { merge: true });
      }
      
      toast({
        title: "Account Created",
        description: "You can now log in with your credentials.",
      });

      router.push('/login');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.message,
      });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>Join ShopSync to manage your business or shop with your favorite store.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                  <FormLabel>Shop ID (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                        placeholder="Enter the Shop ID to connect" 
                        value={shopIdInput}
                        onChange={(e) => {
                            setShopIdInput(e.target.value);
                            debouncedCheckShopId(e.target.value);
                        }}
                    />
                  </FormControl>
                  <FormMessage />
              </FormItem>
              
              {isCheckingShop && (
                <div className="flex items-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying Shop ID...
                </div>
              )}
               {shopError && (
                <Alert variant="destructive">
                    <Info className="h-4 w-4"/>
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{shopError}</AlertDescription>
                </Alert>
              )}
              {verifiedShop && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Shop Found!</AlertTitle>
                    <AlertDescription>Request to join <strong>{verifiedShop.name}</strong> will be sent upon registration.</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || (shopIdInput !== '' && !verifiedShop)}>
                {form.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </Form>
           <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign In
              </Link>
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
