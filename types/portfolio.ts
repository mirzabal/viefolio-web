export interface ProjectLink {
  id?: string;
  type: string;
  url: string;
}

export interface TechStack {
  id?: string;
  technologyName: string;
}

export interface Checkpoint {
  id?: string;
  title: string;
  percentage: number;
  isCompleted: boolean;
  orderIndex: number;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: "RELEASED" | "IN_PROGRESS" | string;
  imageUrl: string;
  showImage: boolean;
  icon: string;
  projectType: "SOLO" | "TEAM" | "INTERNSHIP" | "ACADEMIC" | "FREELANCE" | "CLIENT" | "PERSONAL" | "OPEN_SOURCE" | "COMMISSION";
  startDate: string;
  endDate: string;
  links: ProjectLink[];
  techStack: TechStack[];
  checkpoints: Checkpoint[];
  userId?: string;
  orderIndex?: number;
  visible?: boolean;
}

export interface Skill {
  id?: string;
  name: string;
  level: number; // 1-100
  visible?: boolean;
}

/* ─── Social Links ──────────────────────────────────── */
export type SocialLinkType =
  | 'GITHUB' | 'LINKEDIN' | 'TWITTER' | 'YOUTUBE' | 'INSTAGRAM'
  | 'X' | 'FIGMA' | 'BEHANCE' | 'DRIBBBLE' | 'TIKTOK'
  | 'WEBSITE' | 'CUSTOM';

export interface SocialLink {
  id: string;
  type: SocialLinkType;
  title: string;
  url: string;
  imageUrl?: string;
  visible?: boolean;
}

export type SocialLinksLayout = 'ICONS' | 'CARD' | 'CREATOR';
export type UserInfoLayout = 'LEFT' | 'RIGHT' | 'CENTER';

/* ─── Account Type ──────────────────────────────────── */
export type AccountType = 'DEVELOPER' | 'DESIGNER' | 'CREATOR' | 'STUDENT';

/* ─── Theme Engine ──────────────────────────────────── */
/* SOFT was a lavender pastel from the old template — it has no home in the
   butter/ink palette, so it's gone. Stored 'SOFT' profiles migrate to MINIMAL
   on load (see the dashboard profile listener). */
export type ThemePreset = 'MINIMAL' | 'NEON' | 'GLASSMORPHISM' | 'BRUTALIST' | 'MONOCHROME';
export type ThemeTexture = 'NONE' | 'DOTS' | 'GRID' | 'NOISE';
export type ThemeFont = 'SANS' | 'SERIF' | 'MONO' | 'DISPLAY';
export type CardStyle = 'FLAT' | 'GLASSMORPHIC' | 'SOFT_SHADOW' | 'BRUTALIST';
export type ButtonStyle = 'PILL' | 'ROUNDED' | 'SHARP' | 'GHOST';

export interface ThemeColors {
  background: string;
  card: string;
  accent: string;
  text: string;
  descriptionColor: string;
}

export interface Theme {
  preset: ThemePreset;
  colors: ThemeColors;
  texture: ThemeTexture;
  fontFamily?: ThemeFont;
  cardStyle?: CardStyle;
  buttonStyle?: ButtonStyle;
}

/* The accent every legacy profile falls back to. Was indigo #6366f1. */
export const DEFAULT_ACCENT = '#013e37';

export const DEFAULT_THEME: Theme = {
  preset: 'MINIMAL',
  colors: { background: '#fdfbf3', card: '#fffefa', accent: DEFAULT_ACCENT, text: '#013e37', descriptionColor: '#48706a' },
  texture: 'NONE',
  fontFamily: 'SANS',
  cardStyle: 'FLAT',
  buttonStyle: 'ROUNDED',
};

/* A preset is the whole look, not just the colors — picking one sets the font,
   card treatment, button shape and texture too. Each field stays individually
   editable afterwards; the preset is a starting point, not a lock. */
export interface ThemePresetSpec {
  colors: ThemeColors;
  texture: ThemeTexture;
  fontFamily: ThemeFont;
  cardStyle: CardStyle;
  buttonStyle: ButtonStyle;
}

export const THEME_PRESETS: Record<ThemePreset, ThemePresetSpec> = {
  MINIMAL: {
    colors: { background: '#fdfbf3', card: '#fffefa', accent: '#013e37', text: '#013e37', descriptionColor: '#48706a' },
    texture: 'NONE',
    fontFamily: 'SANS',
    cardStyle: 'FLAT',
    buttonStyle: 'ROUNDED',
  },
  NEON: {
    colors: { background: '#0a0a0a', card: '#141414', accent: '#22d3ee', text: '#f0f0f0', descriptionColor: '#94a3b8' },
    texture: 'DOTS',
    fontFamily: 'MONO',
    cardStyle: 'SOFT_SHADOW',
    buttonStyle: 'SHARP',
  },
  GLASSMORPHISM: {
    colors: { background: '#012b26', card: 'rgba(255,239,179,0.07)', accent: '#ffefb3', text: '#fdfbf3', descriptionColor: '#c2b78b' },
    texture: 'NONE',
    fontFamily: 'SERIF',
    cardStyle: 'GLASSMORPHIC',
    buttonStyle: 'PILL',
  },
  /* Brutalist gets the loudest pairing the palette allows: butter ground, pure
     black type, ink accent — hard edges, no softening anywhere. */
  BRUTALIST: {
    colors: { background: '#ffefb3', card: '#fffefa', accent: '#013e37', text: '#000000', descriptionColor: '#3d3d3d' },
    texture: 'GRID',
    fontFamily: 'DISPLAY',
    cardStyle: 'BRUTALIST',
    buttonStyle: 'SHARP',
  },
  MONOCHROME: {
    colors: { background: '#f8f8f8', card: '#ffffff', accent: '#374151', text: '#111827', descriptionColor: '#6b7280' },
    texture: 'NOISE',
    fontFamily: 'MONO',
    cardStyle: 'FLAT',
    buttonStyle: 'GHOST',
  },
};

export interface Profile {
  fullName: string;
  title: string;
  bio: string;
  location: string;
  username: string;
  avatarUrl: string;
  showAvatar: boolean;
  theme: Theme;
  socialLinks: SocialLink[];
  socialLinksLayout: SocialLinksLayout;
  userInfoLayout: UserInfoLayout;
  showLinks?: boolean;
  showProjects?: boolean;
  showSkills?: boolean;
  portfolioVisibility: "ALL" | "RELEASED_ONLY";
  layoutStyle: "CLASSIC" | "MINIMAL" | "CAROUSEL" | "TIMELINE";
  skills: Skill[];
  userId?: string;
  accountType?: AccountType;
  /** False only while a password sign-up hasn't clicked its verification link. */
  emailVerified?: boolean;
}
