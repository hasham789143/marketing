
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
import { collection, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Shop {
    id: string;
    shopName: string;
    ownerUserId: string;
    status: string;
    phone: string;
    createdAt: Timestamp;
}

export default function ShopsPage() {
  const firestore = useFirestore();
  const router = useRouter();
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

  const handleViewProducts = (shopId: string) => {
    router.push(`/dashboard/products?shopId=${shopId}`);
  };

  const handleViewOrders = (shopId: string) => {
    router.push(`/dashboard/orders?shopId=${shopId}`);
  };

  const handleViewUsers = (shopId: string) => {
    router.push(`/dashboard/users?shopId=${shopId}`);
  };


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Shop ID</TableHead>
              <TableHead>Owner ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
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
                <TableCell>{shop.phone}</TableCell>
                <TableCell>{shop.id}</TableCell>
                <TableCell>{shop.ownerUserId}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(shop.status)}>{shop.status}</Badge>
                </TableCell>
                <TableCell>{shop.createdAt ? format(shop.createdAt.toDate(), 'PP') : 'N/A'}</TableCell>
                <TableCell>
                    <div className="flex items-center justify-end gap-2">
                         <Button variant="outline" size="sm" onClick={() => handleViewProducts(shop.id)}>
                            <Eye className="mr-2 h-3 w-3" /> Products
                        </Button>
                         <Button variant="outline" size="sm" onClick={() => handleViewOrders(shop.id)}>
                             <Eye className="mr-2 h-3 w-3" /> Orders
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleViewUsers(shop.id)}>
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
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Manage Staff</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Block Shop</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
