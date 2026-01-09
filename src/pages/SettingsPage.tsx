import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Globe, Clock, Trash2, Check } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { User as UserType } from '@/core/types';

import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { authService } from '@/services/auth.service';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'uz', name: 'Uzbek', nativeName: "O'zbekcha" },
];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Tashkent',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
];

type PopupButton = {
  id?: string;
  type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
  text: string;
};

function telegramConfirm(
  WebApp: any,
  opts: { title?: string; message: string; okText: string; cancelText: string; destructive?: boolean },
): Promise<boolean> {
  // Dev mode or unsupported APIs → fallback to window.confirm
  if (!WebApp?.initData) {
    // browser/dev mode
    return Promise.resolve(window.confirm(opts.message));
  }

  // Prefer showPopup (best UX)
  if (typeof WebApp.showPopup === 'function') {
    return new Promise((resolve) => {
      const buttons: PopupButton[] = [
        { id: 'cancel', type: 'cancel', text: opts.cancelText },
        {
          id: 'ok',
          type: opts.destructive ? 'destructive' : 'ok',
          text: opts.okText,
        },
      ];

      WebApp.showPopup(
        {
          title: opts.title,
          message: opts.message,
          buttons,
        },
        (buttonId: string) => resolve(buttonId === 'ok'),
      );
    });
  }

  // Fallback: showConfirm
  if (typeof WebApp.showConfirm === 'function') {
    return new Promise((resolve) => {
      WebApp.showConfirm(opts.message, (confirmed: boolean) => resolve(confirmed));
    });
  }

  // Last resort
  return Promise.resolve(window.confirm(opts.message));
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { isReady, haptic, WebApp, user: tgUser } = useTelegramWebApp();

  const [user, setUser] = useState<UserType | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);

  const [updatingLanguage, setUpdatingLanguage] = useState(false);
  const [updatingTimezone, setUpdatingTimezone] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    (async () => {
      try {
        const me = await apiClient.getMe();
        setUser(me);
      } finally {
        setLoadingInit(false);
      }
    })();
  }, [isReady]);

  const displayName = useMemo(() => {
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
    return name || 'User';
  }, [user?.first_name, user?.last_name]);

  const initials = useMemo(() => {
    return displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [displayName]);

  const currentLang = user?.language_code || 'en';
  const currentTz = user?.timezone || 'UTC';

  const handleLanguageChange = useCallback(
    async (languageCode: string) => {
      if (!user) return;
      if (languageCode === (user.language_code || 'en')) return;

      setUpdatingLanguage(true);
      haptic?.impactOccurred?.('light');

      const prevLang = user.language_code || 'en';

      try {
        // instant UI feedback
        i18n.changeLanguage(languageCode);

        // backend
        const updated = await apiClient.updateUser({ language_code: languageCode });
        setUser(updated);

        haptic?.notificationOccurred?.('success');
        // No success alert → calm UX
      } catch (error) {
        console.error('Failed to update language:', error);
        haptic?.notificationOccurred?.('error');
        WebApp?.showAlert?.(t('errors.updateFailed'));
        // revert
        i18n.changeLanguage(prevLang);
      } finally {
        setUpdatingLanguage(false);
      }
    },
    [user, i18n, haptic, WebApp, t],
  );

  const handleTimezoneChange = useCallback(
    async (timezone: string) => {
      if (!user) return;
      if (timezone === (user.timezone || 'UTC')) return;

      setUpdatingTimezone(true);
      haptic?.impactOccurred?.('light');

      try {
        const updated = await apiClient.updateUser({ timezone });
        setUser(updated);

        haptic?.notificationOccurred?.('success');
        // No success alert
      } catch (error) {
        console.error('Failed to update timezone:', error);
        haptic?.notificationOccurred?.('error');
        WebApp?.showAlert?.(t('errors.updateFailed'));
      } finally {
        setUpdatingTimezone(false);
      }
    },
    [user, haptic, WebApp, t],
  );

  const handleDeleteAccount = useCallback(async () => {
    if (deletingAccount) return;

    const confirmed = await telegramConfirm(WebApp, {
      title: t('settings.dangerZone'),
      message: `${t('settings.deleteConfirm')}\n\n${t('settings.deleteMessage')}`,
      okText: t('settings.deleteAccount'),
      cancelText: t('common.cancel') || 'Cancel',
      destructive: true,
    });

    if (!confirmed) return;

    setDeletingAccount(true);
    haptic?.impactOccurred?.('heavy');

    try {
      await apiClient.deleteUser();

      authService.clearToken();
      localStorage.clear();

      haptic?.notificationOccurred?.('success');
      WebApp?.showAlert?.(t('settings.deleteSuccess'));
      WebApp?.close?.();
    } catch (error) {
      console.error('Failed to delete account:', error);
      haptic?.notificationOccurred?.('error');
      WebApp?.showAlert?.(t('errors.deleteFailed'));
    } finally {
      setDeletingAccount(false);
    }
  }, [WebApp, deletingAccount, haptic, t]);

  if (!isReady || loadingInit) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-safe-top" />
        <div className="h-14" />
        <div className="px-4 pb-8 max-w-md mx-auto space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
        <div className="h-safe-bottom" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="h-safe-top" />
      <div className="h-14" />

      <div className="px-4 pb-8 max-w-md mx-auto">
        {/* Header */}
        <header className="pt-2 pb-4">
          <div className="mt-3 flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
          </div>
        </header>

        <div className="space-y-5">
          {/* Profile */}
          <Card className="bg-card/30">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">{t('settings.profile')}</h3>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-muted/30 flex items-center justify-center text-foreground text-lg font-semibold">
                  {tgUser?.photo_url ? (
                    <img
                      src={tgUser.photo_url}
                      alt={displayName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold truncate">{displayName}</div>
                  {tgUser?.username && <div className="text-sm text-muted-foreground">@{tgUser.username}</div>}
                  <div className="text-xs text-muted-foreground mt-1">ID: {user?.id?.slice(0, 8)}...</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="bg-card/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">{t('settings.language')}</h3>
              </div>

              <div className="space-y-2">
                {LANGUAGES.map((lang) => {
                  const selected = currentLang === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      disabled={updatingLanguage}
                      className={cn(
                        'w-full text-left rounded-2xl px-4 py-3 transition active:scale-[0.99]',
                        'bg-muted/20 hover:bg-muted/30',
                        updatingLanguage && 'opacity-60 cursor-not-allowed active:scale-100',
                        selected && 'bg-primary/10',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{lang.nativeName}</div>
                          <div className="text-xs text-muted-foreground">{lang.name}</div>
                        </div>

                        {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">{t('settings.timezone')}</h3>
              </div>

              {/* Row-like wrapper to feel less "form" */}
              <div
                className={cn(
                  'rounded-2xl bg-muted/20 px-3 h-12 flex items-center',
                  updatingTimezone && 'opacity-60',
                )}
              >
                <select
                  value={currentTz}
                  onChange={(e) => handleTimezoneChange(e.target.value)}
                  disabled={updatingTimezone}
                  className="w-full bg-transparent text-sm outline-none"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="bg-card/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Trash2 className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-semibold text-red-500">{t('settings.dangerZone')}</h3>
              </div>

              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className={cn(
                  'w-full h-12 rounded-2xl transition active:scale-[0.99]',
                  'bg-red-500/10 text-red-600 font-semibold',
                  'hover:bg-red-500/15',
                  deletingAccount && 'opacity-60 cursor-not-allowed active:scale-100',
                )}
              >
                {deletingAccount ? t('common.deleting') || 'Deleting…' : t('settings.deleteAccount')}
              </button>

              <p className="text-xs text-muted-foreground mt-3 text-center">{t('settings.deleteMessage')}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="h-safe-bottom" />
    </div>
  );
}
