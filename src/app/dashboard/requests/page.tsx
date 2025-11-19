
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
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserData {
    role: string;
    shopId?: string;
    shopConnections?: ShopConnection[];
}

interface ShopConnection {
    shopId: string;
    shopName: string;
    status: 'pending' | 'active';
}

interface ConnectionRequest {
    id: string; // This will be the user's ID
    name: string;
    email: string;
    shopConnections: ShopConnection[];
}


export default function RequestsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserData>(userDocRef);
  const shopId = userData?.shopId;
  const isOwner = userData?.role === 'owner';

  // Find all users who have a pending request for THIS shop
  const requestsRef = useMemoFirebase(() => {
    if (!shopId) return null;
    return query(
        collection(firestore, 'users'), 
        where('shopConnections', 'array-contains', { shopId: shopId, shopName: '', status: 'pending' })
    );
    // Note: The shopName is not known by the querier, so we have to be careful.
    // A better way would be a dedicated `connectionRequests` subcollection.
    // For now, we will filter client-side.
  }, [firestore, shopId]);

  const { data: usersWithRequests, isLoading: areRequestsLoading } = useCollection<ConnectionRequest>(requestsRef);
  
  // Client-side filter to get the actual requests for this shop
  const pendingRequests = usersWithRequests
    ?.map(u => ({
        ...u,
        request: u.shopConnections.find(sc => sc.shopId === shopId && sc.status === 'pending')
    }))
    .filter(u => u.request);


  const handleRequest = async (customer: ConnectionRequest, newStatus: 'active' | 'rejected') => {
    if (!customer.request || !shopId) return;

    const customerDocRef = doc(firestore, 'users', customer.id);
    const batch = writeBatch(firestore);

    // Create the new connection object with the updated status
    const newConnection = { ...customer.request, status: newStatus as 'active' | 'rejected' };
    if (newStatus === 'rejected') {
        // For rejection, we just remove the pending request
         batch.update(customerDocRef, {
            shopConnections: arrayRemove(customer.request)
        });
    } else {
        // For approval, we remove the old and add the new
        batch.update(customerDocRef, {
            shopConnections: arrayRemove(customer.request)
        });
         batch.update(customerDocRef, {
            shopConnections: arrayUnion(newConnection)
        });
    }

    try {
        await batch.commit();
        toast({
            title: `Request ${newStatus === 'active' ? 'Approved' : 'Rejected'}`,
            description: `${customer.name}'s request has been updated.`
        });
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
    }
  };
  
  const isLoading = isUserDataLoading || areRequestsLoading;

  if (!isOwner && !isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>Only shop owners can manage connection requests.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Customer Connection Requests</CardTitle>
            <CardDescription>Approve or deny requests from customers who want to connect to your shop.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && <TableRow><TableCell colSpan={3} className="text-center">Loading requests...</TableCell></TableRow>}
                    {!isLoading && (!pendingRequests || pendingRequests.length === 0) && (
                        <TableRow><TableCell colSpan={3} className="text-center">No pending requests.</TableCell></TableRow>
                    )}
                    {!isLoading && pendingRequests?.map((req) => (
                        <TableRow key={req.id}>
                            <TableCell className="font-medium">{req.name}</TableCell>
                            <TableCell>{req.email}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                    <Button size="sm" variant="outline" onClick={() => handleRequest(req, 'active')}>
                                        <Check className="mr-2 h-4 w-4" /> Approve
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleRequest(req, 'rejected')}>
                                         <X className="mr-2 h-4 w-4" /> Deny
                                    </Button>
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
