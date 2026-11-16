import {
  Anchor,
  Compass,
  Eye,
  Feather,
  Flame,
  Orbit,
  ScrollText,
  Shield,
} from 'lucide-react';
import type { CharacterIconId, CharacterTone } from '../types/chat';

export const CHARACTER_ICON_OPTIONS: Array<{
  id: CharacterIconId;
  label: string;
}> = [
  { id: 'orbit', label: 'Orbit' },
  { id: 'compass', label: 'Compass' },
  { id: 'flame', label: 'Flame' },
  { id: 'anchor', label: 'Anchor' },
  { id: 'feather', label: 'Feather' },
  { id: 'shield', label: 'Shield' },
  { id: 'scroll', label: 'Scroll' },
  { id: 'eye', label: 'Eye' },
];

export const CHARACTER_TONE_OPTIONS: Array<{
  id: CharacterTone;
  label: string;
  swatch: string;
}> = [
  { id: 'cobalt', label: 'Cobalt', swatch: '#A8C7FA' },
  { id: 'amber', label: 'Amber', swatch: '#E9C48C' },
  { id: 'emerald', label: 'Sage', swatch: '#8FD1B5' },
  { id: 'rose', label: 'Terracotta', swatch: '#E7B3B7' },
  { id: 'slate', label: 'Slate', swatch: '#B8C4D4' },
];

const TONE_CLASSES: Record<CharacterTone, string> = {
  cobalt: 'bg-[#223554] text-[#B8D2FF]',
  amber: 'bg-[#393022] text-[#F0D3A1]',
  emerald: 'bg-[#1E362D] text-[#A2DFC5]',
  rose: 'bg-[#3D272B] text-[#F2BEC2]',
  slate: 'bg-[#2A303B] text-[#CBD4E3]',
};

interface CharacterIconProps {
  icon: CharacterIconId;
  tone?: CharacterTone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CharacterIcon({
  icon,
  tone = 'cobalt',
  size = 'md',
  className = '',
}: CharacterIconProps) {
  const containerSizes = {
    sm: 'h-9 w-9 rounded-xl',
    md: 'h-11 w-11 rounded-2xl',
    lg: 'h-14 w-14 rounded-[20px]',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const IconComponent = {
    orbit: Orbit,
    compass: Compass,
    flame: Flame,
    anchor: Anchor,
    feather: Feather,
    shield: Shield,
    scroll: ScrollText,
    eye: Eye,
  }[icon] ?? Orbit;

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center ${containerSizes[size]} ${TONE_CLASSES[tone]} ${className}`}
      aria-hidden="true"
    >
      <IconComponent className={iconSizes[size]} strokeWidth={1.85} />
    </div>
  );
}
