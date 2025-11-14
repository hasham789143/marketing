'use client';
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
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Order } from '@/lib/data';
import { collection, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

export default function CustomerOrdersPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const ordersRef = useMemoFirebase(() => {
    if (!user) return null;
    // This is not optimal as it queries all shops. A better approach would be to have a user-centric orders collection.
    // For now, we query all shops and filter by customerId.
    // A more scalable solution would involve duplicating order data or using a root collection for user orders.
    return query(
      collection(firestore, `shops/SHOP-X8Y1/orders`),
      where('customerId', '==', user.uid)
    );
  }, [firestore, user]);

  const { data: orders, isLoading } = useCollection<Order>(ordersRef);

  const getStatusVariant = (status: Order['status']) => {
    switch (status) {
      case 'Pending':
        return 'secondary';
      case 'Delivered':
        return 'default';
      case 'Cancelled':
        return 'destructive';
      case 'Out for Delivery':
      case 'Preparing':
      case 'Accepted':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const handleOrderClick = (orderId: string) => {
    router.push(`/customer/orders/${orderId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Orders</CardTitle>
        <CardDescription>A list of all your past orders. Click an order to see details.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Loading your orders...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !orders?.length && (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  You haven't placed any orders yet.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              orders?.map((order) => (
                <TableRow key={order.id} onClick={() => handleOrderClick(order.id)} className="cursor-pointer">
                  <TableCell className="font-medium">{order.id.substring(0, 8)}...</TableCell>
                  <TableCell>{format(new Date(order.date), 'PP')}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">PKR {order.total.toLocaleString()}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
