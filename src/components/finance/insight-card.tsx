import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export type Insight = {
  /** e.g. lightbulb / savings */
  icon: string;
  text: string;
};

/**
 * Calm AI-insight card: factual, action-oriented, never blaming (spec §9).
 */
export function InsightCard({
  insights,
  title = 'תובנות חכמות',
  className,
}: {
  insights: Insight[];
  title?: string;
  className?: string;
}) {
  if (insights.length === 0) return null;
  return (
    <section
      aria-label={title}
      className={cn('flex flex-col gap-3 rounded-lg border border-line bg-accent p-4 shadow-sm', className)}
    >
      <h2 className='flex items-center gap-2 text-subhead font-bold text-accent-foreground'>
        <Icon name='auto_awesome' className='text-[18px]' />
        {title}
      </h2>
      <ul className='flex flex-col gap-2.5'>
        {insights.map((insight, i) => (
          <li key={i} className='flex items-start gap-2.5 text-body text-ink-2'>
            <Icon name={insight.icon} className='mt-0.5 shrink-0 text-[18px] text-accent-ink' />
            <span>{insight.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
