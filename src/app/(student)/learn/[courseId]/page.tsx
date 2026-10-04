import { notFound } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { getCourseDetail, type CourseDetail } from "@/lib/queries/courses";
import { LearningWorkspace } from "@/features/lesson/LearningWorkspace";

export default async function LearnPage({ params }: { params: { courseId: string } }) {
  let course: CourseDetail | null = null;

  try {
    course = await getCourseDetail(params.courseId);
  } catch {
    course = null;
  }

  if (!course) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <LearningWorkspace course={course} />
    </div>
  );
}
