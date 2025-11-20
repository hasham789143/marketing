
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserData {
  role: string;
}

interface PlatformSettings {
  connectedShopsEnabled: boolean;
}

export default function PlatformSettingsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [connectedShopsEnabled, setConnectedShopsEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserData>(userDocRef);
  const isAdmin = userData?.role === 'admin';

  const settingsDocRef = useMemoFirebase(() => {
    return doc(firestore, 'platform_settings', 'features');
  }, [firestore]);

  const { data: platformSettings, isLoading: areSettingsLoading } = useDoc<PlatformSettings>(settingsDocRef);

  useEffect(() => {
    if (platformSettings) {
      setConnectedShopsEnabled(platformSettings.connectedShopsEnabled);
    }
  }, [platformSettings]);


  const handleSaveChanges = async () => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only administrators can change platform settings.' });
      return;
    }
    
    setIsSaving(true);
    try {
      // Use setDoc with merge:true to create the doc if it doesn't exist
      await setDoc(settingsDocRef, {
        connectedShopsEnabled: connectedShopsEnabled,
      }, { merge: true });

      toast({ title: 'Platform Settings Saved', description: 'The changes have been applied globally.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isUserLoading || isUserDataLoading || areSettingsLoading;
  
  if (isLoading) {
    return <div className="flex w-full items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  
  if (!isAdmin) {
      return (
        <Card>
            <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>You do not have permission to view this page.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            </CardContent>
        </Card>
      )
  }

  return (
    <div className="w-full space-y-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Platform Settings</h1>
            <p className="text-muted-foreground">
                Manage global settings and feature flags for the entire application.
            </p>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>
            Enable or disable major features across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="connected-shops-switch" className="font-medium">
                Enable "Your Connected Shops"
              </Label>
              <p className="text-sm text-muted-foreground">
                Allows customers to connect to physical shops and see their specific products.
              </p>
            </div>
            <Switch
              id="connected-shops-switch"
              checked={connectedShopsEnabled}
              onCheckedChange={setConnectedShopsEnabled}
              disabled={isLoading || isSaving}
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex">
        <Button onClick={handleSaveChanges} disabled={isLoading || isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving All Settings...</> : 'Save All Settings'}
        </Button>
      </div>

    </div>
  );
}

    