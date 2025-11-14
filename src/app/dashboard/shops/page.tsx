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
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { format } from 'date-fns';
import Link from 'next/link';

interface Shop {
    id: string;
    shopName: string;
    ownerUserId: string;
    status: string;
    createdAt: string;
}

export default function ShopsPage() {
  const firestore = useFirestore();
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
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center">Loading shops...</TableCell></TableRow>}
            {!isLoading && shops?.map((shop) => (
              <TableRow key={shop.id}>
                <TableCell className="font-medium">{shop.shopName}</TableCell>
                <TableCell>{shop.id}</TableCell>
                <TableCell>{shop.ownerUserId}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(shop.status)}>{shop.status}</Badge>
                </TableCell>
                <TableCell>{format(new Date(shop.createdAt), 'PP')}</TableCell>
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
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Manage Staff</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Block Shop</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
