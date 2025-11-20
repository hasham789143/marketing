
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Eye, MoreHorizontal, PlusCircle, Users } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface Shop {
    id: string;
    shopName: string;
    ownerUserId: string;
    status: 'active' | 'pending' | 'blocked';
    phone: string;
    createdAt: Timestamp;
    type: 'online' | 'physical';
}

export default function ShopsPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const shopsRef = useMemoFirebase(() => collection(firestore, 'shops'), [firestore]);
  const { data: shops, isLoading } = useCollection<Shop>(shopsRef);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'blocked':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
   const getTypeVariant = (type: string) => {
    switch (type) {
      case 'online':
        return 'secondary';
      case 'physical':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleViewProducts = (shopId: string) => {
    router.push(`/dashboard/products?shopId=${shopId}`);
  };

  const handleViewOrders = (shopId: string) => {
    router.push(`/dashboard/orders?shopId=${shopId}`);
  };

  const handleViewUsers = (shopId: string) => {
    router.push(`/dashboard/users?shopId=${shopId}`);
  };
  
  const handleUpdateStatus = async (shopId: string, currentStatus: Shop['status']) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    const shopDocRef = doc(firestore, 'shops', shopId);
    try {
        await updateDoc(shopDocRef, { status: newStatus });
        toast({
            title: "Shop Status Updated",
            description: `Shop has been ${newStatus}.`,
        });
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: e.message,
        });
    }
  };


  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <CardTitle>Shops</CardTitle>
          <CardDescription>
            Manage all registered shops on the platform.
          </CardDescription>
        </div>
        <Button asChild>
            <Link href="/dashboard/shops/register">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Shop
            </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden sm:table-cell">Contact</TableHead>
                <TableHead className="hidden lg:table-cell">Shop ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Created At</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center">Loading shops...</TableCell></TableRow>}
              {!isLoading && shops?.map((shop) => (
                <TableRow key={shop.id}>
                  <TableCell className="font-medium">{shop.shopName}</TableCell>
                  <TableCell>
                    <Badge variant={getTypeVariant(shop.type)}>{shop.type}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{shop.phone}</TableCell>
                  <TableCell className="hidden lg:table-cell truncate max-w-24">{shop.id}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(shop.status)}>{shop.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{shop.createdAt ? format(shop.createdAt.toDate(), 'PP') : 'N/A'}</TableCell>
                  <TableCell>
                      <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewProducts(shop.id)} className="hidden sm:flex">
                              <Eye className="mr-2 h-3 w-3" /> Products
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleViewOrders(shop.id)} className="hidden sm:flex">
                              <Eye className="mr-2 h-3 w-3" /> Orders
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleViewUsers(shop.id)} className="hidden sm:flex">
                              <Users className="mr-2 h-3 w-3" /> Users
                          </Button>
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
                              <DropdownMenuItem className="sm:hidden" onClick={() => handleViewProducts(shop.id)}>View Products</DropdownMenuItem>
                              <DropdownMenuItem className="sm:hidden" onClick={() => handleViewOrders(shop.id)}>View Orders</DropdownMenuItem>
                              <DropdownMenuItem className="sm:hidden" onClick={() => handleViewUsers(shop.id)}>View Users</DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/shops/edit/${shop.id}`}>Edit Details</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(shop.id, shop.status)}
                                className={shop.status === 'active' ? "text-destructive" : ""}
                              >
                                {shop.status === 'active' ? 'Block Shop' : 'Activate Shop'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
