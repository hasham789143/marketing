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
import { useMemo } from 'react';

interface ShopConnection {
  shopId: string;
  shopName: string;
  status: 'pending' | 'active';
}
interface UserData {
  shopConnections?: ShopConnection[];
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

  const activeShop = useMemo(() => {
    return userData?.shopConnections?.find(c => c.status === 'active');
  }, [userData]);

  const ordersRef = useMemoFirebase(() => {
    if (!user || !activeShop?.shopId) return null;
    // Query orders from the specific shop the user is associated with.
    return query(
      collection(firestore, `shops/${activeShop.shopId}/orders`),
      where('customerId', '==', user.uid)
    );
  }, [firestore, user, activeShop]);

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
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">My Bills</h1>
        <p className="text-muted-foreground">A list of all your past bills. Click one to see details.</p>
      </div>
      <div className="relative w-full overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill ID</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
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
            {!isLoading && !activeShop && (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  You do not have an active shop connection. Please check your profile.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && activeShop && !orders?.length && (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  You haven't placed any orders yet.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && activeShop &&
              orders?.map((order) => (
                <TableRow key={order.id} onClick={() => handleOrderClick(order.id)} className="cursor-pointer">
                  <TableCell className="font-medium truncate max-w-24 md:max-w-xs">{order.id}</TableCell>
                  <TableCell className="hidden sm:table-cell">{order.date ? format(new Date(order.date), 'PP') : 'N/A'}</TableCell>
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
      </div>
    </div>
  );
}
