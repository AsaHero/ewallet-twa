import { useTranslation } from 'react-i18next';

export type EmptyStateVariant = 'no-data' | 'no-results' | 'error';

interface EmptyStateIllustrationProps {
  variant?: EmptyStateVariant;
  title?: string;
  message?: string;
  emoji?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyStateIllustration({
  variant = 'no-data',
  title,
  message,
  emoji,
  action,
}: EmptyStateIllustrationProps) {
  const { t } = useTranslation();

  const defaults = {
    'no-data': {
      emoji: '📊',
      title: t('stats.emptyState.noData') || 'No data available',
      message: t('stats.emptyState.noDataDesc') || 'Try selecting a different date range',
    },
    'no-results': {
      emoji: '🔍',
      title: t('stats.emptyState.noResults') || 'No results found',
      message: t('stats.emptyState.noResultsDesc') || 'Adjust your filters and try again',
    },
    'error': {
      emoji: '⚠️',
      title: t('common.error') || 'Error',
      message: t('common.errorOccurred') || 'An error occurred',
    },
  };

  const config = defaults[variant];
  const displayEmoji = emoji || config.emoji;
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-6xl mb-4 animate-bounce" style={{ animationDuration: '2s' }}>
        {displayEmoji}
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">
        {displayTitle}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-4">
        {displayMessage}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
