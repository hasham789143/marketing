'use server';

/**
 * @fileOverview Provides staff activity insights for shop owners using LLM analysis.
 *
 * - getStaffActivityInsights - A function to retrieve a summarized report of staff activities.
 * - StaffActivityInsightsInput - The input type for the getStaffActivityInsights function.
 * - StaffActivityInsightsOutput - The return type for the getStaffActivityInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StaffActivityInsightsInputSchema = z.object({
  shopId: z.string().describe('The ID of the shop.'),
  staffActivityLogs: z.string().describe('A list of staff activity logs in JSON format.'),
});
export type StaffActivityInsightsInput = z.infer<typeof StaffActivityInsightsInputSchema>;

const StaffActivityInsightsOutputSchema = z.object({
  report: z.string().describe('A summarized report of staff activities.'),
});
export type StaffActivityInsightsOutput = z.infer<typeof StaffActivityInsightsOutputSchema>;

export async function getStaffActivityInsights(input: StaffActivityInsightsInput): Promise<StaffActivityInsightsOutput> {
  return staffActivityInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'staffActivityInsightsPrompt',
  input: {schema: StaffActivityInsightsInputSchema},
  output: {schema: StaffActivityInsightsOutputSchema},
  prompt: `You are an expert in analyzing staff activity logs for shops.

  You will receive a list of staff activity logs for the past 3 months. Your task is to generate a summarized report highlighting key insights, performance trends, and areas for improvement.

  Shop ID: {{{shopId}}}
  Staff Activity Logs: {{{staffActivityLogs}}}

  Provide a concise and informative report.
  `,
});

const staffActivityInsightsFlow = ai.defineFlow(
  {
    name: 'staffActivityInsightsFlow',
    inputSchema: StaffActivityInsightsInputSchema,
    outputSchema: StaffActivityInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
