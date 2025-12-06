import {
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
  Button,
} from "@material-tailwind/react";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { useState, useRef, useEffect } from "react";
import React from "react";

// Base input styles
const inputBaseStyles = `
  w-full px-4 py-2.5
  bg-white/5 text-white text-sm
  placeholder-slate-400
  border border-white/10
  rounded-lg
  transition-all duration-200
  hover:border-white/20
  focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue/50
  [&::-webkit-inner-spin-button]:appearance-none
  [&::-webkit-outer-spin-button]:appearance-none
  [appearance:textfield]
`;

const labelStyles = "block text-sm font-medium text-slate-300 mb-1.5";

export function Textfield({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  readOnly,
  className = "w-full",
  classNameLabel = "",
  classNameInput = "",
  currency = false,
}) {
  const [countryCode, setCountryCode] = useState("+56");
  const [internalValue, setInternalValue] = useState("");

  const isReadOnly = readOnly || (!onChange && value !== undefined);

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
    let clean = val.replace(/[^0-9kK]/g, "").toUpperCase();
    let body = clean.slice(0, -1);
    let dv = clean.slice(-1);
    body = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return body + (dv ? "-" + dv : "");
  };

  // === DISPLAY VALUE ===
  let displayValue = value ?? internalValue;
  if (currency) displayValue = formatCurrency(value ?? internalValue);
  if (type === "rut") displayValue = formatRut(value ?? internalValue);

  // === ON CHANGE HANDLER ===
  const handleChange = (e) => {
    if (currency) {
      const raw = e.target.value.replace(/\D/g, "");
      onChange?.({
        ...e,
        target: { ...e.target, value: raw ? parseInt(raw, 10) : "" }
      });
      if (!onChange) setInternalValue(raw);
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
          bg-white/5 border border-white/10
          rounded-lg
          focus-within:ring-2 focus-within:ring-accent-blue/50 focus-within:border-accent-blue/50
          transition-all duration-200
          ${classNameInput}
        `}>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="bg-transparent text-white text-sm py-2.5 pl-3 pr-1 focus:outline-none border-r border-white/10"
          >
            {countryCodes.map(({ code, country }) => (
              <option key={code} value={code} className="text-white bg-surface">
                {country} {code}
              </option>
            ))}
          </select>
          <input
            type="tel"
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder || "987654321"}
            readOnly={isReadOnly}
            className="flex-1 px-3 py-2.5 bg-transparent text-white text-sm placeholder-slate-400 focus:outline-none"
          />
        </div>
      ) : (
        <input
          type={type === "rut" ? "text" : type}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          readOnly={isReadOnly}
          className={`${inputBaseStyles} ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''} ${classNameInput}`}
        />
      )}
    </div>
  );
}

export function SearchBar({ placeholder = "", value, onChange }) {
  return (
    <div className="w-full max-w-sm min-w-[200px]">
      <div className="relative">
        <input
          value={value}
          onChange={onChange}
          className={`${inputBaseStyles} pr-10`}
          placeholder={placeholder}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
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
}) {
  const [internalSelected, setInternalSelected] = React.useState(tittle);
  const [open, setOpen] = React.useState(false);
  const [menuWidth, setMenuWidth] = React.useState(null);
  const handlerRef = React.useRef(null);

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

  const handleSelect = (item) => {
    if (value === undefined) {
      setInternalSelected(item);
    }
    setOpen(false);
    if (onSelect) onSelect(item);
  };

  return (
    <Menu open={open} handler={setOpen}>
      <div className="flex flex-col">
        <span className={labelStyles}>{tittle}</span>
        <MenuHandler
          ref={handlerRef}
          className={`
            w-full py-2.5 px-4
            bg-white/5 border border-white/10
            rounded-lg
            hover:border-white/20
            focus:outline-none focus:ring-2 focus:ring-accent-blue/50
            transition-all duration-200
            ${classNameMenu}
          `}
        >
          <Button className="p-0 bg-transparent text-white w-full shadow-none hover:shadow-none">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-normal truncate">{internalSelected || tittle}</span>
              <ChevronDownIcon
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-2 ${
                  open ? "rotate-180" : "rotate-0"
                }`}
              />
            </div>
          </Button>
        </MenuHandler>
      </div>

      <MenuList
        style={{ width: menuWidth }}
        className={`
          px-0 py-1 max-w-96 min-w-52
          overflow-hidden rounded-lg
          bg-gradient-to-br from-surface-light to-surface
          border border-white/10
          shadow-modal
          ${classNameList}
        `}
      >
        {items.map((item, index) => (
          <MenuItem
            key={index}
            onClick={() => handleSelect(item)}
            className="w-full px-4 py-2 text-white text-sm font-normal hover:bg-white/10 transition-colors"
          >
            {item}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
}

export function DropdownMenuList({
  tittle = "Opciones",
  items = [],
  value,
  onSelect,
}) {
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
          bg-white/5 text-white text-sm
          border border-white/10
          rounded-lg
          hover:border-white/20
          focus:outline-none focus:ring-2 focus:ring-accent-blue/50
          transition-all duration-200
        `}
      >
        <span className="truncate">
          {selectedItems.length > 0
            ? `${selectedItems.length} seleccionado(s)`
            : "Seleccionar..."}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-2 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {open && (
        <div className="
          absolute mt-2 w-full z-50
          bg-gradient-to-br from-surface-light to-surface
          border border-white/10
          rounded-lg shadow-modal
          max-h-52 overflow-auto scrollbar-custom
          animate-fade-in
        ">
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
                    ? "bg-accent-blue/20 text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <div className={`
                    w-4 h-4 rounded border-2 flex items-center justify-center
                    transition-colors duration-150
                    ${isSelected ? 'bg-accent-blue border-accent-blue' : 'border-slate-500'}
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
  minDate
}) {
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
      />
    </div>
  );
}

export function CheckboxDropdown({ label, items, value, onChange }) {
  const [checked, setChecked] = useState(value);

  const handleChange = () => {
    setChecked((prev) => !prev);
    onChange?.(!checked);
  };

  return (
    <div className="w-full my-3">
      <label className="
        flex items-center justify-between
        cursor-pointer
        bg-white/5 hover:bg-white/10
        border border-white/10
        transition-colors duration-200
        rounded-lg py-2.5 px-4
      ">
        <span className="text-white text-sm">{label}</span>
        <div className={`
          w-5 h-5 flex items-center justify-center
          rounded border-2 transition-all duration-200
          ${checked ? "bg-accent-blue border-accent-blue" : "bg-transparent border-slate-500"}
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
        mt-2 bg-surface-light border border-white/10
        rounded-lg shadow-lg overflow-hidden
        transition-all duration-300
        ${checked ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}
      `}>
        <ul className="divide-y divide-white/5">
          {items.map((item, index) => (
            <li
              key={index}
              className="px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
