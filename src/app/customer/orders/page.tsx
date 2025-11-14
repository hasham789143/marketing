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
  TableFooter,
} from '@/components/ui/table';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Order } from '@/lib/data';
import { collection, doc, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface UserData {
  shopId?: string;
}

export default function CustomerOrdersPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData } = useDoc<UserData>(userDocRef);

  const ordersRef = useMemoFirebase(() => {
    if (!user || !userData?.shopId) return null;
    // Query orders from the specific shop the user is associated with.
    return query(
      collection(firestore, `shops/${userData.shopId}/orders`),
      where('customerId', '==', user.uid)
    );
  }, [firestore, user, userData]);

  const { data: orders, isLoading } = useCollection<Order>(ordersRef);

  const grandTotal = orders?.reduce((acc, order) => acc + order.total, 0) ?? 0;

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
        <CardTitle>My Bills</CardTitle>
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
                  Loading your bills...
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
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="text-right font-bold">Grand Total</TableCell>
              <TableCell className="text-right font-bold">PKR {grandTotal.toLocaleString()}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
