import { PageHeader } from "@/components/layout/page-header";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="rounded-md border border-line bg-white p-8 text-muted shadow-soft">
        아직 데이터 연결 전입니다. mock data 구조를 기준으로 화면을 확장할 준비가 되어 있습니다.
      </div>
    </div>
  );
}
