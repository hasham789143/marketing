'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowRight, BarChart, Box, DollarSign } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { useEffect } from 'react';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { useRouter } from 'next/navigation';


export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'landing-hero');
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!user && !isUserLoading) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  useEffect(() => {
    if(user) {
      router.push('/dashboard');
    }
  }, [user, router]);


  const features = [
    {
      icon: <Box className="h-8 w-8 text-primary" />,
      title: 'Product Management',
      description: 'Easily add, edit, and organize your products with our intuitive interface.',
    },
    {
      icon: <DollarSign className="h-8 w-8 text-primary" />,
      title: 'Order & Payment',
      description: 'Streamline your order processing and accept various payment methods seamlessly.',
    },
    {
      icon: <BarChart className="h-8 w-8 text-primary" />,
      title: 'Activity Insights',
      description: 'Leverage AI-powered analytics to gain valuable insights into your staff\'s activity.',
    },
  ];

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-grow">
        <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center text-center text-white">
          {heroImage && (
            <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              data-ai-hint={heroImage.imageHint}
              fill
              className="object-cover"
              priority
            />
          )}
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 max-w-4xl px-4">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-7xl font-headline">
              Streamline Your Shop Operations
            </h1>
            <p className="mt-4 text-lg text-gray-200 md:text-xl">
              ShopSync provides all the tools you need to manage products, orders, staff, and gain valuable insights to grow your business.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                <Link href="/dashboard">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 sm:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl font-headline">
                A Better Way to Run Your Shop
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Everything you need, all in one place.
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-1 md:grid-cols-3">
              {features.map((feature, index) => (
                <Card key={index} className="transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                  <CardHeader className="flex flex-row items-center gap-4">
                    {feature.icon}
                    <CardTitle className="font-headline">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-card border-t">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ShopSync. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
