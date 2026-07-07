import ProgressClient from './ProgressClient';
import { getDashboardData } from '@/lib/dashboardStore';

export const dynamic = 'force-dynamic';

export default async function ProgressPage(){
  const data = await getDashboardData();
  return <ProgressClient initialData={data} />;
}
