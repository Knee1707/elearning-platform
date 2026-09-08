import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { QuizRunner } from "@/features/quiz/take/QuizRunner";

export default function QuizPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link
            href="/my"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Về Khóa học của tôi</span>
          </Link>
        </div>

        <QuizRunner quizId={params.id} />
      </main>
    </div>
  );
}
