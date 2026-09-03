import { useState, useRef, useEffect } from 'react';
import { ChevronsUpDown, Check, Search, X } from 'lucide-react';

/**
 * CustomSelect Component
 * Modern, accessible, HeadlessUI-styled dropdown with avatar, icon, badge, checkmark and search support.
 */
export default function CustomSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  disabled = false,
  searchable = false,
  size = 'md', // 'sm' | 'md' | 'lg'
  variant = 'default', // 'default' | 'filter' | 'dark'
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  style = {},
  buttonStyle = {},
  dropdownStyle = {},
  required = false,
  name = '',
  id = '',
  children
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Helper to extract clean text from React children
  const extractTextFromReactNode = (node) => {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractTextFromReactNode).join('');
    if (node.props && node.props.children) return extractTextFromReactNode(node.props.children);
    return '';
  };

  // Helper to parse leading emoji, title and subtext
  const parseRichLabel = (rawText, explicitIcon, explicitSubtext) => {
    let text = (rawText || '').trim();
    let icon = explicitIcon;
    let subtext = explicitSubtext;
    let label = text;

    // Detect leading emoji
    const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF]|🟢|🟡|🔴|🔵|⚪|⚫|➕|✏️|✓|✕)\s*/u;
    const emojiMatch = text.match(emojiRegex);
    if (emojiMatch && !icon) {
      icon = emojiMatch[1];
      text = text.replace(emojiRegex, '').trim();
      label = text;
    }

    // Split on separator like " — " or " • " if subtext isn't already set
    if (!subtext && (text.includes(' — ') || text.includes(' - '))) {
      const parts = text.includes(' — ') ? text.split(' — ') : text.split(' - ');
      if (parts.length >= 2) {
        label = parts[0].trim();
        subtext = parts.slice(1).join(' — ').trim();
      }
    }

    return { label, icon, subtext };
  };

  // Normalize options array from options prop or React children
  let rawOptions = options;
  if ((!rawOptions || rawOptions.length === 0) && children) {
    const extracted = [];
    const parseChildren = (kids) => {
      if (!kids) return;
      if (Array.isArray(kids)) {
        kids.forEach(parseChildren);
      } else if (kids.props) {
        if (kids.props.children && Array.isArray(kids.props.children) && kids.type !== 'option') {
          parseChildren(kids.props.children);
        } else if (kids.type === 'option' || kids.props.value !== undefined) {
          const rawText = extractTextFromReactNode(kids.props.children) || String(kids.props.value || '');
          const { label, icon, subtext } = parseRichLabel(
            rawText,
            kids.props.icon || kids.props['data-icon'],
            kids.props.subtext || kids.props['data-subtext']
          );

          extracted.push({
            value: kids.props.value !== undefined ? kids.props.value : kids.props.children,
            label,
            avatar: kids.props.avatar || kids.props['data-avatar'],
            icon,
            badge: kids.props.badge || kids.props['data-badge'],
            badgeClass: kids.props.badgeClass || kids.props['data-badge-class'],
            subtext,
            disabled: kids.props.disabled,
            color: kids.props.color || kids.props['data-color']
          });
        }
      }
    };
    parseChildren(children);
    rawOptions = extracted;
  }

  const normalizedOptions = (rawOptions || []).map(opt => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      const { label, icon, subtext } = parseRichLabel(String(opt));
      return { value: opt, label, icon, subtext };
    }
    const rawLabel = opt.label || opt.name || String(opt.value !== undefined ? opt.value : (opt.id || ''));
    const { label, icon, subtext } = parseRichLabel(rawLabel, opt.icon, opt.subtext || opt.description);

    return {
      value: opt.value !== undefined ? opt.value : opt.id,
      label,
      avatar: opt.avatar,
      icon,
      badge: opt.badge,
      badgeClass: opt.badgeClass,
      subtext,
      disabled: opt.disabled,
      color: opt.color
    };
  });

  // Check orientation (open upwards if near bottom of viewport/modal)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 260 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Find currently selected option
  const selectedOption = normalizedOptions.find(opt => {
    if (value && typeof value === 'object') {
      return String(opt.value) === String(value.value || value.id) || opt.label === (value.name || value.label);
    }
    return String(opt.value) === String(value);
  }) || (value !== undefined && value !== null && value !== '' ? { value, label: String(value) } : null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, searchable]);

  // Filter options if searchable
  const filteredOptions = searchable && searchQuery
    ? normalizedOptions.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.subtext && opt.subtext.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : normalizedOptions;

  const handleSelect = (opt) => {
    if (opt.disabled) return;
    if (onChange) {
      const syntheticEvent = {
        target: { value: opt.value, name: name || id },
        currentTarget: { value: opt.value, name: name || id },
        value: opt.value,
        preventDefault: () => {},
        stopPropagation: () => {},
        toString: () => String(opt.value),
        valueOf: () => opt.value
      };
      // Call onChange supporting both (val, opt) and (event, opt) patterns
      onChange(opt.value, opt, syntheticEvent);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  // Avatar helper
  const renderAvatar = (opt) => {
    if (!opt) return null;
    if (opt.avatar) {
      return (
        <img
          src={opt.avatar}
          alt=""
          className="custom-select-avatar"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      );
    }
    if (opt.icon) {
      return <span className="custom-select-icon">{opt.icon}</span>;
    }
    if (opt.color) {
      return <span className="custom-select-color-dot" style={{ backgroundColor: opt.color }} />;
    }
    return null;
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-wrapper ${variant} ${size} ${isOpen ? 'is-open' : ''} ${className}`}
      style={{
        ...style,
        ...(isOpen ? { zIndex: 99999, position: 'relative' } : {})
      }}
    >
      {label && (
        <label className="custom-select-label" htmlFor={id}>
          {label} {required && <span className="required" style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}

      <div
        className={`custom-select-container ${isOpen ? 'is-open' : ''}`}
        style={isOpen ? { zIndex: 99999, position: 'relative' } : {}}
      >
        <button
          type="button"
          id={id}
          name={name}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={`custom-select-button ${isOpen ? 'open' : ''} ${selectedOption ? 'has-value' : 'placeholder'} ${buttonClassName}`}
          style={buttonStyle}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="custom-select-value-content">
            {selectedOption ? (
              <>
                {renderAvatar(selectedOption)}
                <span className="custom-select-text truncate">{selectedOption.label}</span>
                {selectedOption.badge && (
                  <span className={`custom-select-badge ${selectedOption.badgeClass || 'badge-gray'}`}>
                    {selectedOption.badge}
                  </span>
                )}
              </>
            ) : (
              <span className="custom-select-placeholder truncate">{placeholder}</span>
            )}
          </span>

          <ChevronsUpDown size={15} className="custom-select-chevron" />
        </button>

        {isOpen && (
          <div
            className={`custom-select-dropdown ${openUpward ? 'open-upward' : ''} ${dropdownClassName}`}
            style={dropdownStyle}
            role="listbox"
          >
            {searchable && (
              <div className="custom-select-search-wrap">
                <Search size={13} className="custom-select-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="custom-select-search-input"
                  placeholder="Search options..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="custom-select-search-clear"
                    onClick={(e) => { e.stopPropagation(); setSearchQuery(''); }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            <div className="custom-select-options-list">
              {filteredOptions.length === 0 ? (
                <div className="custom-select-empty">No options found</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selectedOption && selectedOption.value === opt.value;
                  return (
                    <div
                      key={String(opt.value)}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt)}
                      className={`custom-select-option ${isSelected ? 'selected' : ''} ${opt.disabled ? 'disabled' : ''}`}
                    >
                      <div className="custom-select-option-main">
                        {renderAvatar(opt)}
                        <div className="custom-select-option-text-group">
                          <span className="custom-select-option-label truncate">{opt.label}</span>
                          {opt.subtext && (
                            <span className="custom-select-option-subtext truncate">{opt.subtext}</span>
                          )}
                        </div>
                        {opt.badge && (
                          <span className={`custom-select-badge ${opt.badgeClass || 'badge-gray'}`}>
                            {opt.badge}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <span className="custom-select-check">
                          <Check size={15} />
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Compound Components for HeadlessUI drop-in syntax ───────────────

export function Listbox({ value, onChange, children, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`headless-listbox relative ${className}`}>
      {typeof children === 'function' ? children({ value, onChange, isOpen, setIsOpen }) : children}
    </div>
  );
}

export function Label({ children, className = '' }) {
  return <label className={`custom-select-label ${className}`}>{children}</label>;
}

export function ListboxButton({ children, className = '', onClick }) {
  return (
    <button
      type="button"
      className={`custom-select-button ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function ListboxOptions({ children, className = '' }) {
  return (
    <div className={`custom-select-dropdown ${className}`} role="listbox">
      <div className="custom-select-options-list">
        {children}
      </div>
    </div>
  );
}

export function ListboxOption({ value, selected, onClick, children, className = '' }) {
  return (
    <div
      role="option"
      aria-selected={selected}
      className={`custom-select-option ${selected ? 'selected' : ''} ${className}`}
      onClick={() => onClick && onClick(value)}
    >
      {children}
    </div>
  );
}
