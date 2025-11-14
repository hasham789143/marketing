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
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'owner' | 'staff' | 'customer';
}

interface UserData {
    shopId?: string;
}

export default function ShopUsersPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData } = useDoc<UserData>(userDocRef);
  const shopId = userData?.shopId;

  const usersRef = useMemoFirebase(() => {
    if (!shopId) return null;
    const baseCollection = collection(firestore, 'users');
    return query(baseCollection, where('shopId', '==', shopId));
  }, [firestore, shopId]);
  
  const { data: users, isLoading } = useCollection<User>(usersRef);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop Users</CardTitle>
        <CardDescription>
          A list of all staff and customers associated with your shop.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={3} className="text-center">Loading users...</TableCell></TableRow>}
            {!isLoading && users?.length === 0 && (
                 <TableRow><TableCell colSpan={3} className="text-center">No users found for this shop.</TableCell></TableRow>
            )}
            {!isLoading && users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
