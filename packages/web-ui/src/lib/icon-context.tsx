"use client";

import {
  ChevronRight,
  ChevronDown,
  X,
  Copy,
  Menu,
  Dot,
  Monitor,
  Sun,
  Moon,
  RectangleHorizontal,
  Circle,
  SquareLibrary,
  Clock,
  Star,
  Settings,
  Plus,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Search,
  Loader,
  Users,
  Lock,
  Mail,
  Bell,
  Shield,
  Palette,
  Lightbulb,
  Rocket,
  Heart,
  Paintbrush,
  Brain,
  Globe,
  User,
  ImageIcon,
  Link,
  Check,
  RotateCcw,
  Play,
  Pause,
  Pipette,
  Home,
  MessageCircle,
  Inbox,
  Pencil,
  Scaling,
  SkipForward,
  CornerDownRight,
  CornerDownLeft,
} from "lucide-react";
import { createContext, useContext, useMemo } from "react";
import type { ComponentType, ReactNode } from "react";

export interface IconComponentProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export type IconComponent = ComponentType<IconComponentProps>;

export type IconName =
  | "chevron-right"
  | "chevron-down"
  | "x"
  | "copy"
  | "menu"
  | "dot"
  | "monitor"
  | "sun"
  | "moon"
  | "rectangle-horizontal"
  | "circle"
  | "square-library"
  | "clock"
  | "star"
  | "settings"
  | "plus"
  | "arrow-left"
  | "arrow-right"
  | "arrow-up"
  | "arrow-down"
  | "search"
  | "loader"
  | "users"
  | "lock"
  | "mail"
  | "bell"
  | "shield"
  | "palette"
  | "lightbulb"
  | "rocket"
  | "heart"
  | "paintbrush"
  | "brain"
  | "globe"
  | "user"
  | "image"
  | "link"
  | "check"
  | "rotate-ccw"
  | "play"
  | "pause"
  | "pipette"
  | "home"
  | "message-circle"
  | "inbox"
  | "pencil"
  | "scaling"
  | "skip-forward"
  | "corner-down-right"
  | "corner-down-left";

export const defaultIcons: Record<IconName, IconComponent> = {
  "arrow-down": ArrowDown,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up": ArrowUp,
  bell: Bell,
  brain: Brain,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  circle: Circle,
  clock: Clock,
  copy: Copy,
  "corner-down-left": CornerDownLeft,
  "corner-down-right": CornerDownRight,
  dot: Dot,
  globe: Globe,
  heart: Heart,
  home: Home,
  image: ImageIcon,
  inbox: Inbox,
  lightbulb: Lightbulb,
  link: Link,
  loader: Loader,
  lock: Lock,
  mail: Mail,
  menu: Menu,
  "message-circle": MessageCircle,
  monitor: Monitor,
  moon: Moon,
  paintbrush: Paintbrush,
  palette: Palette,
  pause: Pause,
  pencil: Pencil,
  pipette: Pipette,
  play: Play,
  plus: Plus,
  "rectangle-horizontal": RectangleHorizontal,
  rocket: Rocket,
  "rotate-ccw": RotateCcw,
  scaling: Scaling,
  search: Search,
  settings: Settings,
  shield: Shield,
  "skip-forward": SkipForward,
  "square-library": SquareLibrary,
  star: Star,
  sun: Sun,
  user: User,
  users: Users,
  x: X,
};

const IconContext = createContext<Record<IconName, IconComponent> | null>(null);

/**
 * Returns a single icon component for the given name.
 * Falls back to the default (Lucide) set if no provider is present.
 */
const useIcon = (name: IconName): IconComponent => {
  const icons = useContext(IconContext);
  return (icons ?? defaultIcons)[name];
};

/**
 * Returns the full icon map.
 * Falls back to the default (Lucide) set if no provider is present.
 */
const useIcons = (): Record<IconName, IconComponent> => {
  const icons = useContext(IconContext);
  return icons ?? defaultIcons;
};

/**
 * Swap some or all icons for components from another library.
 * Names left out of `icons` keep their default (Lucide) component.
 */
const IconProvider = ({
  children,
  icons,
}: {
  children: ReactNode;
  icons?: Partial<Record<IconName, IconComponent>>;
}) => {
  const value = useMemo(() => ({ ...defaultIcons, ...icons }), [icons]);
  return <IconContext.Provider value={value}>{children}</IconContext.Provider>;
};

export { IconProvider, useIcon, useIcons };
