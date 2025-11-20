
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
import { collection, doc, query, updateDoc, where } from 'firebase/firestore';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useMemo, useState } from 'react';


interface UserData {
  role: string;
  shopId?: string;
}

interface CustomerData {
    name: string;
}

export default function OrdersClient() {
  const firestore = useFirestore();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const adminSelectedShopId = searchParams.get('shopId');
  const customerId = searchParams.get('customerId');
  
  const [customerName, setCustomerName] = useState<string | null>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserData>(userDocRef);

  const shopId = userData?.role === 'admin' ? adminSelectedShopId : userData?.shopId;

  const ordersRef = useMemoFirebase(() => {
    if (!shopId) return null;
    const baseCollection = collection(firestore, `shops/${shopId}/orders`);
    if (customerId) {
        return query(baseCollection, where('customerId', '==', customerId));
    }
    return baseCollection;
  }, [firestore, shopId, customerId]);

  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersRef);

  const customerDocRef = useMemoFirebase(() => {
    if (!customerId) return null;
    return doc(firestore, 'users', customerId);
  }, [firestore, customerId]);

  const { data: customerData } = useDoc<CustomerData>(customerDocRef);

  useEffect(() => {
    if (customerData) {
        setCustomerName(customerData.name);
    } else {
        setCustomerName(null);
    }
  }, [customerData]);


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
  
  const { totalPaid, totalUnpaid } = useMemo(() => {
    if (!orders) return { totalPaid: 0, totalUnpaid: 0 };
    return orders.reduce((acc, order) => {
        if (order.paymentStatus === 'Paid') {
            acc.totalPaid += order.total;
        } else if (order.paymentStatus === 'Unpaid') {
            acc.totalUnpaid += order.total;
        }
        return acc;
    }, { totalPaid: 0, totalUnpaid: 0 });
  }, [orders]);


  const isLoading = isUserDataLoading || areOrdersLoading;
  const isOwnerOrStaff = userData?.role === 'owner' || userData?.role === 'staff';
  const isAdmin = userData?.role === 'admin';
  const canManageOrders = isOwnerOrStaff || isAdmin;

  const orderStatuses: Order['status'][] = ['Pending', 'Accepted', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
  const paymentStatuses: Order['paymentStatus'][] = ['Paid', 'Unpaid'];

  const pageTitle = customerId ? `Bill for ${customerName || 'Customer'}` : "Orders";
  const pageDescription = customerId 
    ? `A list of all orders for this customer. Use the actions menu to update status.`
    : isOwnerOrStaff 
    ? "Manage all orders from your shop. Use the actions menu on each order to update its status."
    : isAdmin 
    ? (shopId ? `Viewing orders for shop: ${shopId}`: "Select a shop to view its orders.")
    : "Viewing orders for your shop.";


  return (
    <div className="p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
        <p className="text-muted-foreground">
          {pageDescription}
          {customerId && <Link href="/dashboard/orders" className="underline ml-2">View all orders</Link>}
        </p>
        {!customerId && !isLoading && orders && orders.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 pt-2 text-sm">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Total Paid:</span>
                    <span className="font-semibold text-green-600">PKR {totalPaid.toLocaleString()}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Total Unpaid:</span>
                    <span className="font-semibold text-red-600">PKR {totalUnpaid.toLocaleString()}</span>
                </div>
            </div>
        )}
      </header>
      <div className="relative w-full overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead className="hidden sm:table-cell">Customer</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
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
                <TableRow><TableCell colSpan={canManageOrders ? 7 : 6} className="text-center">No orders found.</TableCell></TableRow>
            )}
            {!isLoading && shopId && orders?.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium truncate max-w-24 md:max-w-none">{order.id}</TableCell>
                <TableCell className="hidden sm:table-cell">{order.customer}</TableCell>
                <TableCell className="hidden md:table-cell">{format(new Date(order.date), 'PP')}</TableCell>
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
      </div>
    </div>
  );
}
