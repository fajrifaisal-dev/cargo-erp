import { getPublicShipmentTracking } from '@/app/actions/tracking';
import { TrackingView } from '@/components/tracking/TrackingView';

export const revalidate = 0;

interface TrackDetailPageProps {
  params: Promise<{ resi: string }>;
}

export default async function TrackDetailPage({
  params,
}: TrackDetailPageProps) {
  const { resi } = await params;
  const decoded = decodeURIComponent(resi);
  const data = await getPublicShipmentTracking(decoded);

  return (
    <TrackingView
      initialQuery={decoded}
      trackingData={data}
      searched={true}
    />
  );
}
