import { OrganDetailScreen } from "@/components/screens";
import { organs } from "@/lib/data/organs";

export function generateStaticParams() {
  return organs.map((organ) => ({ slug: organ.id }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <OrganDetailScreen slug={slug} />;
}
