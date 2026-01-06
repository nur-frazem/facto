import {
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
} from "@material-tailwind/react";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import React from "react";
import { useTheme } from "../context/ThemeContext";

// Helper to get base input styles based on theme
const getInputBaseStyles = (isLightTheme) => `
  w-full px-4 py-2.5
  text-sm
  rounded-lg
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue/50
  [&::-webkit-inner-spin-button]:appearance-none
  [&::-webkit-outer-spin-button]:appearance-none
  [appearance:textfield]
  ${isLightTheme
    ? "bg-gray-50 text-gray-800 placeholder-gray-400 border border-gray-200 hover:border-gray-300"
    : "bg-white/5 text-white placeholder-slate-400 border border-white/10 hover:border-white/20"
  }
`;

const getLabelStyles = (isLightTheme) =>
  `block text-sm font-medium mb-1.5 ${isLightTheme ? "text-gray-600" : "text-slate-300"}`;

export function Textfield({
  label,
  type = "text",
  value,
  onChange,
  onKeyDown,
  onKeyPress,
  placeholder,
  readOnly,
  className = "w-full",
  classNameLabel = "",
  classNameInput = "",
  currency = false,
  allowNegative = false, // New prop to allow negative numbers in currency fields
}) {
  const { isLightTheme } = useTheme();
  const [countryCode, setCountryCode] = useState("+56");
  const [internalValue, setInternalValue] = useState("");

  const isReadOnly = readOnly || (!onChange && value !== undefined);
  const inputBaseStyles = getInputBaseStyles(isLightTheme);
  const labelStyles = getLabelStyles(isLightTheme);

  // === FORMATTERS ===
  const formatCurrency = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const formatRut = (val) => {
    if (!val) return "";
    const clean = val.replace(/[^0-9kK]/g, "").toUpperCase();
    const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const dv = clean.slice(-1);
    return body + (dv ? "-" + dv : "");
  };

  // === DISPLAY VALUE ===
  let displayValue = value ?? internalValue;
  if (currency) displayValue = formatCurrency(value ?? internalValue);
  if (type === "rut") displayValue = formatRut(value ?? internalValue);

  // === ON CHANGE HANDLER ===
  const handleChange = (e) => {
    if (currency) {
      let raw;
      if (allowNegative) {
        // Allow negative sign at the beginning, then only digits
        const inputVal = e.target.value;
        const isNegative = inputVal.startsWith("-") || inputVal.includes("-");
        const digits = inputVal.replace(/[^0-9]/g, "");
        raw = isNegative && digits ? `-${digits}` : digits;
        const numericValue = raw ? parseInt(raw, 10) : "";
        onChange?.({
          ...e,
          target: { ...e.target, value: numericValue }
        });
        if (!onChange) setInternalValue(raw);
      } else {
        raw = e.target.value.replace(/\D/g, "");
        onChange?.({
          ...e,
          target: { ...e.target, value: raw ? parseInt(raw, 10) : "" }
        });
        if (!onChange) setInternalValue(raw);
      }
    } else if (type === "rut") {
      const raw = e.target.value.replace(/[^0-9kK]/g, "").toUpperCase();
      onChange?.({
        ...e,
        target: { ...e.target, value: raw }
      });
      if (!onChange) setInternalValue(raw);
    } else if (type === "phone") {
      const raw = e.target.value.replace(/\D/g, "");
      onChange?.({
        ...e,
        target: { ...e.target, value: raw }
      });
      if (!onChange) setInternalValue(raw);
    } else {
      onChange?.(e);
      if (!onChange) setInternalValue(e.target.value);
    }
  };

  const countryCodes = [{ code: "+56", country: "CL" }];

  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className={`${labelStyles} ${classNameLabel}`}>
          {label}
        </label>
      )}

      {type === "phone" ? (
        <div className={`
          flex items-center
          rounded-lg
          focus-within:ring-2 focus-within:ring-accent-blue/50 focus-within:border-accent-blue/50
          transition-all duration-200
          ${isLightTheme
            ? "bg-gray-50 border border-gray-200"
            : "bg-white/5 border border-white/10"
          }
          ${classNameInput}
        `}>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className={`bg-transparent text-sm py-2.5 pl-3 pr-1 focus:outline-none ${
              isLightTheme
                ? "text-gray-800 border-r border-gray-200"
                : "text-white border-r border-white/10"
            }`}
          >
            {countryCodes.map(({ code, country }) => (
              <option key={code} value={code} className={isLightTheme ? "text-gray-800 bg-white" : "text-white bg-surface"}>
                {country} {code}
              </option>
            ))}
          </select>
          <input
            type="tel"
            value={displayValue}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            onKeyPress={onKeyPress}
            placeholder={placeholder || "987654321"}
            readOnly={isReadOnly}
            className={`flex-1 px-3 py-2.5 bg-transparent text-sm focus:outline-none ${
              isLightTheme ? "text-gray-800 placeholder-gray-400" : "text-white placeholder-slate-400"
            }`}
          />
        </div>
      ) : (
        <input
          type={type === "rut" ? "text" : type}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          readOnly={isReadOnly}
          className={`${inputBaseStyles} ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''} ${classNameInput}`}
        />
      )}
    </div>
  );
}

export function SearchBar({ placeholder = "", value, onChange }) {
  const { isLightTheme } = useTheme();
  const inputBaseStyles = getInputBaseStyles(isLightTheme);

  return (
    <div className="w-full max-w-sm min-w-[200px]">
      <div className="relative">
        <input
          value={value}
          onChange={onChange}
          className={`${inputBaseStyles} pr-10`}
          placeholder={placeholder}
        />
        <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${isLightTheme ? "text-gray-400" : "text-slate-400"}`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function DropdownMenu({
  tittle = "Opción",
  items = [],
  classNameMenu = "",
  classNameList = "",
  value,
  onSelect,
  searchable = false,
  searchPlaceholder = "Buscar...",
}) {
  const { isLightTheme } = useTheme();
  const labelStyles = getLabelStyles(isLightTheme);

  const [internalSelected, setInternalSelected] = React.useState(tittle);
  const [open, setOpen] = React.useState(false);
  const [menuWidth, setMenuWidth] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const handlerRef = React.useRef(null);
  const buttonRef = React.useRef(null);
  const searchInputRef = React.useRef(null);

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalSelected(value === null ? tittle : value);
    }
  }, [value, tittle]);

  React.useEffect(() => {
    if (!handlerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      setMenuWidth(handlerRef.current.offsetWidth);
    });
    resizeObserver.observe(handlerRef.current);
    return () => resizeObserver.disconnect();
  }, [handlerRef]);

  // Focus search input when menu opens
  React.useEffect(() => {
    if (open && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    // Clear search when menu closes
    if (!open) {
      setSearchTerm("");
    }
  }, [open, searchable]);

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    // Blur the button when menu closes to prevent aria-hidden warning
    if (!isOpen && buttonRef.current) {
      buttonRef.current.blur();
    }
  };

  const handleSelect = (item) => {
    if (value === undefined) {
      setInternalSelected(item);
    }
    setOpen(false);
    if (onSelect) onSelect(item);
    // Blur button after selection
    if (buttonRef.current) {
      buttonRef.current.blur();
    }
  };

  // Filter items based on search term
  const filteredItems = React.useMemo(() => {
    if (!searchable || !searchTerm.trim()) {
      return items;
    }
    const term = searchTerm.toLowerCase();
    return items.filter((item) =>
      String(item).toLowerCase().includes(term)
    );
  }, [items, searchTerm, searchable]);

  return (
    <div className="flex flex-col">
      <span className={labelStyles}>{tittle}</span>
      <Menu
        open={open}
        handler={handleOpenChange}
        dismiss={{ outsidePress: true }}
        placement="bottom-start"
        allowHover={false}
      >
        <MenuHandler>
          <button
            ref={(el) => {
              buttonRef.current = el;
              handlerRef.current = el;
            }}
            type="button"
            className={`
              w-full py-2.5 px-4
              rounded-lg
              focus:outline-none focus:ring-2 focus:ring-accent-blue/50
              transition-all duration-200
              ${isLightTheme
                ? "bg-gray-50 border border-gray-200 hover:border-gray-300"
                : "bg-white/5 border border-white/10 hover:border-white/20"
              }
              ${classNameMenu}
            `}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`text-sm font-normal truncate ${isLightTheme ? "text-gray-800" : "text-white"}`}>{internalSelected || tittle}</span>
              <ChevronDownIcon
                className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ml-2 ${
                  isLightTheme ? "text-gray-400" : "text-slate-400"
                } ${open ? "rotate-180" : "rotate-0"}`}
              />
            </div>
          </button>
        </MenuHandler>

        <MenuList
          className={`
            px-0 py-1 max-w-96 min-w-52
            overflow-hidden rounded-lg
            shadow-modal
            !z-[9999]
            ${isLightTheme
              ? "bg-white border border-gray-200"
              : "bg-gradient-to-br from-surface-light to-surface border border-white/10"
            }
            ${classNameList}
          `}
          style={{ width: menuWidth }}
        >
          {/* Search input for searchable dropdowns */}
          {searchable && (
            <div className={`px-2 pb-2 pt-1 border-b ${isLightTheme ? "border-gray-200" : "border-white/10"}`}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className={`w-full px-3 py-2 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue/50 ${
                  isLightTheme
                    ? "bg-gray-50 text-gray-800 placeholder-gray-400 border border-gray-200"
                    : "bg-white/5 text-white placeholder-slate-400 border border-white/10"
                }`}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  // Prevent menu from closing on Enter if there are filtered items
                  if (e.key === "Enter" && filteredItems.length > 0) {
                    e.preventDefault();
                    handleSelect(filteredItems[0]);
                  }
                  // Prevent menu from closing on Escape, just clear search
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setSearchTerm("");
                  }
                }}
              />
            </div>
          )}

          {/* Items list */}
          <div className={`${searchable ? 'max-h-48 overflow-y-auto scrollbar-custom' : ''}`}>
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => (
                <MenuItem
                  key={index}
                  onClick={() => handleSelect(item)}
                  className={`w-full px-4 py-2 text-sm font-normal transition-colors cursor-pointer ${
                    isLightTheme
                      ? "text-gray-800 hover:bg-gray-100"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  {item}
                </MenuItem>
              ))
            ) : (
              <div className={`px-4 py-3 text-sm text-center ${isLightTheme ? "text-gray-400" : "text-slate-400"}`}>
                No se encontraron resultados
              </div>
            )}
          </div>
        </MenuList>
      </Menu>
    </div>
  );
}

export function DropdownMenuList({
  tittle = "Opciones",
  items = [],
  value,
  onSelect,
}) {
  const { isLightTheme } = useTheme();
  const labelStyles = getLabelStyles(isLightTheme);

  const [selectedItems, setSelectedItems] = useState(value || []);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setSelectedItems(value || []);
  }, [value]);

  const toggleItem = (item) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  useEffect(() => {
    if (onSelect) {
      onSelect(selectedItems);
    }
  }, [selectedItems, onSelect]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative inline-block text-left w-full">
      <span className={labelStyles}>{tittle}</span>
      <button
        onClick={() => setOpen(!open)}
        className={`
          w-full py-2.5 px-4
          flex justify-between items-center
          text-sm
          rounded-lg
          focus:outline-none focus:ring-2 focus:ring-accent-blue/50
          transition-all duration-200
          ${isLightTheme
            ? "bg-gray-50 text-gray-800 border border-gray-200 hover:border-gray-300"
            : "bg-white/5 text-white border border-white/10 hover:border-white/20"
          }
        `}
      >
        <span className="truncate">
          {selectedItems.length > 0
            ? `${selectedItems.length} seleccionado(s)`
            : "Seleccionar..."}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 transition-transform flex-shrink-0 ml-2 ${
            isLightTheme ? "text-gray-400" : "text-slate-400"
          } ${open ? "rotate-180" : "rotate-0"}`}
        />
      </button>

      {open && (
        <div className={`
          absolute mt-2 w-full z-[9999]
          rounded-lg shadow-modal
          max-h-52 overflow-auto scrollbar-custom
          animate-fade-in
          ${isLightTheme
            ? "bg-white border border-gray-200"
            : "bg-gradient-to-br from-surface-light to-surface border border-white/10"
          }
        `}>
          {items.map((item, index) => {
            const isSelected = selectedItems.includes(item);
            return (
              <div
                key={index}
                onClick={() => toggleItem(item)}
                className={`
                  px-4 py-2 cursor-pointer text-sm
                  transition-colors duration-150
                  ${isSelected
                    ? `bg-accent-blue/20 ${isLightTheme ? "text-gray-800" : "text-white"}`
                    : isLightTheme
                      ? "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <div className={`
                    w-4 h-4 rounded border-2 flex items-center justify-center
                    transition-colors duration-150
                    ${isSelected ? 'bg-accent-blue border-accent-blue' : isLightTheme ? 'border-gray-400' : 'border-slate-500'}
                  `}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {item}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DatepickerField({
  label,
  selectedDate,
  onChange,
  placeholder,
  className = "w-full",
  classNameDatePicker = "",
  classNameLabel = "",
  minDate,
  maxDate
}) {
  const { isLightTheme } = useTheme();
  const inputBaseStyles = getInputBaseStyles(isLightTheme);
  const labelStyles = getLabelStyles(isLightTheme);

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <label className={`${labelStyles} ${classNameLabel}`}>{label}</label>}
      <DatePicker
        selected={selectedDate}
        onChange={onChange}
        placeholderText={placeholder}
        className={`${inputBaseStyles} ${classNameDatePicker}`}
        dateFormat="dd/MM/yyyy"
        minDate={minDate}
        maxDate={maxDate}
        portalId="datepicker-portal"
      />
    </div>
  );
}

export function DatepickerRange({
  label,
  startDate,
  endDate,
  onChange,
  className,
  classNameField
}) {
  const { isLightTheme } = useTheme();
  const inputBaseStyles = getInputBaseStyles(isLightTheme);
  const labelStyles = getLabelStyles(isLightTheme);

  return (
    <div className={`flex flex-col ${className} ${classNameField}`}>
      {label && <label className={labelStyles}>{label}</label>}
      <DatePicker
        selectsRange
        startDate={startDate}
        endDate={endDate}
        onChange={onChange}
        dateFormat="dd/MM/yyyy"
        className={inputBaseStyles}
        isClearable
        portalId="datepicker-portal"
        onChangeRaw={(e) => e.preventDefault()}
      />
    </div>
  );
}

export function CheckboxDropdown({ label, items, value, onChange }) {
  const { isLightTheme } = useTheme();
  const [checked, setChecked] = useState(value);

  const handleChange = () => {
    setChecked((prev) => !prev);
    onChange?.(!checked);
  };

  return (
    <div className="w-full my-3">
      <label className={`
        flex items-center justify-between
        cursor-pointer
        transition-colors duration-200
        rounded-lg py-2.5 px-4
        ${isLightTheme
          ? "bg-gray-50 hover:bg-gray-100 border border-gray-200"
          : "bg-white/5 hover:bg-white/10 border border-white/10"
        }
      `}>
        <span className={`text-sm ${isLightTheme ? "text-gray-800" : "text-white"}`}>{label}</span>
        <div className={`
          w-5 h-5 flex items-center justify-center
          rounded border-2 transition-all duration-200
          ${checked ? "bg-accent-blue border-accent-blue" : isLightTheme ? "bg-transparent border-gray-400" : "bg-transparent border-slate-500"}
        `}>
          {checked && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          className="hidden"
        />
      </label>

      <div className={`
        mt-2 rounded-lg shadow-lg overflow-hidden
        transition-all duration-300
        ${isLightTheme
          ? "bg-white border border-gray-200"
          : "bg-surface-light border border-white/10"
        }
        ${checked ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}
      `}>
        <ul className={`divide-y ${isLightTheme ? "divide-gray-100" : "divide-white/5"}`}>
          {items.map((item, index) => (
            <li
              key={index}
              className={`px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                isLightTheme
                  ? "text-gray-600 hover:bg-gray-50"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Impuestos adicionales chilenos según SII
export const IMPUESTOS_ADICIONALES_CHILE = [
  { codigo: "24", nombre: "ILA Licores (Piscos, whisky, aguardiente, destilados)", tasa: 31.5 },
  { codigo: "25", nombre: "ILA Vinos", tasa: 20.5 },
  { codigo: "26", nombre: "ILA Cervezas y bebidas alcohólicas", tasa: 20.5 },
  { codigo: "27", nombre: "IABA Bebidas analcohólicas", tasa: 10 },
  { codigo: "271", nombre: "IABA Bebidas azucaradas (alto contenido azúcar)", tasa: 18 },
  { codigo: "23", nombre: "Artículos suntuarios (Pieles finas, joyas, etc.)", tasa: 15 },
  { codigo: "44", nombre: "Impuesto Art. 37 letras e, h, i, l", tasa: 15 },
  { codigo: "45", nombre: "Pirotecnia (1era venta)", tasa: 50 },
  { codigo: "28", nombre: "Impuesto específico diesel", tasa: null },
  { codigo: "35", nombre: "Impuesto específico gasolina", tasa: null },
];

export function ImpuestosAdicionalesSelector({
  label = "Otros Impuestos",
  value = {},
  onChange,
  readOnly = false,
  className = "",
}) {
  const { isLightTheme } = useTheme();
  const labelStyles = getLabelStyles(isLightTheme);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // value is an object like: { "24": 1000, "27": 500 }
  const [selectedTaxes, setSelectedTaxes] = useState(value || {});

  useEffect(() => {
    setSelectedTaxes(value || {});
  }, [value]);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 320),
      });
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTax = (codigo) => {
    setSelectedTaxes((prev) => {
      const newTaxes = { ...prev };
      if (codigo in newTaxes) {
        delete newTaxes[codigo];
      } else {
        newTaxes[codigo] = 0;
      }
      onChange?.(newTaxes);
      return newTaxes;
    });
  };

  const updateTaxAmount = (codigo, amount) => {
    const numericAmount = amount === "" ? 0 : parseInt(String(amount).replace(/\D/g, ""), 10) || 0;
    setSelectedTaxes((prev) => {
      const newTaxes = { ...prev, [codigo]: numericAmount };
      onChange?.(newTaxes);
      return newTaxes;
    });
  };

  const formatCurrency = (val) => {
    if (val === "" || val === null || val === undefined || val === 0) return "";
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const totalOtrosImpuestos = Object.values(selectedTaxes).reduce((sum, val) => sum + (val || 0), 0);
  const selectedCount = Object.keys(selectedTaxes).length;

  const dropdownContent = open && createPortal(
    <div
      ref={dropdownRef}
      className={`
        fixed z-[99999]
        rounded-lg shadow-modal
        max-h-80 overflow-auto scrollbar-custom
        animate-fade-in
        ${isLightTheme
          ? "bg-white border border-gray-200"
          : "bg-gradient-to-br from-surface-light to-surface border border-white/10"
        }
      `}
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
      }}
    >
      <div className={`px-3 py-2 border-b ${isLightTheme ? "border-gray-200 bg-gray-50" : "border-white/10 bg-white/5"}`}>
        <span className={`text-xs font-medium ${isLightTheme ? "text-gray-500" : "text-slate-400"}`}>
          Seleccione los impuestos aplicables e ingrese los montos
        </span>
      </div>
      {IMPUESTOS_ADICIONALES_CHILE.map((tax) => {
        const isSelected = tax.codigo in selectedTaxes;
        return (
          <div
            key={tax.codigo}
            className={`
              px-3 py-2.5 text-sm
              transition-colors duration-150
              ${isLightTheme ? "border-b border-gray-100" : "border-b border-white/5"}
              ${isSelected
                ? isLightTheme ? "bg-blue-50" : "bg-accent-blue/10"
                : ""
              }
            `}
          >
            <div className="flex items-center gap-3">
              {/* Checkbox */}
              <div
                onClick={() => toggleTax(tax.codigo)}
                className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer
                  transition-colors duration-150 flex-shrink-0
                  ${isSelected ? 'bg-accent-blue border-accent-blue' : isLightTheme ? 'border-gray-400 hover:border-gray-500' : 'border-slate-500 hover:border-slate-400'}
                `}
              >
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Tax info */}
              <div className="flex-1 min-w-0">
                <div
                  onClick={() => toggleTax(tax.codigo)}
                  className={`cursor-pointer truncate text-sm ${isLightTheme ? "text-gray-800" : "text-white"}`}
                  title={tax.nombre}
                >
                  {tax.nombre}
                </div>
                <div className={`text-xs ${isLightTheme ? "text-gray-500" : "text-slate-400"}`}>
                  Código: {tax.codigo} {tax.tasa !== null ? `| Tasa: ${tax.tasa}%` : "| Tasa variable"}
                </div>
              </div>

              {/* Amount input */}
              {isSelected && (
                <input
                  type="text"
                  value={formatCurrency(selectedTaxes[tax.codigo])}
                  onChange={(e) => updateTaxAmount(tax.codigo, e.target.value)}
                  placeholder="$0"
                  onClick={(e) => e.stopPropagation()}
                  className={`
                    w-28 px-2 py-1.5 text-sm text-right rounded
                    focus:outline-none focus:ring-2 focus:ring-accent-blue/50
                    ${isLightTheme
                      ? "bg-white text-gray-800 border border-gray-300"
                      : "bg-white/10 text-white border border-white/20"
                    }
                  `}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Total footer */}
      <div className={`px-3 py-3 border-t ${isLightTheme ? "border-gray-200 bg-gray-50" : "border-white/10 bg-white/5"}`}>
        <div className="flex justify-between items-center">
          <span className={`text-sm font-medium ${isLightTheme ? "text-gray-700" : "text-slate-300"}`}>
            Total Otros Impuestos:
          </span>
          <span className={`text-sm font-bold ${isLightTheme ? "text-gray-800" : "text-white"}`}>
            {formatCurrency(totalOtrosImpuestos) || "$0"}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <span className={labelStyles}>{label}</span>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !readOnly && setOpen(!open)}
        disabled={readOnly}
        className={`
          w-full py-2.5 px-4
          flex justify-between items-center
          text-sm
          rounded-lg
          focus:outline-none focus:ring-2 focus:ring-accent-blue/50
          transition-all duration-200
          ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}
          ${isLightTheme
            ? "bg-gray-50 text-gray-800 border border-gray-200 hover:border-gray-300"
            : "bg-white/5 text-white border border-white/10 hover:border-white/20"
          }
        `}
      >
        <span className="truncate">
          {totalOtrosImpuestos > 0
            ? formatCurrency(totalOtrosImpuestos)
            : selectedCount > 0
              ? `${selectedCount} impuesto(s)`
              : "$0"
          }
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 transition-transform flex-shrink-0 ml-2 ${
            isLightTheme ? "text-gray-400" : "text-slate-400"
          } ${open ? "rotate-180" : "rotate-0"}`}
        />
      </button>
      {dropdownContent}
    </div>
  );
}
