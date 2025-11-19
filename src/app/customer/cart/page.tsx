'use client';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
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
import { collection, doc, writeBatch, serverTimestamp, getDocs, query } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
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
}

type PaymentMethod = 'Cash on Delivery' | 'Pay at End of Month';

export default function CartPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash on Delivery');

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData } = useDoc<UserData>(userDocRef);
  
  const activeShop = useMemo(() => {
    return userData?.shopConnections?.find(c => c.status === 'active');
  }, [userData]);
  
  const shopId = activeShop?.shopId;

  const cartRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/cart`);
  }, [user, firestore]);

  const { data: cartItems, isLoading } = useCollection<CartItem>(cartRef);

  const subtotal = cartItems?.reduce((acc, item) => acc + item.price * item.quantity, 0) ?? 0;
  const deliveryCharge = 150; // Replace with dynamic logic if needed
  const total = subtotal + deliveryCharge;

  const handlePlaceOrder = async () => {
    if (!user || !cartItems || cartItems.length === 0 || !shopId) {
      toast({
        variant: 'destructive',
        title: 'Cannot Place Order',
        description: 'Your cart is empty or you do not have an active shop connection.',
      });
      return;
    }

    try {
      const orderId = `ORD-${uuidv4().toUpperCase()}`;

      const orderPayload = {
        orderId: orderId,
        shopId: shopId,
        customerId: user.uid,
        customer: userData?.name || 'N/A',
        items: cartItems.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl || null,
        })),
        subtotal: subtotal,
        tax: 0, // Assuming no tax for now
        deliveryCharge: deliveryCharge,
        discount: 0, // Assuming no discount
        total: total,
        orderStatus: 'Pending',
        paymentStatus: 'Unpaid',
        paymentMethod: paymentMethod,
        deliveryAddress: userData?.deliveryAddress || 'Default Address', // Placeholder
        date: new Date().toISOString(),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };
      
      const batch = writeBatch(firestore);

      const orderRef = doc(firestore, `shops/${shopId}/orders`, orderId);
      batch.set(orderRef, orderPayload);

      const cartSnapshot = await getDocs(query(collection(firestore, `users/${user.uid}/cart`)));
      cartSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

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
    }
  };
  
  const handleRemoveItem = async (itemId: string) => {
    if (!user) return;
    try {
        const itemRef = doc(firestore, `users/${user.uid}/cart`, itemId);
        const batch = writeBatch(firestore);
        batch.delete(itemRef);
        await batch.commit();
        toast({
            title: "Item Removed",
            description: "The item has been removed from your cart.",
        });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Failed to Remove Item",
            description: error.message,
        });
    }
};

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Shopping Cart</CardTitle>
        <CardDescription>Review your items before placing an order.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Product</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="w-[50px]"><span className="sr-only">Remove</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading cart...</TableCell>
              </TableRow>
            )}
            {!isLoading && (!cartItems || cartItems.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Your cart is empty.</TableCell>
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
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="text-right">PKR {item.price.toLocaleString()}</TableCell>
                     <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove item</span>
                        </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4}>Subtotal</TableCell>
              <TableCell className="text-right">PKR {subtotal.toLocaleString()}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={4}>Delivery Charge</TableCell>
              <TableCell className="text-right">PKR {deliveryCharge.toLocaleString()}</TableCell>
            </TableRow>
            <TableRow className="font-semibold">
              <TableCell colSpan={4}>Total</TableCell>
              <TableCell className="text-right">PKR {total.toLocaleString()}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>

        <Separator className="my-6" />

        <div className="space-y-4">
            <h3 className="text-lg font-medium">Payment Method</h3>
            <RadioGroup value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
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
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handlePlaceOrder}
          disabled={isLoading || !cartItems || cartItems.length === 0}
        >
          Place Order
        </Button>
      </CardFooter>
    </Card>
  );
}
