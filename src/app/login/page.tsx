
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
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      if (user) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role;

          // For owners or staff, check if their shop is blocked
          if ((role === 'owner' || role === 'staff') && userData.shopId) {
            const shopDocRef = doc(firestore, 'shops', userData.shopId);
            const shopDoc = await getDoc(shopDocRef);

            if (shopDoc.exists() && shopDoc.data().status === 'blocked') {
              // If the shop is blocked, sign the user out and show an error.
              await signOut(auth);
              toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: 'Your shop has been blocked. Please contact support.',
              });
              return; // Stop the login process
            }
          }

          toast({
            title: 'Login Successful',
            description: `Welcome back! You are logged in as: ${role}.`,
          });
          
          // Redirect based on role
          switch (role) {
            case 'admin':
              router.push('/dashboard/shops');
              break;
            case 'owner':
            case 'staff':
              router.push('/dashboard');
              break;
            case 'customer':
              router.push('/customer');
              break;
            default:
              router.push('/'); // Fallback to home page
          }
        } else {
            // If user doc doesn't exist, treat as a customer
            toast({
                title: 'Login Successful',
                description: `Welcome back!`,
            });
            router.push('/customer');
        }
      }
    } catch (error: any) {
      let description = error.message;
      if (error.code === 'auth/invalid-credential') {
        description = 'Invalid email or password.';
      }
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: description,
      });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome Back!</CardTitle>
          <CardDescription>Sign in to your ShopSync account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <Button type="submit" className="w-full">Sign In</Button>
            </form>
          </Form>
           <p className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Sign Up
              </Link>
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
