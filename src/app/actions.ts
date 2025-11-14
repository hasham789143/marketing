
'use server';

import { getStaffActivityInsights } from '@/ai/flows/staff-activity-insights';
import { staffActivityLogs } from '@/lib/data';

export async function generateReportAction(
  prevState: {
    report: string | null;
    error: string | null;
    timestamp: number | null,
  },
  formData: FormData
) {
  try {
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
