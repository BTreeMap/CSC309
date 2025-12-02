/**
 * Icon Utility - Centralized Lucide React Icons
 * 
 * This module provides a consistent icon set using Lucide React.
 * All icons are exported as React components for easy usage.
 * 
 * Usage:
 *   import { Icons } from '../utils/icons';
 *   <Icons.Dashboard size={20} />
 */

import {
  // Navigation & Layout
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  
  // User & Account
  User,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  CircleUser,
  
  // Authentication & Security
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Key,
  LogIn,
  LogOut,
  
  // Actions
  Plus,
  PlusCircle,
  Minus,
  MinusCircle,
  Check,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Search,
  Filter,
  Settings,
  MoreHorizontal,
  MoreVertical,
  Eye,
  EyeOff,
  
  // Communication
  Send,
  Mail,
  MessageSquare,
  Bell,
  BellRing,
  
  // Commerce & Finance
  CreditCard,
  Coins,
  Wallet,
  Receipt,
  ShoppingCart,
  ShoppingBag,
  Tag,
  Tags,
  Gift,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  
  // Time & Calendar
  Calendar,
  CalendarDays,
  CalendarCog,
  Clock,
  Timer,
  History,
  
  // Status & Feedback
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  CheckCircle as SuccessCircle,
  XCircle as ErrorCircle,
  Loader2,
  
  // Content & Documents
  FileText,
  ClipboardList,
  ClipboardCheck,
  List,
  ListOrdered,
  
  // Technology
  QrCode,
  Camera,
  Smartphone,
  Monitor,
  
  // Arrows & Direction
  ArrowLeftRight,
  ArrowUpDown,
  MoveRight,
  
  // Misc
  Star,
  Heart,
  Bookmark,
  Flag,
  MapPin,
  Building2,
  Flame,
  Zap,
  Award,
  BadgeCheck,
  CircleDot,
} from 'lucide-react';

// Default icon size
export const DEFAULT_ICON_SIZE = 18;

// Icon component mapping for easy lookup
export const Icons = {
  // Navigation & Layout
  Dashboard: LayoutDashboard,
  Menu,
  Close: X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  ExternalLink,
  
  // User & Account
  User,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Profile: CircleUser,
  
  // Authentication & Security
  Lock,
  Unlock,
  Shield: ShieldCheck,
  ShieldAlert,
  Key,
  Login: LogIn,
  Logout: LogOut,
  
  // Actions
  Plus,
  PlusCircle,
  Minus,
  MinusCircle,
  Check,
  CheckCircle,
  CheckCircle2,
  Cancel: XCircle,
  Edit: Pencil,
  Delete: Trash2,
  Copy,
  Download,
  Upload,
  Refresh: RefreshCw,
  Search,
  Filter,
  Settings,
  MoreHorizontal,
  MoreVertical,
  View: Eye,
  Hide: EyeOff,
  
  // Communication
  Send,
  Email: Mail,
  Message: MessageSquare,
  Notification: Bell,
  NotificationActive: BellRing,
  
  // Commerce & Finance
  CreditCard,
  Transaction: CreditCard,
  Coins,
  Points: Coins,
  Wallet,
  Receipt,
  Cart: ShoppingCart,
  Bag: ShoppingBag,
  Tag,
  Tags,
  Gift,
  Redeem: Gift,
  Target,
  Promotion: Target,
  TrendingUp,
  TrendingDown,
  BarChart: BarChart3,
  PieChart,
  
  // Time & Calendar
  Calendar,
  CalendarDays,
  CalendarManage: CalendarCog,
  Clock,
  Timer,
  History,
  
  // Status & Feedback
  Alert: AlertCircle,
  Warning: AlertTriangle,
  Info,
  Help: HelpCircle,
  Success: SuccessCircle,
  Error: ErrorCircle,
  Loading: Loader2,
  
  // Content & Documents
  Document: FileText,
  Clipboard: ClipboardList,
  ClipboardCheck,
  List,
  ListOrdered,
  
  // Technology
  QrCode,
  Camera,
  Smartphone,
  Monitor,
  
  // Misc
  Star,
  Heart,
  Bookmark,
  Flag,
  Location: MapPin,
  Building: Building2,
  Fire: Flame,
  Zap,
  Award,
  Verified: BadgeCheck,
  Dot: CircleDot,
};

// Transaction type icons
export const TransactionIcons = {
  purchase: ShoppingCart,
  redemption: Gift,
  adjustment: Settings,
  transfer: ArrowLeftRight,
  event: Calendar,
};

// Status icons
export const StatusIcons = {
  active: Flame,
  upcoming: Clock,
  ended: CheckCircle,
  pending: Clock,
  processed: CheckCircle,
  verified: BadgeCheck,
  unverified: AlertCircle,
};

// Helper function to get icon by name
export const getIcon = (name, props = {}) => {
  const IconComponent = Icons[name];
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  return <IconComponent size={DEFAULT_ICON_SIZE} {...props} />;
};

export default Icons;
