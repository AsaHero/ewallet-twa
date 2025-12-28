import { Card, CardContent } from '@/components/ui/card';

export function ErrorCard({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="border border-border/40 bg-card/40">
      <CardContent className="p-4">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground mt-1">{message}</div>
        <button
          onClick={onRetry}
          className="mt-3 h-10 px-4 rounded-xl bg-primary text-primary-foreground font-semibold active:scale-[0.99] transition-transform"
        >
          Retry
        </button>
      </CardContent>
    </Card>
  );
}
