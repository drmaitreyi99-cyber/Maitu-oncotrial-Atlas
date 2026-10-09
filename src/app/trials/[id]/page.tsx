import { TrialScreen } from "@/components/screens";
import { trials } from "@/lib/data/seed";

export function generateStaticParams() {
  return trials.map((trial) => ({ id: trial.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TrialScreen id={id} />;
}
