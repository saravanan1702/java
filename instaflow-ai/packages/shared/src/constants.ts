export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Conversation languages the product supports.
 * TA_LATN = Tamil written in Latin script ("Tanglish"), BCP-47: ta-Latn.
 */
export const WORKSPACE_LANGUAGES = ['EN', 'TA', 'TA_LATN'] as const;
export type WorkspaceLanguage = (typeof WORKSPACE_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<WorkspaceLanguage, string> = {
  EN: 'English',
  TA: 'Tamil (தமிழ்)',
  TA_LATN: 'Tanglish (Tamil in English letters)',
};

export const WORKSPACE_PLANS = ['FREE', 'PRO', 'BUSINESS'] as const;
export type WorkspacePlan = (typeof WORKSPACE_PLANS)[number];

export const INVITATION_TTL_DAYS = 7;
