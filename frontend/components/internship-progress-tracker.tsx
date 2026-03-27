const FLOW = ['DRAFT', 'SENT_TO_DEPT', 'ACCEPTED', 'PUBLISHED', 'CLOSED'];

export function InternshipProgressTracker({ status }: { status: string }) {
  const current = FLOW.indexOf((status || '').toUpperCase());
  return (
    <ol className="grid gap-2 sm:grid-cols-5">
      {FLOW.map((step, index) => {
        const done = current >= index;
        return (
          <li key={step} className={`rounded-lg border px-3 py-2 text-center text-xs font-semibold ${done ? 'border-primary bg-blue-50 text-blue-900' : 'border-slate-300 bg-white text-slate-600'}`}>
            {step.replaceAll('_', ' ')}
          </li>
        );
      })}
    </ol>
  );
}
