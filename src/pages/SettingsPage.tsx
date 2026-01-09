import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Globe, Clock, Trash2 } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { User as UserType } from '@/core/types';

import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { authService } from '@/services/auth.service';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'uz', name: 'Uzbek', nativeName: 'O\'zbekcha' },
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

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { isReady, haptic, WebApp, user: tgUser } = useTelegramWebApp();

  const [user, setUser] = useState<UserType | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [updatingLanguage, setUpdatingLanguage] = useState(false);
  const [updatingTimezone, setUpdatingTimezone] = useState(false);

  // Init load
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

  // Handle language change
  const handleLanguageChange = useCallback(async (languageCode: string) => {
    if (!user) return;

    setUpdatingLanguage(true);
    haptic?.impactOccurred?.('light');

    try {
      // Update locally first for instant feedback
      i18n.changeLanguage(languageCode);

      // Update backend
      const updated = await apiClient.updateUser({ language_code: languageCode });
      setUser(updated);

      haptic?.notificationOccurred?.('success');
      WebApp.showAlert?.(t('settings.languageUpdated'));
    } catch (error) {
      console.error('Failed to update language:', error);
      haptic?.notificationOccurred?.('error');
      WebApp.showAlert?.(t('errors.updateFailed'));
      // Revert UI change on error
      i18n.changeLanguage(user.language_code || 'en');
    } finally {
      setUpdatingLanguage(false);
    }
  }, [user, i18n, haptic, WebApp, t]);

  // Handle timezone change
  const handleTimezoneChange = useCallback(async (timezone: string) => {
    if (!user) return;

    setUpdatingTimezone(true);
    haptic?.impactOccurred?.('light');

    try {
      const updated = await apiClient.updateUser({ timezone });
      setUser(updated);

      haptic?.notificationOccurred?.('success');
      WebApp.showAlert?.(t('settings.timezoneUpdated'));
    } catch (error) {
      console.error('Failed to update timezone:', error);
      haptic?.notificationOccurred?.('error');
      WebApp.showAlert?.(t('errors.updateFailed'));
    } finally {
      setUpdatingTimezone(false);
    }
  }, [user, haptic, WebApp, t]);

  // Handle delete account
  const handleDeleteAccount = useCallback(async () => {
    const confirmed = confirm(
      `${t('settings.deleteConfirm')}\n\n${t('settings.deleteMessage')}`
    );
    if (!confirmed) return;

    haptic?.impactOccurred?.('heavy');

    try {
      await apiClient.deleteUser();

      // Clear local storage and auth
      authService.clearToken();
      localStorage.clear();

      haptic?.notificationOccurred?.('success');
      WebApp.showAlert?.(t('settings.deleteSuccess'));

      // Close the app or redirect
      WebApp.close?.();
    } catch (error) {
      console.error('Failed to delete account:', error);
      haptic?.notificationOccurred?.('error');
      WebApp.showAlert?.(t('errors.deleteFailed'));
    }
  }, [haptic, WebApp, t]);

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
      </div>
    );
  }

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="h-safe-top" />
      <div className="h-14" />

      <div className="px-4 pb-8 max-w-lg mx-auto">
        {/* Header */}
        <header className="pt-2 pb-4">
          <div className="mt-3 flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
          </div>
        </header>

        <div className="space-y-5">
          {/* Profile Section */}
          <Card className="border border-border/40 bg-card/40 shadow-sm">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">
                {t('settings.profile')}
              </h3>

              <div className="flex items-center gap-4">
                {/* Profile Picture */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground text-xl font-bold shadow-lg">
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

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-semibold truncate">
                    {displayName}
                  </div>
                  {tgUser?.username && (
                    <div className="text-sm text-muted-foreground">
                      @{tgUser.username}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    ID: {user?.id?.slice(0, 8)}...
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Language Selector */}
          <Card className="border border-border/40 bg-card/40 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  {t('settings.language')}
                </h3>
              </div>

              <div className="space-y-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    disabled={updatingLanguage}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      (user?.language_code || 'en') === lang.code
                        ? 'bg-primary/10 border-2 border-primary/50'
                        : 'bg-muted/30 border border-border/40 hover:bg-muted/50'
                    } ${updatingLanguage ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.99]'}`}
                  >
                    <div className="font-medium">{lang.nativeName}</div>
                    <div className="text-xs text-muted-foreground">{lang.name}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timezone Selector */}
          <Card className="border border-border/40 bg-card/40 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  {t('settings.timezone')}
                </h3>
              </div>

              <select
                value={user?.timezone || 'UTC'}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                disabled={updatingTimezone}
                className="w-full h-11 px-3 rounded-xl bg-muted/30 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border border-red-500/40 bg-red-500/5 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trash2 className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-semibold text-red-500">
                  {t('settings.dangerZone')}
                </h3>
              </div>

              <button
                onClick={handleDeleteAccount}
                className="w-full h-11 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {t('settings.deleteAccount')}
              </button>

              <p className="text-xs text-muted-foreground mt-3 text-center">
                {t('settings.deleteMessage')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="h-safe-bottom" />
    </div>
  );
}
