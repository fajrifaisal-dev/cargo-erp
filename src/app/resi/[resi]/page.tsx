import { redirect } from 'next/navigation';

interface ResiRedirectDetailProps {
  params: Promise<{ resi: string }>;
}

export default async function ResiRedirectDetailPage({
  params,
}: ResiRedirectDetailProps) {
  const { resi } = await params;
  redirect(`/track/${encodeURIComponent(decodeURIComponent(resi))}`);
}
