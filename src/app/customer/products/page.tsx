
'use client';
import Image from 'next/image';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/lib/data';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { addDoc, collection, doc, query, where, getDocs, collectionGroup, writeBatch, runTransaction } from 'firebase/firestore';
import { ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMemo, useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface ShopConnection {
  shopId: string;
  shopName: string;
  status: 'pending' | 'active';
}

interface UserData {
  shopConnections?: ShopConnection[];
}

interface CartItem {
    id: string;
    productId: string;
    shopId: string;
    quantity: number;
    sku: string;
}

interface Shop {
    id: string;
    shopName: string;
    type: 'online' | 'physical';
}

// Define the type for grouped products
type GroupedProducts = {
  [category: string]: Product[];
};


const ProductGrid = ({ products }: { products: Product[] }) => {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const cartRef = useMemoFirebase(() => {
    if(!user) return null;
    return collection(firestore, `users/${user.uid}/cart`);
  }, [user, firestore]);
  const { data: cartItems } = useCollection<CartItem>(cartRef);

  const handleAddToCart = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault(); // Prevent navigating to product detail page
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Not Logged In',
        description: 'You must be logged in to add items to your cart.',
      });
      return;
    }

    const variantToAdd = product.variants?.[0];
    if (!variantToAdd) {
      toast({
        variant: 'destructive',
        title: 'Product Unavailable',
        description: 'This product has no purchasable options.',
      });
      return;
    }
    
    if (cartItems && cartItems.length > 0 && cartItems.some(item => item.shopId !== product.shopId)) {
        toast({
            variant: 'destructive',
            title: 'Multiple Shops Not Supported',
            description: 'Your cart contains items from another shop. Please clear your cart or complete that order first.',
        });
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const productRef = doc(firestore, `shops/${product.shopId}/products`, product.id);
            const productDoc = await transaction.get(productRef);
            
            if (!productDoc.exists()) {
                throw new Error("Product not found!");
            }

            const productData = productDoc.data() as Product;
            const currentVariant = productData.variants?.find(v => v.sku === variantToAdd.sku);

            const cartCollectionRef = collection(firestore, `users/${user.uid}/cart`);
            const cartItemRef = doc(cartCollectionRef, `${product.id}-${variantToAdd.sku}`);
            const cartItemDoc = await transaction.get(cartItemRef);

            const quantityInCart = cartItemDoc.exists() ? cartItemDoc.data().quantity : 0;
            
            if (!currentVariant || currentVariant.stockQty <= quantityInCart) {
                throw new Error("This item is out of stock.");
            }
            
            if (cartItemDoc.exists()) {
                const newQuantity = cartItemDoc.data().quantity + 1;
                transaction.update(cartItemRef, { quantity: newQuantity });
            } else {
                transaction.set(cartItemRef, {
                    productId: product.id,
                    name: product.name,
                    price: variantToAdd.price,
                    quantity: 1,
                    sku: variantToAdd.sku,
                    imageUrl: product.images?.[0] || null,
                    shopId: product.shopId,
                });
            }
        });

      toast({
        title: 'Added to Cart',
        description: `${product.name} has been added to your cart.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Add to Cart',
        description: error.message,
      });
    }
  };
  
  const getProductStock = (product: Product) => {
      const displayVariant = product.variants?.[0];
      return displayVariant?.stockQty ?? 0;
  }

  const capitalizeFirstLetter = (string: string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };
  
    // Group the products by category
    const groupedProducts = products.reduce((acc: GroupedProducts, product) => {
      const category = product.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {});

  const categoryColors = [
    'bg-slate-50 dark:bg-slate-900/20',
    'bg-sky-50 dark:bg-sky-900/20',
    'bg-emerald-50 dark:bg-emerald-900/20',
    'bg-amber-50 dark:bg-amber-900/20',
    'bg-rose-50 dark:bg-rose-900/20',
  ];

  return (
     <div className="space-y-12">
        {Object.keys(groupedProducts).length === 0 && (
            <div className="text-center text-muted-foreground py-8 rounded-lg border-2 border-dashed">
                <p className="font-medium">No products to display in this section.</p>
            </div>
        )}

        {Object.entries(groupedProducts).map(([category, products], index) => (
          <section key={category} className={`rounded-xl p-4 md:p-6 ${categoryColors[index % categoryColors.length]}`}>
            <h2 className="text-2xl font-bold tracking-tight border-b pb-2 mb-6">{category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => {
                const imageUrl = product.images?.[0];
                const displayVariant = product.variants?.[0];
                const price = displayVariant?.price ?? 0;
                const stock = getProductStock(product);
                const cartItem = cartItems?.find(item => item.productId === product.id && item.sku === displayVariant?.sku);
                const effectiveStock = stock - (cartItem?.quantity || 0);

                return (
                  <Link key={`${product.shopId}-${product.id}`} href={`/customer/products/${product.id}`} className="group block">
                    <Card className="flex flex-col h-full overflow-hidden transition-all duration-200 hover:shadow-lg">
                      <div className="relative w-full aspect-[4/3]">
                          {imageUrl ? (
                          <Image
                              alt={product.name}
                              className="object-cover"
                              src={imageUrl}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              data-ai-hint={product.name}
                          />
                          ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                  <span className="text-sm text-muted-foreground">No Image</span>
                              </div>
                          )}
                      </div>
                      <CardContent className="p-4 flex-grow flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="font-semibold text-base leading-tight">{capitalizeFirstLetter(product.name)}</h3>
                               <Badge variant="outline">{product.category}</Badge>
                            </div>
                            <div className="flex justify-between items-baseline">
                              <p className="font-bold text-lg text-primary">
                                  PKR {price.toLocaleString()}
                              </p>
                               <p className={`text-xs font-medium ${effectiveStock > 5 ? 'text-green-600' : 'text-red-600'}`}>
                                  {effectiveStock > 0 ? `${effectiveStock} in stock` : 'Out of stock'}
                              </p>
                            </div>
                          </div>
                          <Button 
                            className="w-full mt-2" 
                            disabled={effectiveStock <= 0}
                            onClick={(e) => handleAddToCart(e, product)}
                          >
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              {effectiveStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                          </Button>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
  );
};


export default function CustomerProductsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [onlineShops, setOnlineShops] = useState<Shop[]>([]);
  const [onlineProducts, setOnlineProducts] = useState<Product[]>([]);

  const [connectedPhysicalProducts, setConnectedPhysicalProducts] = useState<Product[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData } = useDoc<UserData>(userDocRef);
  
  const activePhysicalShops = useMemo(() => {
    return userData?.shopConnections?.filter(c => c.status === 'active') || [];
  }, [userData]);

  useEffect(() => {
    const fetchAllProducts = async () => {
      setIsLoading(true);

      try {
        // Fetch online shops
        const onlineShopsQuery = query(collection(firestore, 'shops'), where('type', '==', 'online'));
        const onlineShopsSnapshot = await getDocs(onlineShopsQuery);
        const fetchedOnlineShops = onlineShopsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop));
        setOnlineShops(fetchedOnlineShops);
        
        // Fetch products for online shops
        if (fetchedOnlineShops.length > 0) {
            const onlineProductPromises = fetchedOnlineShops.map(shop => 
                getDocs(query(collection(firestore, `shops/${shop.id}/products`)))
            );
            const onlineSnapshots = await Promise.all(onlineProductPromises);
            const allOnlineProducts: Product[] = [];
            onlineSnapshots.forEach(snapshot => {
                snapshot.docs.forEach((doc: any) => {
                    allOnlineProducts.push({ id: doc.id, ...doc.data() } as Product);
                });
            });
            setOnlineProducts(allOnlineProducts);
        }

        // Fetch products for connected physical shops
        if (activePhysicalShops.length > 0) {
            const physicalProductPromises = activePhysicalShops.map(shop => 
                getDocs(query(collection(firestore, `shops/${shop.shopId}/products`)))
            );
            const physicalSnapshots = await Promise.all(physicalProductPromises);
            const allPhysicalProducts: Product[] = [];
            physicalSnapshots.forEach(snapshot => {
                snapshot.docs.forEach((doc: any) => {
                    allPhysicalProducts.push({ id: doc.id, ...doc.data() } as Product);
                });
            });
            setConnectedPhysicalProducts(allPhysicalProducts);
        }
        
      } catch (error) {
        console.error("Error fetching products: ", error);
        toast({
          variant: "destructive",
          title: "Failed to Fetch Products",
          description: "There was an error loading products. Please try again."
        })
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllProducts();
  }, [firestore, activePhysicalShops, toast]);


  return (
    <div className="w-full p-4 md:p-6 lg:p-8">
       <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Browse Products</h1>
        <p className="text-muted-foreground mt-2">
          Explore products from online stores and your connected shops.
        </p>
      </div>

       <Tabs defaultValue="online" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="online">Online Shops</TabsTrigger>
            <TabsTrigger value="connected">Your Connected Shops</TabsTrigger>
        </TabsList>
        <TabsContent value="online" className="mt-6">
            <p className="text-sm text-muted-foreground mb-4">These products are available from online stores and are visible to all customers.</p>
            {isLoading ? <p>Loading...</p> : <ProductGrid products={onlineProducts} />}
        </TabsContent>
        <TabsContent value="connected" className="mt-6">
            <p className="text-sm text-muted-foreground mb-4">These products are from your connected physical stores.</p>
            {isLoading ? <p>Loading...</p> : 
                (activePhysicalShops.length > 0 ? 
                    <ProductGrid products={connectedPhysicalProducts} /> :
                     <div className="text-center text-muted-foreground py-8 rounded-lg border-2 border-dashed">
                        <p className="font-medium">You are not connected to any physical shops.</p>
                        <Button variant="link" asChild><Link href="/customer/profile">Go to Profile to add a shop</Link></Button>
                    </div>
                )
            }
        </TabsContent>
        </Tabs>
    </div>
  );
}

    