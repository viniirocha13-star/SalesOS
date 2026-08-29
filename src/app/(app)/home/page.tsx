import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomeOperadorPage() {
  const [queue, human, mine] = await Promise.all([
    prisma.preSale.count({ where: { status: { in: ["PRONTA", "PENDENCIA"] } } }),
    prisma.conversation.count({ where: { aiEnabled: false, status: "HANDOFF_HUMANO" } }),
    prisma.conversation.count({ where: { aiEnabled: false } }),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Agora</h1>
      <p className="text-sm text-zinc-500">O que precisa da sua ação neste momento.</p>
      <div className="grid gap-3 md:grid-cols-3">
        <Link href="/operacao">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Fila de lançamento</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{queue}</CardContent>
          </Card>
        </Link>
        <Link href="/inbox?filter=human">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Aguardando humano</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{human}</CardContent>
          </Card>
        </Link>
        <Link href="/inbox">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Conversas assumidas</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{mine}</CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
