import { Markup } from 'telegraf';
import { BotContext, Transaction } from '../../core/types';
import { apiClient } from '../../services/api.client';
import {
  formatAmount,
  getTransactionEmoji,
  getCategoryEmoji,
  escapeHtml,
  truncateLabel,
  formatCompactAmount,
  convertToTimezone,
  formatDateTime,
  formatFxRate,
} from '../../shared/utils/format';
import { stateManager } from '../../core/state/state.manager';
import { buildCloseButton } from '../menu/menu.handler';
import { Language, t } from '../../shared/utils/i18n';

const TRANSACTIONS_PER_PAGE = 5;

export async function historyHandler(ctx: BotContext) {
  const tgUserId = ctx.from.id;

  try {
    // Get transactions for current month by default
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await apiClient.getTransactions(ctx, {
      from: startOfMonth.toISOString(),
      limit: 50, // Get more for pagination
    });

    if (result.items.length === 0) {
      const user = await apiClient.getMe(ctx);
      const lang = (user.language_code as Language) || 'ru';

      await ctx.reply(t('history.no_transactions', lang), {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[buildCloseButton(lang)]]),
      });
      return;
    }

    // Calculate monthly totals
    let totalIncome = 0;
    let totalExpense = 0;
    result.items.forEach((tx) => {
      if (tx.type === 'deposit') {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
      }
    });

    const user = await apiClient.getMe(ctx);
    const currencyCode = user.currency_code || 'USD';
    const lang = (user.language_code as Language) || 'ru';
    const timezone = user.timezone;

    // Store transactions in state for navigation
    await stateManager.setState(tgUserId, 'VIEW_HISTORY', {
      transactions: result.items,
      currentPage: 0,
    });

    await sendHistoryPage(
      ctx,
      result.items,
      0,
      totalIncome,
      totalExpense,
      currencyCode,
      lang,
      timezone,
    );
  } catch (error: any) {
    console.error('History handler error:', error);
    await ctx.reply(t('history.error_load', 'ru'), {
      parse_mode: 'HTML',
    });
  }
}

async function sendHistoryPage(
  ctx: any,
  allTransactions: Transaction[],
  page: number,
  totalIncome: number,
  totalExpense: number,
  currencyCode: string,
  lang: Language,
  timezone?: string,
) {
  const startIdx = page * TRANSACTIONS_PER_PAGE;
  const endIdx = startIdx + TRANSACTIONS_PER_PAGE;
  const pageTransactions = allTransactions.slice(startIdx, endIdx);

  const categories = await apiClient.getCategories(ctx);
  const subcategories = await apiClient.getSubcategories(ctx);
  const accounts = await apiClient.getAccounts(ctx);
  const locale = lang === 'uz' ? 'uz-UZ' : 'ru-RU';

  const now = convertToTimezone(new Date(), timezone);
  const monthFormatter = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const monthTitle = monthFormatter.format(now);
  // Заголовок + сводка
  let message = '';
  message += `<b>${t('history.title', lang)}</b> - <i>${monthTitle}</i>\n\n`;

  message += `<b>${t('history.summary_month', lang)}</b>\n`;
  message += `${t('history.income', lang)}: <b>${formatAmount(totalIncome, currencyCode)}</b>\n`;
  message += `${t('history.expense', lang)}: <b>${formatAmount(totalExpense, currencyCode)}</b>\n\n`;

  // Если транзакций больше, чем на одну страницу – покажем инфо о странице
  const totalPages = Math.ceil(allTransactions.length / TRANSACTIONS_PER_PAGE);
  if (totalPages > 1) {
    message += `<i>${t('history.page_info', lang, [page + 1, totalPages])}</i>\n\n`;
  }

  // Группируем по дате
  const grouped = groupByDate(pageTransactions, lang, timezone);
  let txNumber = startIdx + 1;

  for (const [dateKey, txs] of Object.entries(grouped)) {
    // Подзаголовок даты
    message += `<b>📅 ${dateKey}</b>\n`;

    // Табличка транзакций в моноширинном шрифте
    // Важно: внутри <code>/<pre> лучше не вкладывать другие теги
    message += '<blockquote expandable>';

    txs.forEach((tx) => {
      // Тип транзакции — компактные стрелочки
      const typeEmoji = tx.type === 'deposit' ? '🔺' : '🔻';


      const category = categories.find((c) => c.id === tx.category_id);
      const subcategory = subcategories.find((s) => s.id === tx.subcategory_id);
      const account = accounts.find((a) => a.id === tx.account_id);

      const categoryEmoji = subcategory?.emoji
        ? subcategory.emoji
        : (category?.emoji
          ? category.emoji
          : getCategoryEmoji(category?.emoji));

      const rawCategoryName = subcategory
        ? subcategory.name
        : (category ? category.name : t('history.other', lang));
      const shortCategoryName = truncateLabel(rawCategoryName, 10);
      const categoryText = `${categoryEmoji} ${shortCategoryName}`;

      const rawAccountName = account ? account.name : t('history.account', lang);
      const shortAccountName = truncateLabel(rawAccountName, 10);
      const accountText = `📊 ${shortAccountName}`;

      // Номер в списке (2 знака, с ведущим нулём)
      const num = String(txNumber).padStart(2, '0');

      // Компактная сумма: 49 000 → 49K, 1 200 000 → 1.2M
      const compactAmount = formatCompactAmount(tx.amount);

      // Лаконичная строка: "01 🔻 🚌 Транспорт… · 📊 Основной… · 49K"
      const line =
        `${num} ${typeEmoji} ` + `${categoryText} · ` + `${accountText} · ` + `${compactAmount}`;

      message += line + '\n';
      txNumber++;
    });

    message += '</blockquote>\n';
  }

  // Хинт внизу
  message += `\n<i>${t('history.hint', lang)}</i>`;

  // Клавиатура для навигации
  const keyboard = buildHistoryKeyboard(startIdx, endIdx, allTransactions.length, page, lang);

  if (ctx.callbackQuery) {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      ...keyboard,
    });
  } else {
    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...keyboard,
    });
  }
}

function buildHistoryKeyboard(
  startIdx: number,
  endIdx: number,
  total: number,
  currentPage: number,
  lang: Language,
) {
  const buttons = [];

  // WebApp button at the top
  const webappUrl = process.env.WEBAPP_URL || 'https://ewallet-twa.whereismy.city';
  buttons.push([
    Markup.button.webApp('📱 Open in WebApp', `${webappUrl}/history`),
  ]);

  // Number buttons for current page transactions
  const numberRow = [];
  for (let i = startIdx; i < endIdx && i < total; i++) {
    numberRow.push(Markup.button.callback(`${i + 1}`, `history_view_${i}`));
  }
  if (numberRow.length > 0) {
    buttons.push(numberRow);
  }

  // Navigation buttons
  const navRow = [];
  if (currentPage > 0) {
    navRow.push(Markup.button.callback('◀️', `history_page_${currentPage - 1}`));
  }
  if (endIdx < total) {
    navRow.push(Markup.button.callback('▶️', `history_page_${currentPage + 1}`));
  }
  if (navRow.length > 0) {
    buttons.push(navRow);
  }

  // Close button instead of back to menu
  buttons.push([buildCloseButton(lang)]);

  return Markup.inlineKeyboard(buttons);
}

function groupByDate(
  transactions: Transaction[],
  lang: Language = 'ru',
  timezone?: string,
): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {};
  const locale = lang === 'uz' ? 'uz-UZ' : 'ru-RU';
  const now = convertToTimezone(new Date(), timezone);
  const todayKey = now.toISOString().slice(0, 10);

  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  transactions.forEach((tx) => {
    const txDate = convertToTimezone(tx.created_at, timezone);
    const txKey = txDate.toISOString().slice(0, 10);

    let key: string;
    if (txKey === todayKey) {
      key = t('history.today', lang);
    } else if (txKey === yesterdayKey) {
      key = t('history.yesterday', lang);
    } else {
      key = txDate.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(tx);
  });

  return groups;
}

// Pagination callback
export async function historyPageCallback(ctx: any) {
  const page = parseInt(ctx.match[1], 10);
  const userId = ctx.from.id;

  await ctx.answerCbQuery();

  const data = await stateManager.getData(userId);
  if (!data || !data.transactions) {
    await ctx.answerCbQuery('История устарела. Используйте /history');
    return;
  }

  // Calculate monthly totals from stored transactions
  let totalIncome = 0;
  let totalExpense = 0;
  data.transactions.forEach((tx: Transaction) => {
    if (tx.type === 'deposit') {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
    }
  });

  const user = await apiClient.getMe(ctx);
  const currencyCode = user.currency_code || 'USD';
  const lang = (user.language_code as Language) || 'ru';
  const timezone = user.timezone;

  // Update page in state
  await stateManager.updateData(userId, { currentPage: page });

  await sendHistoryPage(
    ctx,
    data.transactions,
    page,
    totalIncome,
    totalExpense,
    currencyCode,
    lang,
    timezone,
  );
}

// View transaction details callback
export async function historyViewCallback(ctx: any) {
  const txIndex = parseInt(ctx.match[1], 10);
  const userId = ctx.from.id;

  await ctx.answerCbQuery();

  const data = await stateManager.getData(userId);
  if (!data || !data.transactions) {
    await ctx.answerCbQuery(t('history.outdated', 'ru'));
    return;
  }

  const tx: Transaction | undefined = data.transactions[txIndex];
  if (!tx) {
    await ctx.answerCbQuery(t('history.not_found', 'ru'));
    return;
  }

  const categories = await apiClient.getCategories(ctx);
  const subcategories = await apiClient.getSubcategories(ctx);
  const accounts = await apiClient.getAccounts(ctx);
  const category = categories.find((c) => c.id === tx.category_id);
  const subcategory = subcategories.find((s) => s.id === tx.subcategory_id);
  const account = accounts.find((a) => a.id === tx.account_id);

  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;
  const timezone = user.timezone;
  const locale = lang === 'uz' ? 'uz-UZ' : 'ru-RU';

  const emoji = getTransactionEmoji(tx.type);
  const typeText = tx.type === 'deposit' ? t('history.income', lang) : t('history.expense', lang);
  const categoryText = subcategory
    ? `${subcategory.emoji || '📌'} ${escapeHtml(subcategory.name)}`
    : (category
      ? `${getCategoryEmoji(category.emoji)} ${escapeHtml(category.name)}`
      : `📌 ${t('history.other', lang)}`);
  const accountName = account ? escapeHtml(account.name) : t('history.unknown', lang);

  const num = String(txIndex + 1).padStart(2, '0');

  const dateStr = formatDateTime(tx.created_at, {
    timezone,
    locale,
    formatOptions: {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  });

  const formattedAmount = formatAmount(tx.amount, tx.currency_code || 'USD');

  let message = '';
  message += `<b>${t('history.details_title', lang, [num])}</b>\n\n`;
  message += `${emoji} <b>${t('history.type', lang)}:</b> ${typeText}\n`;
  message += `💰 <b>${t('history.amount', lang)}:</b> ${formattedAmount}\n`;
  // ✅ If conversion exists, show original + rate
  const hasFx =
    tx.original_amount !== undefined &&
    !!tx.original_currency_code &&
    tx.original_currency_code !== tx.currency_code;

  if (hasFx) {
    message += `💱 <b>Original</b>: ${formatAmount(tx.original_amount!, tx.original_currency_code!)} ${tx.original_currency_code}\n`;
    if (tx.fx_rate) {
      message += `📈 <b>FX</b>: ${formatFxRate(tx.fx_rate)} (${tx.original_currency_code} → ${tx.currency_code})\n`;
    }
  }
  message += `📁 <b>${t('history.category', lang)}:</b> ${categoryText}\n`;
  message += `📊 <b>${t('history.account', lang)}:</b> ${accountName}\n`;
  message += `📅 <b>${t('history.date', lang)}:</b> ${dateStr}\n`;

  if (tx.note) {
    message += `\n📝 <b>${t('history.note', lang)}:</b>\n`;
    message += `<code>${escapeHtml(tx.note)}</code>\n`;
  }

  message += `\n<i>${t('history.hint', lang)}</i>`;

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback(
          t('history.delete', lang),
          `history_delete_ask_${tx.id}_${data.currentPage || 0}`,
        ),
      ],
      [
        Markup.button.callback(
          t('history.back_to_history', lang),
          `history_back_${data.currentPage || 0}`,
        ),
      ],
    ]),
  });
}

export async function historyDeleteAskCallback(ctx: any) {
  const params = ctx.match[1].split('_');
  const txId = params[0];
  const page = params[1] || '0';
  const userId = ctx.from.id;

  const data = await stateManager.getData(userId);
  if (!data || !data.transactions) {
    await ctx.answerCbQuery(t('history.outdated', 'ru'));
    return;
  }

  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;

  await ctx.editMessageText(t('history.delete_confirm', lang), {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback(
          t('history.delete_yes', lang),
          `history_delete_confirm_${txId}_${page}`,
        ),
      ],
      [
        Markup.button.callback(
          t('history.delete_cancel', lang),
          `history_delete_cancel_${page}`, // Just back to history or back to tx view? Back to history is safer.
        ),
      ],
    ]),
  });
}

export async function historyDeleteConfirmCallback(ctx: any) {
  const params = ctx.match[1].split('_');
  const txId = params[0];
  const page = parseInt(params[1] || '0', 10);
  const userId = ctx.from.id;

  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;

  try {
    await apiClient.deleteTransaction(ctx, txId);
    await ctx.answerCbQuery(t('history.delete_success', lang));

    // Reload history
    await historyHandler(ctx);
  } catch (error) {
    console.error('Delete tx error:', error);
    await ctx.answerCbQuery(t('history.delete_error', lang));
    // Back to history page
    ctx.match = [null, page.toString()];
    await historyPageCallback(ctx);
  }
}

export async function historyDeleteCancelCallback(ctx: any) {
  const page = parseInt(ctx.match[1], 10);
  await ctx.answerCbQuery();
  // Return to history list
  ctx.match = [null, page.toString()];
  await historyPageCallback(ctx);
}

// Back to history callback
export async function historyBackCallback(ctx: any) {
  const page = parseInt(ctx.match[1], 10);

  await ctx.answerCbQuery();

  // просто меняем match на оригинальном контексте и переиспользуем колбэк
  ctx.match = [ctx.match[0], page.toString()];

  await historyPageCallback(ctx);
}
