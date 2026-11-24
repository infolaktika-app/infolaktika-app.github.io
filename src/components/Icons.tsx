/* Minimal stroke icon set (24×24, currentColor). */
type P = { className?: string };
const S = ({ className = 'h-5 w-5', children }: P & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    {children}
  </svg>
);

export const IHome = (p: P) => <S {...p}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></S>;
export const IComic = (p: P) => <S {...p}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 12h9M12 3v18M12 15h9" /></S>;
export const IGame = (p: P) => <S {...p}><path d="M6 9h4M8 7v4M15 10h.01M18 12h.01" /><path d="M7 5h10a5 5 0 0 1 5 5l-.6 5.4A3 3 0 0 1 16.4 17l-1.4-2H9l-1.4 2a3 3 0 0 1-5-1.6L2 10a5 5 0 0 1 5-5z" /></S>;
export const IBook = (p: P) => <S {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></S>;
export const IAward = (p: P) => <S {...p}><circle cx="12" cy="9" r="6" /><path d="M8.5 14 7 22l5-3 5 3-1.5-8" /></S>;
export const ITrophy = (p: P) => <S {...p}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" /></S>;
export const IUser = (p: P) => <S {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></S>;
export const IUsers = (p: P) => <S {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 9M22 21a7 7 0 0 0-4-6.3" /></S>;
export const IBell = (p: P) => <S {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10.3 21a1.9 1.9 0 0 0 3.4 0" /></S>;
export const ILogout = (p: P) => <S {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></S>;
export const ISearch = (p: P) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></S>;
export const IMenu = (p: P) => <S {...p}><path d="M4 6h16M4 12h16M4 18h10" /></S>;
export const IX = (p: P) => <S {...p}><path d="M18 6 6 18M6 6l12 12" /></S>;
export const IChevL = (p: P) => <S {...p}><path d="m15 18-6-6 6-6" /></S>;
export const IChevR = (p: P) => <S {...p}><path d="m9 18 6-6-6-6" /></S>;
export const IZoomIn = (p: P) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M11 8v6M8 11h6" /></S>;
export const IZoomOut = (p: P) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M8 11h6" /></S>;
export const IExpand = (p: P) => <S {...p}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></S>;
export const IShrink = (p: P) => <S {...p}><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /></S>;
export const IPlus = (p: P) => <S {...p}><path d="M12 5v14M5 12h14" /></S>;
export const IEdit = (p: P) => <S {...p}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></S>;
export const ITrash = (p: P) => <S {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></S>;
export const IEye = (p: P) => <S {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></S>;
export const IUpload = (p: P) => <S {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></S>;
export const IChart = (p: P) => <S {...p}><path d="M3 3v18h18M7 15l4-4 3 3 5-6" /></S>;
export const IGrid = (p: P) => <S {...p}><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></S>;
export const ISettings = (p: P) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></S>;
export const IFlame = (p: P) => <S {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.3.3 1.5 1.2 2.8 2.5 2.8z" /></S>;
export const IZap = (p: P) => <S {...p}><path d="M13 2 3 14h9l-1 8 10-12h-9z" /></S>;
export const ICheck = (p: P) => <S {...p}><path d="M20 6 9 17l-5-5" /></S>;
export const IClock = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>;
export const IPlay = (p: P) => <S {...p}><path d="M7 4v16l13-8z" /></S>;
export const IRefresh = (p: P) => <S {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" /></S>;
export const ILock = (p: P) => <S {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></S>;
export const ITarget = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></S>;
export const IArrowR = (p: P) => <S {...p}><path d="M5 12h14M13 6l6 6-6 6" /></S>;
export const IShield = (p: P) => <S {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></S>;
export const IClipboard = (p: P) => <S {...p}><rect x="5" y="4" width="14" height="18" rx="2" /><path d="M9 4V3h6v1M9 11h6M9 15h4" /><path d="M9 2.5h6a1 1 0 0 1 1 1V5H8V3.5a1 1 0 0 1 1-1z" /></S>;
export const IFile = (p: P) => <S {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></S>;
export const IUserPlus = (p: P) => <S {...p}><circle cx="10" cy="8" r="4" /><path d="M3 21a7 7 0 0 1 14 0M19 8v6M16 11h6" /></S>;
export const ICopy = (p: P) => <S {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></S>;
export const IPhone = (p: P) => <S {...p}><path d="M5 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 12l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 5a2 2 0 0 1 2-2z" /></S>;
export const ICamera = (p: P) => <S {...p}><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" /></S>;
export const IDownload = (p: P) => <S {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></S>;
export const IMore = (p: P) => <S {...p}><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></S>;
export const ISparkle = (p: P) => <S {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></S>;
export const IBulb = (p: P) => <S {...p}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2.2h5c.1-1 .5-1.7 1.1-2.2A6 6 0 0 0 12 3z" /></S>;
