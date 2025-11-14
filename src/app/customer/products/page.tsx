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
import { addDoc, collection, doc } from 'firebase/firestore';
import { ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserData {
  shopId?: string;
}

export default function CustomerProductsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

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

  const handleAddToCart = async (product: Product) => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Not Logged In",
            description: "You must be logged in to add items to your cart.",
        });
        return;
    }
    // With variants, we should add a specific variant to the cart.
    // For now, let's assume we're adding the first variant.
    const variantToAdd = product.variants?.[0];
    if (!variantToAdd) {
        toast({
            variant: "destructive",
            title: "Product Unavailable",
            description: "This product has no purchasable options.",
        });
        return;
    }

    try {
      const cartRef = collection(firestore, `users/${user.uid}/cart`);
      await addDoc(cartRef, {
        productId: product.id,
        name: product.name,
        price: variantToAdd.price,
        quantity: 1,
        sku: variantToAdd.sku,
        imageUrlId: product.images?.[0] || null,
      });

      toast({
        title: 'Added to Cart',
        description: `${product.name} has been added to your cart.`,
      });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Failed to Add to Cart",
            description: error.message,
        });
    }
  };

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
            const image = PlaceHolderImages.find(p => p.id === product.images?.[0]);
            // Since price and stock are per-variant, we'll display the first variant's info.
            const displayVariant = product.variants?.[0];
            const price = displayVariant?.price ?? 0;
            const stock = displayVariant?.stockQty ?? 0;

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
                            PKR {price.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {stock > 0 ? `${stock} in stock` : 'Out of stock'}
                        </p>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      disabled={stock <= 0}
                      onClick={() => handleAddToCart(product)}
                    >
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
