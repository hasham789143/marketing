
'use client';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, runTransaction, getDoc } from 'firebase/firestore';
import { Home, MinusCircle, Pencil, Phone, PlusCircle, Trash2, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import type { Product } from '@/lib/data';

interface CartItem {
  id: string;
  productId: string;
  shopId: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  imageUrl?: string;
}

interface ShopConnection {
  shopId: string;
  shopName: string;
  status: 'pending' | 'active';
}

interface UserData {
  shopConnections?: ShopConnection[];
  name?: string;
  deliveryAddress?: string;
  phone?: string;
}

type PaymentMethod = 'Cash on Delivery' | 'Pay at End of Month';

export default function CartPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash on Delivery');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData } = useDoc<UserData>(userDocRef);
  
  const activeShop = useMemo(() => {
    return userData?.shopConnections?.find(c => c.status === 'active');
  }, [userData]);
  
  const cartRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/cart`);
  }, [user, firestore]);

  const { data: cartItems, isLoading } = useCollection<CartItem>(cartRef);

  // For simplicity, we assume a user can only order from one shop at a time.
  // The cart should ideally only contain items from one shop.
  const shopId = useMemo(() => {
      return cartItems?.[0]?.shopId;
  }, [cartItems]);

  const subtotal = cartItems?.reduce((acc, item) => acc + item.price * item.quantity, 0) ?? 0;
  const deliveryCharge = 150; 
  const total = subtotal + deliveryCharge;

  const handlePlaceOrder = async () => {
    if (!user || !cartItems || cartItems.length === 0 || !shopId) {
      toast({
        variant: 'destructive',
        title: 'Cannot Place Order',
        description: 'Your cart is empty or shop is invalid.',
      });
      return;
    }
    
    if (!userData?.deliveryAddress || !userData?.phone) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please add a delivery address and phone number to your profile before placing an order.',
      });
      router.push('/customer/profile');
      return;
    }

    setIsPlacingOrder(true);

    try {
      await runTransaction(firestore, async (transaction) => {
        const orderId = `ORD-${uuidv4().toUpperCase()}`;
        const orderRef = doc(firestore, `shops/${shopId}/orders`, orderId);

        // 1. Verify stock for all items in the cart
        for (const item of cartItems) {
          const productRef = doc(firestore, `shops/${item.shopId}/products`, item.productId);
          const productDoc = await transaction.get(productRef);

          if (!productDoc.exists()) {
            throw new Error(`Product ${item.name} not found.`);
          }

          const productData = productDoc.data() as Product;
          const variant = productData.variants?.find(v => v.sku === item.sku);

          if (!variant || variant.stockQty < item.quantity) {
            throw new Error(`Not enough stock for ${item.name}. Available: ${variant?.stockQty || 0}, in cart: ${item.quantity}.`);
          }
        }

        // 2. If all stock is available, create the order and decrement stock
        const orderPayload = {
          orderId: orderId,
          shopId: shopId,
          customerId: user.uid,
          customer: userData?.name || 'N/A',
          items: cartItems.map(item => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.imageUrl || null,
          })),
          subtotal: subtotal,
          tax: 0,
          deliveryCharge: deliveryCharge,
          discount: 0,
          total: total,
          orderStatus: 'Pending',
          paymentStatus: 'Unpaid',
          paymentMethod: paymentMethod,
          deliveryAddress: userData?.deliveryAddress,
          phone: userData?.phone,
          date: new Date().toISOString(),
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        };
        
        transaction.set(orderRef, orderPayload);

        for (const item of cartItems) {
           const productRef = doc(firestore, `shops/${item.shopId}/products`, item.productId);
           const productDoc = await transaction.get(productRef); // Re-get inside transaction
           const productData = productDoc.data() as Product;
           
           const newVariants = productData.variants?.map(v => {
               if (v.sku === item.sku) {
                   return { ...v, stockQty: v.stockQty - item.quantity };
               }
               return v;
           });

           transaction.update(productRef, { variants: newVariants });
        }

        // 3. Clear the user's cart
        cartItems.forEach(item => {
            const cartItemRef = doc(firestore, `users/${user.uid}/cart`, item.id);
            transaction.delete(cartItemRef);
        });
      });

      toast({
        title: 'Order Placed!',
        description: 'Your order has been successfully placed.',
      });

      router.push('/customer/orders');

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Place Order',
        description: error.message,
      });
    } finally {
        setIsPlacingOrder(false);
    }
  };
  
  const handleUpdateQuantity = async (cartItemId: string, newQuantity: number) => {
      if (!user) return;
      const cartItemRef = doc(firestore, `users/${user.uid}/cart`, cartItemId);

      try {
          const batch = writeBatch(firestore);
          if (newQuantity > 0) {
              batch.update(cartItemRef, { quantity: newQuantity });
          } else {
              batch.delete(cartItemRef);
          }
          await batch.commit();
      } catch (error: any) {
          toast({
              variant: "destructive",
              title: "Update Failed",
              description: error.message
          });
      }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">My Shopping Cart</h1>
        <p className="text-muted-foreground">Review your items and shipping details before placing an order.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <div className="overflow-x-auto rounded-lg border">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[80px]">Product</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">Loading cart...</TableCell>
                    </TableRow>
                    )}
                    {!isLoading && (!cartItems || cartItems.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">Your cart is empty.</TableCell>
                    </TableRow>
                    )}
                    {!isLoading &&
                    cartItems?.map((item) => {
                        return (
                        <TableRow key={item.id}>
                            <TableCell>
                            <Image
                                alt={item.name}
                                className="aspect-square rounded-md object-cover"
                                height="64"
                                src={item.imageUrl || 'https://placehold.co/64x64'}
                                width="64"
                                data-ai-hint={'product image'}
                            />
                            </TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                     <Button 
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                     >
                                        <MinusCircle className="h-4 w-4" />
                                    </Button>
                                    <span>{item.quantity}</span>
                                     <Button 
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                     >
                                        <PlusCircle className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">PKR {item.price.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-medium">PKR {(item.price * item.quantity).toLocaleString()}</TableCell>
                        </TableRow>
                        );
                    })}
                </TableBody>
                </Table>
            </div>
        </div>

        <div className="space-y-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Shipping Information</CardTitle>
                        <CardDescription>Details for your delivery.</CardDescription>
                    </div>
                     <Button asChild variant="outline" size="sm">
                        <Link href="/customer/profile">
                            <Pencil className="h-3 w-3 mr-2" />
                            Edit
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                   <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium">{userData?.name || 'N/A'}</p>
                            <p className="text-muted-foreground">Customer Name</p>
                        </div>
                   </div>
                   <div className="flex items-start gap-3">
                        <Home className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium">{userData?.deliveryAddress || 'No address provided'}</p>
                            <p className="text-muted-foreground">Delivery Address</p>
                        </div>
                   </div>
                    <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium">{userData?.phone || 'No phone provided'}</p>
                            <p className="text-muted-foreground">Contact Number</p>
                        </div>
                   </div>
                    {(!userData?.deliveryAddress || !userData?.phone) && (
                        <p className="text-destructive font-medium">Please complete your profile to place an order.</p>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>PKR {subtotal.toLocaleString()}</span>
                        </div>
                         <div className="flex justify-between">
                            <span>Delivery Charge</span>
                            <span>PKR {deliveryCharge.toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-base">
                            <span>Total</span>
                            <span>PKR {total.toLocaleString()}</span>
                        </div>
                    </div>
                     <Separator />
                     <div className="space-y-2">
                        <h3 className="text-sm font-medium">Payment Method</h3>
                        <RadioGroup value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)} className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Cash on Delivery" id="cod" />
                                <Label htmlFor="cod">Cash on Delivery (COD)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Pay at End of Month" id="monthly" />
                                <Label htmlFor="monthly">Pay at End of Month</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <Button
                        className="w-full"
                        onClick={handlePlaceOrder}
                        disabled={isLoading || isPlacingOrder || !cartItems || cartItems.length === 0 || !userData?.deliveryAddress || !userData?.phone}
                    >
                        {isPlacingOrder ? "Placing Order..." : "Place Order"}
                    </Button>
                </CardContent>
            </Card>

        </div>
      </div>
    </div>
  );
}
