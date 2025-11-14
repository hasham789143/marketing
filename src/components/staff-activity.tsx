'use client';

import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useToast } from '@/hooks/use-toast';
import { generateReportAction } from '@/app/actions';
import { staffActivityLogs, type ActivityLog } from '@/lib/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Bot, Loader2, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      Generate Activity Insights
    </Button>
  );
}

export function StaffActivity() {
  const { toast } = useToast();
  const [state, formAction] = useFormState(generateReportAction, {
    report: null,
    error: null,
    timestamp: null,
  });
  const prevStateRef = useRef(state);

  useEffect(() => {
    if (state.timestamp !== prevStateRef.current.timestamp) {
        if (state.error) {
            toast({
              variant: 'destructive',
              title: 'Generation Failed',
              description: state.error,
            });
        }
        prevStateRef.current = state;
    }
  }, [state, toast]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Staff Activity</CardTitle>
            <CardDescription>
              A log of all staff activities in the last 3 months.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffActivityLogs.map((log: ActivityLog) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-medium">{log.staffName}</div>
                      <div className="text-sm text-muted-foreground">
                        {log.staffRole}
                      </div>
                    </TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDistanceToNow(new Date(log.timestamp), {
                        addSuffix: true,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6" />
              <CardTitle>AI-Powered Insights</CardTitle>
            </div>
            <CardDescription>
              Let our AI analyze staff activity and provide you with a
              summarized report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="flex flex-col gap-4">
              <SubmitButton />
            </form>
            {(state.report || useFormStatus().pending) && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Generated Report</h4>
                <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-lg bg-muted/50">
                    {useFormStatus().pending && !state.report && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>Generating your report...</span></div>}
                    {state.report && <p>{state.report}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
