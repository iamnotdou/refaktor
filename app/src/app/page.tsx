import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "Birincil Pazar",
    body: "KOBİ faturayı tokenize eder, ask price belirler. Yatırımcı doğrudan satın alır.",
  },
  {
    title: "İkincil Pazar",
    body: "Token sahibi vade dolmadan başkalarına satar; time-decay arbitrajı.",
  },
  {
    title: "Sigorta Havuzu",
    body: "Her trade %0.5 sigorta payı. Default olursa pro-rata tazminat.",
  },
];

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <div className="space-y-6">
        <Badge variant="outline" className="font-medium tracking-wider">
          Bi-Thongo Web3 Hackathon · Base Sepolia
        </Badge>
        <h1 className="font-heading text-5xl sm:text-6xl font-semibold tracking-tight max-w-3xl text-balance">
          Türk KOBİ ihracat faturaları,{" "}
          <span className="text-primary">açık pazarda</span>.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Refaktör tokenize edilmiş faturalarda birincil ve ikincil pazar
          likiditesi sunar. KOBİ vade beklemeden nakde döner; yatırımcı stabil
          RWA getirisi alır.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild size="lg">
            <Link href="/marketplace">Marketplace’i aç</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/upload">Fatura mint et</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16">
        {features.map((c) => (
          <Card key={c.title} size="sm">
            <CardHeader>
              <CardTitle>{c.title}</CardTitle>
              <CardDescription>{c.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
