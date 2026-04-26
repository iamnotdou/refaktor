import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <div className="space-y-6">
        <p className="text-xs uppercase tracking-widest text-blue-600 font-medium">
          Bi-Thongo Web3 Hackathon · Base Sepolia
        </p>
        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight max-w-3xl">
          Türk KOBİ ihracat faturaları, açık pazarda.
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
          Refaktör tokenize edilmiş faturalarda birincil ve ikincil pazar likiditesi sunar.
          KOBİ vade beklemeden nakde döner; yatırımcı stabil RWA getirisi alır.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/marketplace"
            className="inline-flex items-center px-5 py-2.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
          >
            Marketplace’i aç
          </Link>
          <Link
            href="/upload"
            className="inline-flex items-center px-5 py-2.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            Fatura mint et
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16">
        {[
          {
            title: "Birincil Pazar",
            body:
              "KOBİ faturayı tokenize eder, ask price belirler. Yatırımcı doğrudan satın alır.",
          },
          {
            title: "İkincil Pazar",
            body:
              "Token sahibi vade dolmadan başkalarına satar; time-decay arbitrajı.",
          },
          {
            title: "Sigorta Havuzu",
            body:
              "Her trade %0.5 sigorta payı. Default olursa pro-rata tazminat.",
          },
        ].map(c => (
          <div
            key={c.title}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900"
          >
            <div className="font-medium mb-2">{c.title}</div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
