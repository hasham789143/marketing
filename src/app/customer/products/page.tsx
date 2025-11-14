'use client';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { ShoppingCart } from 'lucide-react';

interface UserData {
  shopId?: string;
}

export default function CustomerProductsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData } = useDoc<UserData>(userDocRef);
  const shopId = userData?.shopId;

  const productsRef = useMemoFirebase(() => {
    if (!shopId) return null;
    return collection(firestore, `shops/${shopId}/products`);
  }, [firestore, shopId]);

  const { data: products, isLoading } = useCollection<Product>(productsRef);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Browse Products</CardTitle>
        <CardDescription>
          Here are the products available from your associated shop.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p>Loading products...</p>}
        {!isLoading && !products?.length && (
          <p className="text-center text-muted-foreground">
            No products found for this shop.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {!isLoading && products?.map((product) => {
            const image = PlaceHolderImages.find(p => p.id === product.imageUrlId);
            return (
              <Card key={product.id} className="flex flex-col">
                <div className="relative w-full h-48">
                    {image ? (
                    <Image
                        alt={product.name}
                        className="aspect-square rounded-t-lg object-cover"
                        src={image.imageUrl}
                        fill
                        data-ai-hint={image.imageHint}
                    />
                    ) : (
                        <div className="w-full h-full bg-muted rounded-t-lg flex items-center justify-center">
                            <span className="text-sm text-muted-foreground">No Image</span>
                        </div>
                    )}
                </div>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription>
                    <Badge variant="outline">{product.category}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-between">
                    <div>
                        <p className="font-semibold text-lg">
                            PKR {product.price.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                        </p>
                    </div>
                    <Button className="w-full mt-4" disabled={product.stock <= 0}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Add to Cart
                    </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
