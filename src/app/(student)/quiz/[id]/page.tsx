import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { QuizRunner } from "@/features/quiz/take/QuizRunner";

export default function QuizPage({ params, searchParams }: { params: { id: string }; searchParams: { exam?: string } }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link
            href="/my"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Về Khóa học của tôi</span>
          </Link>
        </div>

        <QuizRunner quizId={params.id} examId={searchParams.exam} />
      </main>
    </div>
  );
}
