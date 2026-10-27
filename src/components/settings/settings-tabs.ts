// The settings dialog's tabs and why it opens on its own, apart from the dialog so state modules can use them.
export type SettingsTab = 'about' | 'connection' | 'sharing' | 'agents' | 'documentation' | 'get-started';

export interface ForceOpenReason {
    tab: SettingsTab;
    message: string;
    id: string; // Unique identifier for the reason
}

export const NO_CONNECTION_FORCE_OPEN_REASON: ForceOpenReason = {
    tab: 'connection',
    message: 'No database connection available. Please configure a connection.',
    id: 'no-connection'
}
