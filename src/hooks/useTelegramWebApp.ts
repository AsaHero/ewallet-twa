import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    photo_url?: string;
}

export function useTelegramWebApp() {
    const [user, setUser] = useState<TelegramUser | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const init = async () => {
            // Check if running in browser/dev mode (no initData)
            if (!WebApp.initData) {
                console.log('Running in browser development mode');
                document.documentElement.classList.add('dark'); // Default to dark mode in dev
                setIsReady(true);
                return;
            }

            // Initialize Telegram WebApp
            WebApp.ready();

            // Expand
            WebApp.expand();

            // Request Full screen
            if (!WebApp.isFullscreen) {
                WebApp.requestFullscreen();
            }

            // Enable closing confirmation
            WebApp.enableClosingConfirmation();

            // Set header color to match theme
            WebApp.setHeaderColor('bg_color');

            // Apply Telegram theme to the app
            if (WebApp.themeParams) {
                const root = document.documentElement;
                const isDark = WebApp.colorScheme === 'dark';

                // Toggle dark class
                if (isDark) {
                    root.classList.add('dark');
                } else {
                    root.classList.remove('dark');
                }

                // Apply Telegram theme colors if available
                if (WebApp.themeParams.bg_color) {
                    root.style.setProperty('--tg-bg-color', WebApp.themeParams.bg_color);
                }
                if (WebApp.themeParams.text_color) {
                    root.style.setProperty('--tg-text-color', WebApp.themeParams.text_color);
                }
                if (WebApp.themeParams.hint_color) {
                    root.style.setProperty('--tg-hint-color', WebApp.themeParams.hint_color);
                }
            }

            // Get user data
            if (WebApp.initDataUnsafe.user) {
                setUser(WebApp.initDataUnsafe.user as TelegramUser);
            }

            setIsReady(true);
        };

        init();
    }, []);

    return {
        WebApp,
        user,
        isReady,
        initData: WebApp.initData,
        themeParams: WebApp.themeParams,
        colorScheme: WebApp.colorScheme,
        haptic: WebApp.HapticFeedback,
    };
}
