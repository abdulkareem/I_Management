import { Badge } from '@/components/ui/badge';

type Status = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | string;

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-200 text-slate-900 border-slate-300',
  PUBLISHED: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  CLOSED: 'bg-rose-100 text-rose-900 border-rose-300',
};

export function StatusBadge({ status }: { status: Status }) {
  const normalized = (status || '').toUpperCase();
  const style = STATUS_STYLE[normalized] ?? 'bg-sky-100 text-sky-900 border-sky-300';
  return <Badge className={style}>{normalized || 'UNKNOWN'}</Badge>;
}
