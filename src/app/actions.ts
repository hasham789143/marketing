
'use server';

import { getStaffActivityInsights } from '@/ai/flows/staff-activity-insights';
import { collection, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export async function generateReportAction(
  prevState: {
    report: string | null;
    error: string | null;
    timestamp: number | null,
  },
  formData: FormData
) {
  try {
    const { firestore } = initializeFirebase();
    const logsRef = collection(firestore, 'audit_logs');
    const logsSnapshot = await getDocs(logsRef);
    const staffActivityLogs = logsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

    const logs = JSON.stringify(staffActivityLogs.map(log => ({ ...log, timestamp: undefined })));
    
    const result = await getStaffActivityInsights({
      shopId: 'SHOP-X8Y1',
      staffActivityLogs: logs,
    });
    
    if (!result.report) {
      return { report: null, error: 'The AI model did not return a report.', timestamp: Date.now() };
    }
    return { report: result.report, error: null, timestamp: Date.now() };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { report: null, error: `Failed to generate report: ${errorMessage}`, timestamp: Date.now() };
  }
}
