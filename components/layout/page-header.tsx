type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div className="mb-7">
      {eyebrow ? (
        <p className="mb-2 text-sm font-semibold text-accent">{eyebrow}</p>
      ) : null}
      <h2 className="text-3xl font-bold tracking-normal text-ink">{title}</h2>
      <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
        {description}
      </p>
    </div>
  );
}
