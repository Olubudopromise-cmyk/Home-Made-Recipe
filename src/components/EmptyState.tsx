import type { ReactNode } from 'react';

/** Used whenever there is genuinely nothing to show — no fake placeholders. */
export function EmptyState({
  emoji = '🍽️',
  title,
  hint,
  action,
}: {
  emoji?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-emoji" aria-hidden="true">
        {emoji}
      </div>
      <p className="empty-title">{title}</p>
      {hint ? <p className="empty-hint">{hint}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}
