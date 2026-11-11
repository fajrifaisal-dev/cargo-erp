import { getPublicShipmentTracking } from '@/app/actions/tracking';
import { TrackingView } from '@/components/tracking/TrackingView';

export const revalidate = 0;

interface TrackIndexPageProps {
  searchParams: Promise<{ resi?: string }>;
}

export default async function TrackIndexPage({
  searchParams,
}: TrackIndexPageProps) {
  const params = await searchParams;
  const query = params.resi?.trim() || '';
  const data = query ? await getPublicShipmentTracking(query) : null;

  return (
    <TrackingView
      initialQuery={query}
      trackingData={data}
      searched={Boolean(query)}
    />
  );
}
