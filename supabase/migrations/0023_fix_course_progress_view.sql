-- 0023_fix_course_progress_view.sql
-- Khắc phục lỗi trùng lặp thẻ khóa học do GROUP BY lp.user_id và bổ sung trường slug cho view_course_progress

drop view if exists view_course_progress;

create or replace view view_course_progress with (security_invoker = true) as
select
  c.id                                                     as course_id,
  c.slug                                                   as slug,
  c.title                                                  as course_title,
  c.thumbnail_url                                          as thumbnail_url,
  p.full_name                                              as instructor_name,
  count(distinct l.id)                                     as total_lessons,
  count(distinct lp.id) filter (where lp.is_completed = true and lp.user_id = auth.uid()) as completed_lessons,
  case
    when count(distinct l.id) = 0 then 0
    else round(
      count(distinct lp.id) filter (where lp.is_completed = true and lp.user_id = auth.uid())::numeric
      / count(distinct l.id) * 100
    )
  end                                                      as progress_percent
from courses c
join profiles p on p.id = c.instructor_id
left join chapters ch on ch.course_id = c.id
left join lessons l   on l.chapter_id = ch.id
left join lesson_progress lp
       on lp.lesson_id = l.id and lp.user_id = auth.uid()
where exists (
  select 1 from enrollments e
  where e.course_id = c.id and e.user_id = auth.uid() and e.status = 'active'
)
group by c.id, c.slug, c.title, c.thumbnail_url, p.full_name;
