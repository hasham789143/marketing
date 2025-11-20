'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { useMemo } from 'react';
// fff
interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderDetails {
  id: string;
  shopId: string;
  customer: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  status: 'Pending' | 'Accepted' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  paymentMethod: string;
  paymentStatus: string;
  date: string;
  deliveryAddress: string;
}

interface ShopConnection {
    shopId: string;
    shopName: string;
    status: 'pending' | 'active';
}

interface UserData {
    shopConnections?: ShopConnection[];
}

export default function OrderDetailsPage() {
  const firestore = useFirestore();
  const params = useParams();
  const { user } = useUser();
  const orderId = params.orderId as string;

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData } = useDoc<UserData>(userDocRef);

  const activeShop = useMemo(() => {
    return userData?.shopConnections?.find(c => c.status === 'active');
  }, [userData]);

  const orderDocRef = useMemoFirebase(() => {
    // To view an order, we need both the shopId and the orderId.
    // The user's active shop tells us which shop's orders to look in.
    if (!orderId || !activeShop?.shopId) return null;
    return doc(firestore, `shops/${activeShop.shopId}/orders`, orderId);
  }, [firestore, orderId, activeShop]);

  const { data: order, isLoading } = useDoc<OrderDetails>(orderDocRef);

  if (isLoading || !order) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading order details...</p>
      </div>
    );
  }

  const getStatusVariant = (status: OrderDetails['status']) => {
    switch (status) {
      case 'Pending':
        return 'secondary';
      case 'Delivered':
        return 'default';
      case 'Cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  const productTotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>
              Invoice for order #{order.id.substring(0, 8)}...
            </CardDescription>
          </div>
          <div className="text-left md:text-right">
              <p className="text-sm text-muted-foreground">Order Date: {format(new Date(order.date), 'PPP')}</p>
              <Badge variant={getStatusVariant(order.status)} className="mt-1">{order.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div>
                  <h3 className="font-semibold mb-2">Billed To</h3>
                  <p className="text-muted-foreground">{order.customer}</p>
                  <p className="text-muted-foreground">{order.deliveryAddress}</p>
              </div>
               <div className="text-left md:text-right">
                  <h3 className="font-semibold mb-2">Shop Details</h3>
                  <p className="text-muted-foreground">Shop ID: {order.shopId}</p>
              </div>
          </div>
          <Separator className="my-4" />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Item</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">PKR {item.price.toLocaleString()}</TableCell>
                    <TableCell className="text-right">PKR {(item.price * item.quantity).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Separator className="my-4" />
          <div className="grid gap-2 text-right w-full sm:w-1/2 md:w-1/3 ml-auto">
              <div className="flex justify-between">
                  <span className="text-muted-foreground">Product Total</span>
                  <span>PKR {productTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>PKR {order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Charge</span>
                  <span>PKR {order.deliveryCharge.toLocaleString()}</span>
              </div>
              <Separator />
               <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>PKR {order.total.toLocaleString()}</span>
              </div>
          </div>
          <Separator className="my-4" />
          <div className="grid gap-2">
              <div>
                  <h3 className="font-semibold text-base">Payment Details</h3>
                  <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payment Method</span>
                      <span>{order.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payment Status</span>
                      <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'secondary'}>{order.paymentStatus}</Badge>
                  </div>
              </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">Thank you for your business!</p>
        </CardFooter>
      </Card>
    </div>
  );
}
