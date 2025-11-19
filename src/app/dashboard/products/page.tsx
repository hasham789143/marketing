'use client';
import Image from 'next/image';
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Product } from '@/lib/data';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface UserData {
  role: string;
  shopId?: string;
}

export default function ProductsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const searchParams = useSearchParams();
  
  const adminSelectedShopId = searchParams.get('shopId');

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserData>(userDocRef);

  const shopId = userData?.role === 'admin' ? adminSelectedShopId : userData?.shopId;
  
  const productsRef = useMemoFirebase(() => {
    if (!shopId) return null;
    return collection(firestore, `shops/${shopId}/products`);
  }, [firestore, shopId]);
  
  const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsRef);

  const isLoading = isUserDataLoading || areProductsLoading;
  const isOwner = userData?.role === 'owner';
  const isAdmin = userData?.role === 'admin';

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            {isOwner && "Manage your products and view their inventory."}
            {isAdmin && (shopId ? `Viewing products for shop: ${shopId}`: "Select a shop to view its products.")}
            {!isOwner && !isAdmin && "View products for your shop."}
          </p>
        </div>
        {isOwner && (
            <Button asChild>
                <Link href="/dashboard/products/add">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Product
                </Link>
            </Button>
        )}
      </header>
      <div className="relative w-full overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] sm:table-cell">
                Image
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Variants</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right hidden md:table-cell">Total Stock</TableHead>
              {isOwner && (
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={isOwner ? 7 : 6} className="text-center">Loading products...</TableCell></TableRow>}
            {!isLoading && !shopId && isAdmin && (
                <TableRow><TableCell colSpan={isOwner ? 7 : 6} className="text-center">Please select a shop from the <Link href="/dashboard/shops" className="underline">shops page</Link> to view products.</TableCell></TableRow>
            )}
            {!isLoading && shopId && products?.length === 0 && (
                <TableRow><TableCell colSpan={isOwner ? 7 : 6} className="text-center">No products found for this shop.</TableCell></TableRow>
            )}
            {!isLoading && shopId && products?.map((product) => {
              const imageUrl = product.images?.[0];
              const totalStock = product.variants?.reduce((sum, v) => sum + v.stockQty, 0) ?? 0;
              const lowestPrice = product.variants?.reduce((min, v) => v.price < min ? v.price : min, product.variants[0]?.price ?? 0) ?? 0;
              
              return (
                <TableRow key={product.id}>
                  <TableCell className="sm:table-cell">
                    {imageUrl ? (
                      <Image
                        alt={product.name}
                        className="aspect-square rounded-md object-cover"
                        height="64"
                        src={imageUrl}
                        width="64"
                        data-ai-hint={product.name}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No Image</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {product.variants?.map(v => (
                        <Badge key={v.sku} variant="outline" className="mr-1 mb-1">{v.sku}</Badge>
                    ))}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div>{product.category}</div>
                    {product.subcategory && <div className="text-xs text-muted-foreground">{product.subcategory}</div>}
                    </TableCell>
                  <TableCell className="text-right">
                    PKR {lowestPrice.toLocaleString()}
                    {product.variants && product.variants.length > 1 ? '+' : ''}
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell">{totalStock}</TableCell>
                  {isOwner && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/products/edit/${product.id}`}>Edit</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
