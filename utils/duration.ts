export const formatDuration = (seconds: number | null | undefined) => {
    const total = Number.isFinite(seconds) && (seconds as number) > 0 ? Math.floor(seconds as number) : 0;
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};
