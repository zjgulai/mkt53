import { useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SidebarItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
  children?: SidebarItem[];
  defaultOpen?: boolean;
  sectionId?: string;
}

interface SidebarProps {
  items: SidebarItem[];
  activeSection?: string;
  onSectionChange?: (sectionId: string) => void;
}

function SidebarItemComponent({
  item,
  level = 0,
  activeSection,
  onSectionChange,
}: {
  item: SidebarItem;
  level?: number;
  activeSection?: string;
  onSectionChange?: (sectionId: string) => void;
}) {
  const location = useLocation();
  const [manualOpen, setManualOpen] = useState(item.defaultOpen ?? false);
  const hasChildren = item.children && item.children.length > 0;

  const isActive = useCallback(
    (path?: string, sectionId?: string) => {
      if (activeSection && sectionId) return activeSection === sectionId;
      if (!path) return false;
      return location.pathname === path || location.pathname.startsWith(path + '/');
    },
    [activeSection, location.pathname]
  );

  const isAnyChildActive = hasChildren
    ? item.children!.some((c) => isActive(c.path, c.sectionId))
    : false;
  const isParentActive = activeSection && item.sectionId
    ? activeSection === item.sectionId
    : false;
  const isOpen = manualOpen || isAnyChildActive || isParentActive;

  const handleParentClick = () => {
    if (onSectionChange && item.sectionId) {
      onSectionChange(item.sectionId);
    }
    setManualOpen(!isOpen);
  };

  const handleChildClick = (sectionId?: string) => {
    if (onSectionChange && sectionId) {
      onSectionChange(sectionId);
    }
  };

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={handleParentClick}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all',
            isAnyChildActive || isParentActive
              ? 'text-[#C25B6E] font-medium'
              : 'text-[#1d1d1f] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'
          )}
          style={{ paddingLeft: `${12 + level * 8}px` }}
        >
          <div className="flex items-center gap-2">
            {item.icon && <span className="w-4 h-4">{item.icon}</span>}
            <span>{item.label}</span>
          </div>
          <ChevronDown
            className={cn('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180')}
          />
        </button>
        {isOpen && (
          <div className="mt-0.5 space-y-0.5">
            {item.children!.map((child, i) => (
              <SidebarChildItem
                key={i}
                item={child}
                level={level + 1}
                isActive={isActive(child.path, child.sectionId)}
                onClick={() => handleChildClick(child.sectionId)}
                hasCustomNav={!!onSectionChange}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Leaf node (no children)
  if (onSectionChange && item.sectionId) {
    const leafActive = activeSection === item.sectionId;
    return (
      <button
        onClick={() => onSectionChange(item.sectionId!)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all text-left',
          leafActive
            ? 'bg-[#C25B6E]/10 text-[#C25B6E] font-medium'
            : 'text-[#1d1d1f] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'
        )}
        style={{ paddingLeft: `${12 + level * 8}px` }}
      >
        {item.icon && <span className="w-4 h-4">{item.icon}</span>}
        <span>{item.label}</span>
      </button>
    );
  }

  return (
    <Link
      to={item.path || '#'}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all',
        isActive(item.path)
          ? 'bg-[#C25B6E]/10 text-[#C25B6E] font-medium'
          : 'text-[#1d1d1f] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'
      )}
      style={{ paddingLeft: `${12 + level * 8}px` }}
    >
      {item.icon && <span className="w-4 h-4">{item.icon}</span>}
      <span>{item.label}</span>
    </Link>
  );
}

function SidebarChildItem({
  item,
  level,
  isActive,
  onClick,
  hasCustomNav,
}: {
  item: SidebarItem;
  level: number;
  isActive: boolean;
  onClick: () => void;
  hasCustomNav: boolean;
}) {
  if (hasCustomNav) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all text-left',
          isActive
            ? 'bg-[#C25B6E]/10 text-[#C25B6E] font-medium'
            : 'text-[#1d1d1f] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'
        )}
        style={{ paddingLeft: `${12 + level * 8}px` }}
      >
        {item.icon && <span className="w-4 h-4">{item.icon}</span>}
        <span>{item.label}</span>
      </button>
    );
  }

  return (
    <Link
      to={item.path || '#'}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all',
        isActive
          ? 'bg-[#C25B6E]/10 text-[#C25B6E] font-medium'
          : 'text-[#1d1d1f] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'
      )}
      style={{ paddingLeft: `${12 + level * 8}px` }}
    >
      {item.icon && <span className="w-4 h-4">{item.icon}</span>}
      <span>{item.label}</span>
    </Link>
  );
}

export default function Sidebar({ items, activeSection, onSectionChange }: SidebarProps) {
  return (
    <aside className="hidden lg:block w-56 bg-white rounded-2xl p-3 h-fit sticky top-20 card-shadow-sm border border-[#EDE6DF] flex-shrink-0">
      <nav className="space-y-0.5">
        {items.map((item, idx) => (
          <SidebarItemComponent
            key={idx}
            item={item}
            activeSection={activeSection}
            onSectionChange={onSectionChange}
          />
        ))}
      </nav>
    </aside>
  );
}
