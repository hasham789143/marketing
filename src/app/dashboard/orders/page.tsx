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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Order } from '@/lib/data';
import { MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';


interface UserData {
  role: string;
  shopId?: string;
}

export default function OrdersPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const adminSelectedShopId = searchParams.get('shopId');

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserData>(userDocRef);

  const shopId = userData?.role === 'admin' ? adminSelectedShopId : userData?.shopId;

  const ordersRef = useMemoFirebase(() => {
    if (!shopId) return null;
    return collection(firestore, `shops/${shopId}/orders`);
  }, [firestore, shopId]);

  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersRef);

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
  }

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    if (!shopId) return;
    const orderDocRef = doc(firestore, `shops/${shopId}/orders`, orderId);
    try {
        await updateDoc(orderDocRef, { status: newStatus });
        toast({
            title: "Order Status Updated",
            description: `Order status has been updated to "${newStatus}".`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: `Could not update order status: ${error.message}`,
        });
    }
  };

  const handlePaymentStatusUpdate = async (orderId: string, newStatus: Order['paymentStatus']) => {
    if (!shopId) return;
    const orderDocRef = doc(firestore, `shops/${shopId}/orders`, orderId);
    try {
        await updateDoc(orderDocRef, { paymentStatus: newStatus });
        toast({
            title: "Payment Status Updated",
            description: `Payment status has been updated to "${newStatus}".`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: `Could not update payment status: ${error.message}`,
        });
    }
  };

  const isLoading = isUserDataLoading || areOrdersLoading;
  const isOwnerOrStaff = userData?.role === 'owner' || userData?.role === 'staff';
  const isAdmin = userData?.role === 'admin';
  const canManageOrders = isOwnerOrStaff || isAdmin;

  const orderStatuses: Order['status'][] = ['Pending', 'Accepted', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
  const paymentStatuses: Order['paymentStatus'][] = ['Paid', 'Unpaid'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders</CardTitle>
        <CardDescription>
          {isOwnerOrStaff && "A list of all recent orders from your shop."}
          {isAdmin && (shopId ? `Viewing orders for shop: ${shopId}`: "Select a shop to view its orders.")}
          {!isOwnerOrStaff && !isAdmin && "Viewing orders for your shop."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              {canManageOrders && (
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={canManageOrders ? 7 : 6} className="text-center">Loading orders...</TableCell></TableRow>}
            {!isLoading && !shopId && isAdmin && (
                 <TableRow><TableCell colSpan={canManageOrders ? 7 : 6} className="text-center">Please select a shop from the <Link href="/dashboard/shops" className="underline">shops page</Link> to view orders.</TableCell></TableRow>
            )}
             {!isLoading && shopId && orders?.length === 0 && (
                <TableRow><TableCell colSpan={canManageOrders ? 7 : 6} className="text-center">No orders found for this shop.</TableCell></TableRow>
            )}
            {!isLoading && shopId && orders?.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>{format(new Date(order.date), 'PP')}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'secondary'}>{order.paymentStatus}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  PKR {order.total.toLocaleString()}
                </TableCell>
                {canManageOrders && (
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
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/orders/${order.id}${isAdmin ? `?shopId=${shopId}` : ''}`}>View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Update Order Status</DropdownMenuLabel>
                            {orderStatuses.map((status) => (
                                <DropdownMenuItem 
                                    key={status}
                                    onClick={() => handleStatusUpdate(order.id, status)}
                                    disabled={order.status === status}
                                >
                                    {order.status === status ? `✓ ${status}` : `Mark as ${status}`}
                                </DropdownMenuItem>
                            ))}
                             <DropdownMenuSeparator />
                            <DropdownMenuLabel>Update Payment Status</DropdownMenuLabel>
                             {paymentStatuses.map((status) => (
                                <DropdownMenuItem 
                                    key={status}
                                    onClick={() => handlePaymentStatusUpdate(order.id, status)}
                                    disabled={order.paymentStatus === status}
                                >
                                    {order.paymentStatus === status ? `✓ ${status}` : `Mark as ${status}`}
                                </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
