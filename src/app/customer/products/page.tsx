
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
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

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

interface PlatformSettings {
    connectedShopsEnabled: boolean;
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

  const getProductStock = (product: Product) => {
      // For the grid, we can just show the total stock of all variants.
      return product.variants?.reduce((acc, v) => acc + v.stockQty, 0) ?? 0;
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
                const lowestPrice = product.variants?.reduce((min, v) => v.price < min ? v.price : min, product.variants[0]?.price ?? 0) ?? 0;
                const hasMultiplePrices = product.variants ? new Set(product.variants.map(v => v.price)).size > 1 : false;

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
                           <Badge variant="outline" className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm">{product.category}</Badge>
                      </div>
                      <CardContent className="p-4 flex-grow flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">{capitalizeFirstLetter(product.name)}</h3>
                            <p className="font-bold text-lg text-primary">
                                PKR {lowestPrice.toLocaleString()}{hasMultiplePrices ? '+' : ''}
                            </p>
                          </div>
                          <Button 
                            className="w-full mt-2" 
                            variant="outline"
                          >
                              View Options
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
  
  const platformSettingsRef = useMemoFirebase(() => doc(firestore, 'platform_settings', 'features'), [firestore]);
  const { data: platformSettings, isLoading: areSettingsLoading } = useDoc<PlatformSettings>(platformSettingsRef);

  
  const activePhysicalShops = useMemo(() => {
    return userData?.shopConnections?.filter(c => c.status === 'active') || [];
  }, [userData]);

  useEffect(() => {
    if (areSettingsLoading) return; // Don't fetch until we know the settings

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

        // Fetch products for connected physical shops only if the feature is enabled
        if (platformSettings?.connectedShopsEnabled && activePhysicalShops.length > 0) {
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
  }, [firestore, activePhysicalShops, toast, platformSettings, areSettingsLoading]);
  
  const connectedShopsEnabled = platformSettings?.connectedShopsEnabled ?? false;
  const showTabs = connectedShopsEnabled && activePhysicalShops.length > 0;
  
  const getShopName = (shopId: string) => {
      const shop = onlineShops.find(s => s.id === shopId);
      return shop?.shopName || 'Unknown Shop';
  }


  return (
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-8">
        <Carousel className="w-full" opts={{ loop: true }}>
            <CarouselContent>
            {onlineProducts.map((product) => (
                <CarouselItem key={product.id}>
                    <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden">
                         <Image
                            src={product.images?.[0] || 'https://placehold.co/1200x400'}
                            alt={product.name}
                            fill
                            className="object-cover"
                            data-ai-hint="product image"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-6 text-white">
                            <p className="font-semibold">{getShopName(product.shopId)}</p>
                            <h2 className="text-3xl font-bold">{product.name}</h2>
                        </div>
                    </div>
                </CarouselItem>
            ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2" />
            <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2" />
        </Carousel>

       <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Browse Products</h1>
        <p className="text-muted-foreground mt-2">
          Explore products from online stores and your connected shops.
        </p>
      </div>

       {showTabs ? (
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
       ) : (
            <div className="mt-6">
                 {isLoading ? <p>Loading...</p> : <ProductGrid products={onlineProducts} />}
            </div>
       )}
    </div>
  );
}
