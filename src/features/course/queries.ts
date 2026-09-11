"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import type { Course } from "@/types/domain";
import type { CourseInput } from "./schema";

type DatabaseRow = Record<string, unknown>;

function mapCourse(row: DatabaseRow): Course {
  return {
    id: String(row.id),
    instructorId: String(row.instructor_id),
    categoryId: typeof row.category_id === "string" ? row.category_id : null,
    title: String(row.title),
    slug: String(row.slug),
    description: String(row.description ?? ""),
    level: String(row.level),
    price: Number(row.price),
    status: row.status as Course["status"],
    thumbnailUrl: typeof row.thumbnail_url === "string" ? row.thumbnail_url : null,
    isFeatured: Boolean(row.is_featured),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function getMyCourses(): Promise<Course[]> {
  const profile = await requireRole(["instructor", "admin"]);
  const supabase = createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("instructor_id", profile.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as DatabaseRow[]).map(mapCourse);
}

export interface CategoryOption {
  id: string;
  name: string;
}

export async function getCategories(): Promise<CategoryOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("categories").select("id, name").order("name");
  if (error) throw error;
  return (data as DatabaseRow[]).map((row) => ({ id: String(row.id), name: String(row.name) }));
}

export async function createCourse(input: CourseInput): Promise<{ id: string; slug: string }> {
  const profile = await requireRole(["instructor", "admin"]);
  const supabase = createClient();

  const baseSlug = slugify(input.title);
  const slug = `${baseSlug}-${Date.now().toString(36)}`; // hậu tố tránh trùng tạm thời

  const { data, error } = await supabase
    .from("courses")
    .insert({
      instructor_id: profile.id,
      category_id: input.categoryId,
      title: input.title,
      slug,
      description: input.description,
      level: input.level,
      price: input.price,
      status: "draft",
    })
    .select("id, slug")
    .single();

  if (error) throw error;
  return { id: String(data.id), slug: String(data.slug) };
}