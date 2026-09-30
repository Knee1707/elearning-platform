import { getSettings } from "@/features/super-admin/queries";
import { saveSettingsAction } from "@/features/super-admin/actions";
import { SETTING_DEFS } from "@/features/super-admin/settings";
import { FlashMessage, PageHeader, dateTime, type SearchParams } from "@/features/super-admin/ui";

export default async function SuperAdminSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const settings = await getSettings();
  const byKey = new Map(settings.map((s) => [s.key, s]));
  const knownKeys = new Set(SETTING_DEFS.map((d) => d.key));
  const otherSettings = settings.filter((s) => !knownKeys.has(s.key));

  return (
    <main className="mx-auto max-w-3xl p-8">
      <PageHeader title="Cấu hình hệ thống" description="Mọi thay đổi được ghi vào Nhật ký hoạt động kèm giá trị trước/sau." />
      <FlashMessage searchParams={searchParams} />

      <form action={saveSettingsAction} className="mt-6 divide-y divide-border rounded-lg border border-border">
        {SETTING_DEFS.map((def) => {
          const current = byKey.get(def.key);
          const value = current?.value ?? def.defaultValue;
          return (
            <div key={def.key} className="grid gap-3 p-5 sm:grid-cols-[1fr_200px] sm:items-center">
              <div>
                <label htmlFor={def.key} className="font-medium">{def.label}</label>
                <p className="mt-0.5 text-sm text-muted-foreground">{def.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <code>{def.key}</code>
                  {current ? ` · cập nhật ${dateTime.format(new Date(current.updatedAt))}` : " · chưa đặt, đang dùng mặc định"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {def.type === "number" ? (
                  <input
                    id={def.key}
                    name={def.key}
                    type="number"
                    required
                    min={def.min}
                    max={def.max}
                    step={def.step}
                    defaultValue={String(value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-right tabular-nums"
                  />
                ) : (
                  <input
                    id={def.key}
                    name={def.key}
                    type="text"
                    required
                    maxLength={3}
                    pattern="[A-Za-z]{3}"
                    defaultValue={String(value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 uppercase"
                  />
                )}
                {def.type === "number" && def.unit && <span className="text-sm text-muted-foreground">{def.unit}</span>}
              </div>
            </div>
          );
        })}
        <div className="flex justify-end p-5">
          <button type="submit" className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground">Lưu cấu hình</button>
        </div>
      </form>

      {otherSettings.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold">Khóa cấu hình khác (chỉ đọc)</h2>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border text-sm">
            {otherSettings.map((s) => (
              <li key={s.key} className="flex justify-between gap-4 px-4 py-3">
                <code>{s.key}</code>
                <code className="truncate text-muted-foreground">{JSON.stringify(s.value)}</code>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
