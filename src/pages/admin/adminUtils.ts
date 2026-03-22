export function asDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === "function") return value.toDate();
    if (typeof value?.seconds === "number") return new Date(value.seconds * 1000);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(value: any): string {
    const date = asDate(value);
    if (!date) return "-";
    return date.toLocaleString();
}

export function safeName(user: any): string {
    return user?.name || user?.displayName || user?.email || user?.id || "Unknown";
}

export function chatOtherParticipant(chat: any, currentUserId: string): string {
    const participants = Array.isArray(chat?.participants) ? chat.participants : [];
    const other = participants.find((id: string) => id !== currentUserId) || participants[0];
    return other || "-";
}
