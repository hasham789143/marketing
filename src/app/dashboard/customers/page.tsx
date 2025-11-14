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
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'owner' | 'staff' | 'customer';
}

interface UserData {
    shopId?: string;
}

export default function CustomersPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData } = useDoc<UserData>(userDocRef);
  const shopId = userData?.shopId;

  const usersRef = useMemoFirebase(() => {
    if (!shopId) return null;
    const baseCollection = collection(firestore, 'users');
    return query(
        baseCollection, 
        where('shopId', '==', shopId),
        where('role', '==', 'customer')
    );
  }, [firestore, shopId]);
  
  const { data: customers, isLoading } = useCollection<User>(usersRef);

  const handleCustomerClick = (customerId: string) => {
    router.push(`/dashboard/orders?customerId=${customerId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customers</CardTitle>
        <CardDescription>
          A list of all customers associated with your shop. Click a customer to view their bill.
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
            {isLoading && <TableRow><TableCell colSpan={3} className="text-center">Loading customers...</TableCell></TableRow>}
            {!isLoading && customers?.length === 0 && (
                 <TableRow><TableCell colSpan={3} className="text-center">No customers found for this shop.</TableCell></TableRow>
            )}
            {!isLoading && customers?.map((customer) => (
              <TableRow key={customer.id} onClick={() => handleCustomerClick(customer.id)} className="cursor-pointer">
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.role}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
