/**
 * Unified icon set (drop-in replacement for @expo/vector-icons).
 * Matching action icons use the user's exact bundled uploads; remaining
 * symbols keep the existing Lucide line-icon treatment.
 *
 * The whole app used to import { Ionicons, MaterialCommunityIcons } from
 * "@expo/vector-icons". To give the product a single, consistent, modern
 * outline-icon look (matching the reference sheet), every one of those imports
 * now points here instead. We keep the EXACT same API — a component that takes
 * `name` / `size` / `color` / `style` — but render the icon using the Lucide
 * open-source line-icon set (ISC licensed, SVG based, no font files needed).
 *
 * Because we preserve the `name="..."` string API, all 800+ static AND dynamic
 * usages across the app keep working unchanged. A name→component map translates
 * the legacy Ionicons / MaterialCommunityIcons names into Lucide components.
 * Any "-outline" / "-sharp" suffix is stripped automatically (Lucide has a
 * single outline style). Unknown names fall back to a neutral circle.
 */

import React from "react";
import type { ColorValue, StyleProp, TextStyle } from "react-native";
import {
  Activity,
  AlertCircle,
  AlignJustify,
  Calculator,
  Hand,
  Library,
  Locate,
  Moon,
  Copy,
  Gamepad2,
  MapPin,
  Palette,
  Smartphone,
  Type,
  Wallet,
  Anchor,
  Apple,
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Award,
  Baby,
  Backpack,
  Ban,
  Banknote,
  BarChart3,
  Bell,
  BellOff,
  Bitcoin,
  Bluetooth,
  Book,
  BookOpen,
  Bookmark,
  Box,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCheck,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Clapperboard,
  Clipboard,
  ClipboardList,
  Clock,
  Cloud,
  CloudOff,
  Code,
  Coffee,
  Coins,
  Compass,
  Contact,
  CornerDownRight,
  Cpu,
  CreditCard,
  Crop,
  Crown,
  Database,
  Delete,
  Dices,
  DollarSign,
  Download,
  Droplet,
  Dumbbell,
  Edit,
  Expand,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Film,
  Filter,
  Flag,
  Flame,
  FlaskConical,
  Flower2,
  Footprints,
  Gem,
  Gift,
  GitBranch,
  Globe,
  GraduationCap,
  Grid3x3,
  Headphones,
  Heart,
  HeartCrack,
  HeartHandshake,
  HelpCircle,
  Home,
  Hourglass,
  Image,
  Images,
  Infinity,
  Info,
  Key,
  Languages,
  Layers,
  Layout,
  LayoutGrid,
  Leaf,
  Lightbulb,
  LineChart,
  Link,
  List,
  ListChecks,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Mars,
  Maximize2,
  Medal,
  Megaphone,
  Menu,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Minus,
  MinusCircle,
  MoreHorizontal,
  MoreVertical,
  Music,
  Newspaper,
  PawPrint,
  Pause,
  Pencil,
  Phone,
  PersonStanding,
  PieChart,
  Pill,
  Pin,
  Play,
  PlayCircle,
  Plane,
  Plus,
  PlusCircle,
  Podcast,
  Power,
  Presentation,
  Puzzle,
  QrCode,
  Radio,
  Receipt,
  Redo2,
  RefreshCw,
  Rocket,
  RotateCw,
  Scan,
  ScanFace,
  ScanLine,
  Search,
  Server,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Shrink,
  Shuffle,
  SkipForward,
  SlidersHorizontal,
  Smile,
  Snowflake,
  Sparkles,
  Sprout,
  Star,
  Stethoscope,
  Sticker,
  StopCircle,
  Store,
  Sun,
  Sunrise,
  Tag,
  Tags,
  Telescope,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Transgender,
  Trash2,
  TrendingUp,
  Trophy,
  Tv,
  Undo2,
  Unlock,
  User,
  UserCircle,
  UserMinus,
  UserPlus,
  Users,
  Utensils,
  Venus,
  Video,
  VideoOff,
  Volume1,
  Volume2,
  VolumeX,
  WandSparkles,
  Waves,
  Wifi,
  Wind,
  X,
  XCircle,
  Zap,
} from "lucide-react-native";

import { MicGlyph, MicOffGlyph } from "@/src/ui/MicGlyph";
import { SendGlyph } from "@/src/ui/SendGlyph";
import { resolveUploadedAction, UploadedActionIcon } from "@/src/ui/UploadedActionIcon";
import { FilterGlyph } from "@/src/ui/FilterGlyph";
import { genderColors } from "@/src/theme";

type LucideCmp = React.ComponentType<{
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
  fill?: ColorValue;
  testID?: string;
  accessibilityLabel?: string;
  // Lucide types style as ViewStyle while our legacy icon API used TextStyle;
  // both work at runtime (props land on an <Svg>), so keep it loose here.
  style?: any;
}>;

// Legacy icon name (Ionicons + MaterialCommunityIcons vocab) → Lucide component.
// Keys are the *base* name; a trailing "-outline" / "-sharp" is stripped before
// lookup, so "heart" and "heart-outline" both resolve to Heart.
const MAP: Record<string, LucideCmp> = {
  "hand-left": Hand,
  "hand-right": Hand,
  hand: Hand,
  calculator: Calculator,
  library: Library,
  locate: Locate,
  "location-crosshairs": Locate,
  // ── Add / remove / check / close ──────────────────────────────
  add: Plus,
  "add-circle": PlusCircle,
  remove: Minus,
  "remove-circle": MinusCircle,
  close: X,
  "close-circle": XCircle,
  checkmark: Check,
  check: Check,
  "checkmark-circle": CheckCircle,
  "check-circle": CheckCircle,
  "checkmark-done": CheckCheck,
  "checkmark-done-circle": CheckCircle,
  ban: Ban,

  // ── Chevrons / arrows / nav ───────────────────────────────────
  "chevron-back": ChevronLeft,
  "chevron-forward": ChevronRight,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "chevron-up": ChevronUp,
  "chevron-down": ChevronDown,
  "arrow-back": ArrowLeft,
  "arrow-forward": ArrowRight,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
  "arrow-up-bold": ArrowUp,
  "arrow-down-bold": ArrowDown,
  "arrow-redo": Redo2,
  "arrow-undo": Undo2,
  "arrow-collapse": Shrink,
  "return-down-forward": CornerDownRight,
  "return-up-back": CornerDownRight,
  "swap-horizontal": ArrowLeftRight,
  "swap-vertical": ArrowUpDown,
  "sort-variant": ArrowUpDown,
  "order-bool-ascending-variant": ArrowUpDown,
  expand: Expand,
  viewport: Maximize2,
  contract: Shrink,
  ellipsis: MoreHorizontal,
  "ellipsis-horizontal": MoreHorizontal,
  "ellipsis-vertical": MoreVertical,
  "reorder-three": Menu,
  "reorder-four": AlignJustify,
  menu: Menu,

  // ── Refresh / sync / shuffle ──────────────────────────────────
  refresh: RefreshCw,
  "refresh-circle": RefreshCw,
  sync: RotateCw,
  reload: RotateCw,
  shuffle: Shuffle,

  // ── Communication ─────────────────────────────────────────────
  chatbubble: MessageCircle,
  "chatbubble-ellipses": MessageCircle,
  chatbox: MessageSquare,
  "chatbox-ellipses": MessageSquare,
  chatbubbles: MessagesSquare,
  chat: MessageCircle,
  "chat-outline": MessageCircle,
  "chat-processing": MessageCircle,
  mail: Mail,
  "mail-unread": Mail,
  call: Phone,
  "call-outline": Phone,
  megaphone: Megaphone,
  bullhorn: Megaphone,
  notifications: Bell,
  "notifications-off": BellOff,
  bell: Bell,
  "bell-off": BellOff,

  // ── Media / controls ──────────────────────────────────────────
  play: Play,
  "play-circle": PlayCircle,
  "play-box": PlayCircle,
  "play-skip-forward": SkipForward,
  pause: Pause,
  "pause-circle": Pause,
  stop: StopCircle,
  "stop-circle": StopCircle,
  "volume-high": Volume2,
  "volume-medium": Volume2,
  "volume-low": Volume1,
  "volume-mute": VolumeX,
  "volume-off": VolumeX,
  // Voice/mic marks use the app's own signature microphone glyph (see
  // src/ui/MicGlyph.tsx) so the navbar Voice tab and every in-app mic button
  // show the exact same icon.
  mic: MicGlyph,
  "mic-off": MicOffGlyph,
  microphone: MicGlyph,
  "microphone-off": MicOffGlyph,
  "keyboard-voice": MicGlyph,
  "record-voice-over": MicGlyph,
  "musical-notes": Music,
  "music-note": Music,
  headset: Headphones,
  headphones: Headphones,
  radio: Radio,
  "radio-button-on": Circle,
  "radio-button-off": Circle,
  videocam: Video,
  "videocam-off": VideoOff,
  video: Video,
  camera: Camera,
  image: Image,
  images: Images,
  albums: Images,
  film: Film,
  movie: Clapperboard,
  "television-classic": Tv,
  tv: Tv,
  podcast: Podcast,
  voice: MicGlyph,

  // ── People ────────────────────────────────────────────────────
  person: User,
  "person-circle": UserCircle,
  "person-add": UserPlus,
  "person-remove": UserMinus,
  people: Users,
  account: User,
  "account-outline": User,
  "account-box": Contact,
  "account-group": Users,
  "account-multiple-plus": UserPlus,
  "account-multiple": Users,
  contact: Contact,
  "human-greeting-variant": PersonStanding,
  human: PersonStanding,
  "body-outline": PersonStanding,
  body: PersonStanding,
  baby: Baby,
  male: Mars,
  female: Venus,
  "male-female": Transgender,
  "gender-transgender": Transgender,

  // ── Content / documents / lists ───────────────────────────────
  book: Book,
  "book-open": BookOpen,
  "book-open-page-variant": BookOpen,
  bookshelf: Book,
  "document-text": FileText,
  document: FileText,
  "text-box": FileText,
  reader: FileText,
  newspaper: Newspaper,
  copy: Copy,
  duplicate: Copy,
  clipboard: Clipboard,
  "clipboard-text-clock": ClipboardList,
  "list-outline": List,
  list: List,
  "format-list-bulleted": List,
  "format-list-checks": ListChecks,
  "reorder-list": List,
  bookmark: Bookmark,
  layers: Layers,
  server: Server,
  database: Database,
  "hardware-chip": Cpu,
  chip: Cpu,
  cube: Box,
  "card-multiple": Layers,

  // ── Edit / tools ──────────────────────────────────────────────
  create: Edit,
  pencil: Pencil,
  crop: Crop,
  text: Type,
  code: Code,
  "code-slash": Code,
  "code-tags": Code,
  "git-branch": GitBranch,
  "source-branch": GitBranch,
  trash: Trash2,
  backspace: Delete,
  "color-palette": Palette,
  palette: Palette,

  // ── Commerce ──────────────────────────────────────────────────
  bag: ShoppingBag,
  "bag-handle": ShoppingBag,
  "bag-add": ShoppingBag,
  "bag-personal": Backpack,
  cart: ShoppingCart,
  storefront: Store,
  store: Store,
  shop: Store,
  card: CreditCard,
  "credit-card": CreditCard,
  cash: Banknote,
  "cash-multiple": Banknote,
  wallet: Wallet,
  receipt: Receipt,
  pricetag: Tag,
  pricetags: Tags,
  tag: Tag,
  gift: Gift,
  diamond: Gem,
  gem: Gem,
  "logo-bitcoin": Bitcoin,
  bitcoin: Bitcoin,
  coins: Coins,
  cash_: DollarSign,

  // ── Symbols / gamification ────────────────────────────────────
  heart: Heart,
  "heart-dislike": HeartCrack,
  "heart-circle": Heart,
  "heart-handshake": HeartHandshake,
  star: Star,
  "star-half": Star,
  "star-four-points": Sparkles,
  crown: Crown,
  trophy: Trophy,
  ribbon: Award,
  award: Award,
  medal: Medal,
  podium: BarChart3,
  leaderboard: BarChart3,
  flame: Flame,
  fire: Flame,
  rocket: Rocket,
  sparkles: Sparkles,
  flash: Zap,
  bolt: Zap,
  bulb: Lightbulb,
  "thumbs-up": ThumbsUp,
  "thumbs-down": ThumbsDown,
  "thumb-up": ThumbsUp,
  "thumb-down": ThumbsDown,
  puzzle: Puzzle,
  "extension-puzzle": Puzzle,
  infinite: Infinity,
  happy: Smile,
  "emoticon-happy": Smile,
  emoticon: Smile,
  "sticker-emoji": Sticker,
  sticker: Sticker,

  // ── Places / world / nature ───────────────────────────────────
  earth: Globe,
  globe: Globe,
  planet: Globe,
  language: Languages,
  translate: Languages,
  location: MapPin,
  "location-outline": MapPin,
  pin: Pin,
  flag: Flag,
  compass: Compass,
  telescope: Telescope,
  navigate: Compass,
  home: Home,
  business: Building2,
  school: GraduationCap,
  briefcase: Briefcase,
  cafe: Coffee,
  restaurant: Utensils,
  "silverware-fork-knife": Utensils,
  nutrition: Apple,
  "food-apple": Apple,
  leaf: Leaf,
  flower: Flower2,
  sprout: Sprout,
  snow: Snowflake,
  water: Droplet,
  waves: Waves,
  wind: Wind,
  sunny: Sun,
  "sunny-outline": Sun,
  "white-balance-sunny": Sun,
  sunrise: Sunrise,
  moon: Moon,
  "weather-night": Moon,
  cloud: Cloud,
  "cloud-offline": CloudOff,
  wifi: Wifi,
  bluetooth: Bluetooth,
  airplane: Plane,
  football: Dumbbell,
  soccer: Dumbbell,
  footsteps: Footprints,
  "paw-print": PawPrint,
  paw: PawPrint,
  telescope_: Telescope,
  anchor: Anchor,

  // ── Health / science ──────────────────────────────────────────
  medical: Stethoscope,
  "medical-bag": Stethoscope,
  medkit: Pill,
  pill: Pill,
  flask: FlaskConical,
  shirt: Shirt,
  "tshirt-crew": Shirt,

  // ── Time / charts ─────────────────────────────────────────────
  time: Clock,
  clock: Clock,
  timer: Timer,
  hourglass: Hourglass,
  calendar: Calendar,
  "calendar-clear": Calendar,
  "bar-chart": BarChart3,
  "chart-bar": BarChart3,
  "stats-chart": BarChart3,
  "pie-chart": PieChart,
  "line-chart": LineChart,
  "trending-up": TrendingUp,
  analytics: Activity,
  progress: Activity,

  // ── Settings / search / grid / security ───────────────────────
  settings: Settings,
  cog: Settings,
  options: SlidersHorizontal,
  "tune-variant": SlidersHorizontal,
  "tune-vertical": SlidersHorizontal,
  filter: Filter,
  funnel: Filter,
  search: Search,
  magnify: Search,
  "magnify-scan": Scan,
  scan: Scan,
  "scan-outline": ScanLine,
  "qrcode-scan": QrCode,
  "qr-code": QrCode,
  "scan-face": ScanFace,
  grid: LayoutGrid,
  "grid-outline": LayoutGrid,
  apps: Grid3x3,
  layout: Layout,
  easel: Presentation,
  presentation: Presentation,
  lock: Lock,
  "lock-closed": Lock,
  "lock-open": Unlock,
  unlock: Unlock,
  shield: Shield,
  "shield-checkmark": ShieldCheck,
  "shield-check": ShieldCheck,
  key: Key,
  "log-in": LogIn,
  "log-out": LogOut,
  exit: LogOut,
  enter: LogIn,
  power: Power,
  eye: Eye,
  "eye-off": EyeOff,
  download: Download,
  upload: Download,
  "share-outline": Share2,
  "share-social": Share2,
  share: Share2,
  link: Link,
  "open-outline": ExternalLink,
  "phone-portrait": Smartphone,
  dice: Dices,
  "game-controller": Gamepad2,
  wand: WandSparkles,
  ellipse: Circle,
  "alert-circle": AlertCircle,
  warning: AlertCircle,
  "information-circle": Info,
  information: Info,
  "help-circle": HelpCircle,
  help: HelpCircle,
  "backspace-outline": Delete,
};

// Names whose *solid* (non-outline) form should render filled, so that
// active/selected states (e.g. a liked heart, a filled star) still read
// clearly the way they did with the original filled Ionicons.
const FILL_ON_SOLID = new Set([
  "heart",
  "star",
  "bookmark",
  "ellipse",
  "radio-button-on",
  "flag",
  "pin",
  "circle",
  "flame",
  "fire",
]);

// Glyphs that are pure open polylines (arrows, chevrons, check marks, code
// brackets, trend lines…). Area-filling these produces ugly "lens" shapes, so
// they are excluded from the duotone treatment and stay stroke-only.
const NO_DUOTONE = new Set([
  "add",
  "remove",
  "close",
  "checkmark",
  "check",
  "checkmark-done",
  "chevron-back",
  "chevron-forward",
  "chevron-left",
  "chevron-right",
  "chevron-up",
  "chevron-down",
  "arrow-back",
  "arrow-forward",
  "arrow-up",
  "arrow-down",
  "arrow-up-bold",
  "arrow-down-bold",
  "arrow-redo",
  "arrow-undo",
  "arrow-collapse",
  "return-down-forward",
  "return-up-back",
  "swap-horizontal",
  "swap-vertical",
  "sort-variant",
  "order-bool-ascending-variant",
  "expand",
  "viewport",
  "contract",
  "menu",
  "reorder-three",
  "reorder-four",
  "refresh",
  "refresh-circle",
  "sync",
  "reload",
  "shuffle",
  "trending-up",
  "line-chart",
  "analytics",
  "progress",
  "options",
  "tune-variant",
  "tune-vertical",
  "text",
  "code",
  "code-slash",
  "code-tags",
  "git-branch",
  "source-branch",
]);

// Soft interior tint (~15% of the stroke colour) that gives every icon the
// signature "duotone" brand look. Only hex colours can be tinted reliably;
// anything else (named colours, rgba strings) simply skips the tint.
function duotoneTint(color: ColorValue): string | null {
  if (typeof color !== "string") return null;
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return `${color}26`;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const [, r, g, b] = color;
    return `#${r}${r}${g}${g}${b}${b}26`;
  }
  return null;
}

function resolve(name?: string | null): LucideCmp {
  if (!name) return HelpCircle;
  if (MAP[name]) return MAP[name];
  const base = name.replace(/-(outline|sharp)$/i, "");
  if (MAP[base]) return MAP[base];
  return HelpCircle;
}

export interface IconProps {
  name?: string;
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
  style?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

function createFamily() {
  const Family = ({
    name,
    size = 22,
    color = "#111827",
    strokeWidth,
    style,
    testID,
    accessibilityLabel,
  }: IconProps) => {
    const filterName = (name || "").replace(/-(outline|sharp)$/i, "");
    if (filterName === "send" || filterName === "paper-plane") {
      return <SendGlyph size={size} color={color} style={style} testID={testID} accessibilityLabel={accessibilityLabel} />;
    }
    if (filterName === "male") color = genderColors.male;
    if (filterName === "female") color = genderColors.female;
    if (["options", "filter", "funnel", "tune", "tune-variant", "tune-vertical"].includes(filterName)) {
      return <FilterGlyph size={size} color={color} style={style} testID={testID} accessibilityLabel={accessibilityLabel} />;
    }
    const artwork = resolveUploadedAction(name);
    if (artwork) {
      return (
        <UploadedActionIcon
          artwork={artwork}
          size={size}
          color={color}
          style={style}
          testID={testID}
          accessibilityLabel={accessibilityLabel}
        />
      );
    }
    const Cmp = resolve(name);
    const isOutline = !!name && /-(outline|sharp)$/i.test(name);
    const base = (name || "").replace(/-(outline|sharp)$/i, "");
    const filled = !isOutline && FILL_ON_SOLID.has(base);
    const tint = !filled && !NO_DUOTONE.has(base) ? duotoneTint(color) : null;
    return (
      <Cmp
        size={size}
        color={color}
        strokeWidth={strokeWidth ?? (isOutline ? 1.9 : 2.1)}
        fill={filled ? color : tint ?? "none"}
        style={style}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
      />
    );
  };
  // Preserve the `.glyphMap` shape so existing `keyof typeof Icon.glyphMap`
  // type annotations across the app continue to type-check (accepts any string).
  (Family as unknown as { glyphMap: Record<string, number> }).glyphMap =
    {} as Record<string, number>;
  return Family as React.FC<IconProps> & { glyphMap: Record<string, number> };
}

export const Ionicons = createFamily();
export const MaterialCommunityIcons = createFamily();

export default { Ionicons, MaterialCommunityIcons };
