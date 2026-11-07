// One lazy chunk per lesson, answer keys apart from the questions. Empty until the business practices are added.
export const QUESTION_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {};

export const KEY_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {};
