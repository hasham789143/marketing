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
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { addDoc, collection, doc, query, where, getDocs, collectionGroup } from 'firebase/firestore';
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

interface ShopConnection {
  shopId: string;
  shopName: string;
  status: 'pending' | 'active';
}

interface UserData {
  shopConnections?: ShopConnection[];
}

interface Category {
  id: string;
  name: string;
}

export default function CustomerProductsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [selectedShopId, setSelectedShopId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData } = useDoc<UserData>(userDocRef);
  
  const activeShops = useMemo(() => {
    return userData?.shopConnections?.filter(c => c.status === 'active') || [];
  }, [userData]);

  const allCategoriesRef = useMemoFirebase(() => {
    return query(collectionGroup(firestore, 'categories'));
  }, [firestore]);
  
  const { data: allCategories } = useCollection<Category>(allCategoriesRef);

  const uniqueCategories = useMemo(() => {
      if (!allCategories) return [];
      const categoryNames = new Set<string>();
      allCategories.forEach(cat => categoryNames.add(cat.name));
      return Array.from(categoryNames).map(name => ({ id: name, name }));
  }, [allCategories]);


  useEffect(() => {
    const fetchProducts = async () => {
      if (!firestore || activeShops.length === 0) {
        setProducts([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      let productPromises: Promise<any>[] = [];

      if (selectedShopId === 'all') {
        // Fetch from all active shops
        activeShops.forEach(shop => {
          let productsQuery;
          const productsCollection = collection(firestore, `shops/${shop.shopId}/products`);
          if (selectedCategory === 'all') {
            productsQuery = query(productsCollection);
          } else {
            productsQuery = query(productsCollection, where('category', '==', selectedCategory));
          }
          productPromises.push(getDocs(productsQuery));
        });
      } else {
        // Fetch from a single selected shop
        let productsQuery;
        const productsCollection = collection(firestore, `shops/${selectedShopId}/products`);
        if (selectedCategory === 'all') {
          productsQuery = query(productsCollection);
        } else {
          productsQuery = query(productsCollection, where('category', '==', selectedCategory));
        }
        productPromises.push(getDocs(productsQuery));
      }

      try {
        const snapshots = await Promise.all(productPromises);
        const allProducts: Product[] = [];
        snapshots.forEach(snapshot => {
          snapshot.docs.forEach((doc: any) => {
            allProducts.push({ id: doc.id, ...doc.data() } as Product);
          });
        });
        setProducts(allProducts);
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

    fetchProducts();
  }, [firestore, activeShops, selectedShopId, selectedCategory, toast]);


  const handleAddToCart = async (product: Product) => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Not Logged In",
            description: "You must be logged in to add items to your cart.",
        });
        return;
    }
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
        imageUrl: product.images?.[0] || null,
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
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Browse Products</h1>
        <p className="text-muted-foreground">
          {activeShops.length > 0 ? "Select a shop to browse its products." : "You are not connected to any shops. Add a shop from your profile to start browsing."}
        </p>
        <div className="pt-4 grid md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="shop-filter" className="text-sm font-medium">Select a Shop</Label>
                <Select
                    value={selectedShopId}
                    onValueChange={(value) => {
                        setSelectedShopId(value);
                    }}
                    disabled={activeShops.length === 0}
                >
                    <SelectTrigger id="shop-filter" className="w-full md:w-[280px] mt-1">
                        <SelectValue placeholder="Select a shop" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Shops</SelectItem>
                        {activeShops.map(shop => (
                            <SelectItem key={shop.shopId} value={shop.shopId}>
                                {shop.shopName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="category-filter" className="text-sm font-medium">Filter by Category</Label>
                <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                    disabled={activeShops.length === 0}
                >
                    <SelectTrigger id="category-filter" className="w-full md:w-[280px] mt-1">
                        <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {uniqueCategories?.map(category => (
                            <SelectItem key={category.id} value={category.name}>
                                {category.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>
      
      <div>
        {isLoading && <p className="text-center py-8">Loading products...</p>}
        {!isLoading && activeShops.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
                <p>You haven't connected to any shops yet.</p>
                <Button variant="link" asChild><Link href="/customer/profile">Go to Profile to add a shop</Link></Button>
            </div>
        )}
        {!isLoading && !products?.length && (
          <p className="text-center text-muted-foreground py-8">
            No products found for this selection.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {!isLoading && products?.map((product) => {
            const imageUrl = product.images?.[0];
            const displayVariant = product.variants?.[0];
            const price = displayVariant?.price ?? 0;
            const stock = displayVariant?.stockQty ?? 0;

            return (
              <Card key={`${product.shopId}-${product.id}`} className="flex flex-col">
                <div className="relative w-full h-48">
                    {imageUrl ? (
                    <Image
                        alt={product.name}
                        className="aspect-square rounded-t-lg object-cover"
                        src={imageUrl}
                        fill
                        data-ai-hint={product.name}
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
      </div>
    </div>
  );
}
