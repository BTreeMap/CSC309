/**
 * Icon System - Centralized Icon Management
 * 
 * This module abstracts the icon library (currently Lucide React) to provide:
 * 1. Easy library replacement - change icons in one place
 * 2. Semantic naming - icons named by purpose, not appearance
 * 3. Consistent sizing - predefined size presets
 * 4. Type safety for icon names
 * 
 * Usage:
 *   import { Icon, TransactionIcon, StatusIcon } from '../utils/icons';
 *   
 *   <Icon name="dashboard" />
 *   <Icon name="user" size="lg" />
 *   <TransactionIcon type="purchase" />
 *   <StatusIcon status="active" />
 */

import React from 'react';
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
    Loader2,
    Radio,

    // Content & Documents
    FileText,
    ClipboardList,
    ClipboardCheck,
    List,
    ListOrdered,
    Inbox,

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

// =============================================================================
// SIZE PRESETS
// =============================================================================

export const IconSizes = {
    xs: 12,
    sm: 14,
    md: 18,
    lg: 24,
    xl: 32,
    '2xl': 48,
};

// =============================================================================
// ICON REGISTRY - Maps semantic names to icon components
// =============================================================================

const iconRegistry = {
    // Navigation
    dashboard: LayoutDashboard,
    menu: Menu,
    close: X,
    chevronLeft: ChevronLeft,
    chevronRight: ChevronRight,
    chevronDown: ChevronDown,
    chevronUp: ChevronUp,
    arrowLeft: ArrowLeft,
    arrowRight: ArrowRight,
    externalLink: ExternalLink,

    // Users
    user: User,
    users: Users,
    userPlus: UserPlus,
    userCheck: UserCheck,
    userX: UserX,
    profile: CircleUser,

    // Auth & Security
    lock: Lock,
    unlock: Unlock,
    shield: ShieldCheck,
    shieldAlert: ShieldAlert,
    key: Key,
    login: LogIn,
    logout: LogOut,

    // CRUD Actions
    add: Plus,
    addCircle: PlusCircle,
    remove: Minus,
    removeCircle: MinusCircle,
    check: Check,
    checkCircle: CheckCircle,
    cancel: XCircle,
    edit: Pencil,
    delete: Trash2,
    copy: Copy,
    download: Download,
    upload: Upload,
    refresh: RefreshCw,
    search: Search,
    filter: Filter,
    settings: Settings,
    moreH: MoreHorizontal,
    moreV: MoreVertical,
    view: Eye,
    hide: EyeOff,

    // Communication
    send: Send,
    email: Mail,
    message: MessageSquare,
    notification: Bell,
    notificationActive: BellRing,

    // Commerce & Finance
    creditCard: CreditCard,
    coins: Coins,
    points: Coins,
    wallet: Wallet,
    receipt: Receipt,
    cart: ShoppingCart,
    bag: ShoppingBag,
    tag: Tag,
    tags: Tags,
    gift: Gift,
    target: Target,
    trendUp: TrendingUp,
    trendDown: TrendingDown,
    barChart: BarChart3,
    pieChart: PieChart,

    // Time & Calendar
    calendar: Calendar,
    calendarDays: CalendarDays,
    calendarManage: CalendarCog,
    clock: Clock,
    timer: Timer,
    history: History,

    // Status & Feedback
    alert: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    help: HelpCircle,
    success: CheckCircle,
    error: XCircle,
    loading: Loader2,
    live: Radio,

    // Documents
    document: FileText,
    clipboard: ClipboardList,
    clipboardCheck: ClipboardCheck,
    list: List,
    listOrdered: ListOrdered,
    inbox: Inbox,

    // Technology
    qrCode: QrCode,
    camera: Camera,
    smartphone: Smartphone,
    monitor: Monitor,

    // Arrows
    transfer: ArrowLeftRight,
    swap: ArrowUpDown,
    next: MoveRight,

    // Misc
    star: Star,
    heart: Heart,
    bookmark: Bookmark,
    flag: Flag,
    location: MapPin,
    building: Building2,
    fire: Flame,
    zap: Zap,
    award: Award,
    verified: BadgeCheck,
    dot: CircleDot,
};

// =============================================================================
// TRANSACTION ICONS
// =============================================================================

const transactionIconRegistry = {
    purchase: ShoppingCart,
    redemption: Gift,
    adjustment: Settings,
    transfer: ArrowLeftRight,
    event: Calendar,
};

// =============================================================================
// STATUS ICONS
// =============================================================================

const statusIconRegistry = {
    active: Flame,
    upcoming: Clock,
    ended: CheckCircle,
    pending: Clock,
    processed: CheckCircle,
    verified: BadgeCheck,
    unverified: AlertCircle,
    live: Radio,
};

// =============================================================================
// ICON COMPONENTS
// =============================================================================

/**
 * General purpose icon component
 * 
 * @param {string} name - Icon name from registry
 * @param {string|number} size - Size preset ('sm', 'md', 'lg') or number
 * @param {string} className - Additional CSS classes
 * @param {object} props - Additional props passed to icon
 * 
 * @example
 * <Icon name="dashboard" />
 * <Icon name="user" size="lg" />
 * <Icon name="edit" size={20} className="text-primary" />
 */
export const Icon = ({ name, size = 'md', className = '', ...props }) => {
    const IconComponent = iconRegistry[name];

    if (!IconComponent) {
        console.warn(`Icon "${name}" not found in registry`);
        return null;
    }

    const iconSize = typeof size === 'number' ? size : (IconSizes[size] || IconSizes.md);

    return <IconComponent size={iconSize} className={className} {...props} />;
};

/**
 * Transaction type icon component
 * 
 * @param {string} type - Transaction type (purchase, redemption, etc.)
 * @param {string|number} size - Size preset or number
 * 
 * @example
 * <TransactionIcon type="purchase" />
 * <TransactionIcon type="redemption" size="lg" />
 */
export const TransactionIcon = ({ type, size = 'md', className = '', ...props }) => {
    const IconComponent = transactionIconRegistry[type] || ClipboardList;
    const iconSize = typeof size === 'number' ? size : (IconSizes[size] || IconSizes.md);

    return <IconComponent size={iconSize} className={className} {...props} />;
};

/**
 * Status indicator icon component
 * 
 * @param {string} status - Status type (active, pending, verified, etc.)
 * @param {string|number} size - Size preset or number
 * 
 * @example
 * <StatusIcon status="active" />
 * <StatusIcon status="verified" size="sm" />
 */
export const StatusIcon = ({ status, size = 'sm', className = '', ...props }) => {
    const IconComponent = statusIconRegistry[status] || CircleDot;
    const iconSize = typeof size === 'number' ? size : (IconSizes[size] || IconSizes.sm);

    return <IconComponent size={iconSize} className={className} {...props} />;
};

// =============================================================================
// DIRECT ICON EXPORTS (for cases where you need the raw component)
// =============================================================================

export {
    // Navigation
    LayoutDashboard,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Menu,
    X,
    ArrowLeft,
    ArrowRight,

    // Users
    User,
    Users,
    UserPlus,

    // Auth
    Lock,
    LogOut,

    // Actions
    Plus,
    PlusCircle,
    Check,
    CheckCircle,
    XCircle,
    Pencil,
    Trash2,
    Copy,
    Download,
    RefreshCw,
    Search,
    Settings,
    Eye,

    // Commerce
    CreditCard,
    Coins,
    ShoppingCart,
    Tag,
    Gift,
    Target,
    BarChart3,

    // Calendar
    Calendar,
    CalendarDays,
    CalendarCog,
    Clock,

    // Status
    AlertCircle,
    AlertTriangle,
    Info,
    Loader2,
    Radio,

    // Documents
    ClipboardList,
    Inbox,

    // Tech
    QrCode,
    Camera,

    // Direction
    ArrowLeftRight,
    MapPin,

    // Misc
    Flame,
    BadgeCheck,
    ShieldCheck,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get list of all available icon names
 */
export const getAvailableIcons = () => Object.keys(iconRegistry);

/**
 * Check if an icon exists in the registry
 */
export const hasIcon = (name) => name in iconRegistry;

/**
 * Get the raw icon component by name (for advanced use cases)
 */
export const getIconComponent = (name) => iconRegistry[name] || null;

export default Icon;
