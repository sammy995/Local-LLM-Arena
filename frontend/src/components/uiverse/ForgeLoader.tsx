// Uiverse-style streaming indicator: rising ember sparks.
export function ForgeLoader({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
      <span className="uv-forge-loader" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </span>
  );
}
