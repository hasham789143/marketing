
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, updateDoc, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Label } from '@/components/ui/label';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'owner' | 'staff' | 'customer';
  shopId?: string;
}

interface Shop {
    id: string;
    shopName: string;
}

export default function UsersClient() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shopId = searchParams.get('shopId');

  const usersRef = useMemoFirebase(() => {
    const baseCollection = collection(firestore, 'users');
    if (shopId) {
      return query(baseCollection, where('shopId', '==', shopId));
    }
    return baseCollection;
  }, [firestore, shopId]);
  
  const { data: users, isLoading: areUsersLoading } = useCollection<User>(usersRef);

  const shopsRef = useMemoFirebase(() => collection(firestore, 'shops'), [firestore]);
  const { data: shops, isLoading: areShopsLoading } = useCollection<Shop>(shopsRef);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const userDocRef = doc(firestore, 'users', userId);
    try {
      await updateDoc(userDocRef, { role: newRole });
      toast({
        title: 'Role Updated',
        description: `User role has been successfully changed to ${newRole}.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message,
      });
    }
  };

  const handleShopFilterChange = (selectedShopId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedShopId === 'all') {
        params.delete('shopId');
    } else {
        params.set('shopId', selectedShopId);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const isLoading = areUsersLoading || areShopsLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          {shopId 
            ? <>Viewing users for shop: {shopId}. <Link href="/dashboard/users" className="underline">View all users</Link>.</>
            : "View and manage user roles across the platform."}
        </CardDescription>
        <div className="pt-4">
            <Label htmlFor="shop-filter">Filter by Shop</Label>
            <Select
                value={shopId || 'all'}
                onValueChange={handleShopFilterChange}
                disabled={areShopsLoading}
            >
                <SelectTrigger id="shop-filter" className="w-[280px]">
                    <SelectValue placeholder="Select a shop to filter users" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Shops</SelectItem>
                    {shops?.map(shop => (
                        <SelectItem key={shop.id} value={shop.id}>
                            {shop.shopName} ({shop.id})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Shop ID</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4} className="text-center">Loading users...</TableCell></TableRow>}
            {!isLoading && users?.length === 0 && (
                 <TableRow><TableCell colSpan={4} className="text-center">No users found.</TableCell></TableRow>
            )}
            {!isLoading && users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.shopId || 'N/A'}</TableCell>
                <TableCell>
                  <Select
                    defaultValue={user.role}
                    onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
