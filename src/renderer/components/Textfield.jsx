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

export function Textfield({ 
  label, 
  type = "text", 
  value, 
  onChange, 
  placeholder, 
  readOnly, 
  className="w-full", 
  classNameLabel="",
  classNameInput="",
  currency = false,
}) {
  const [countryCode, setCountryCode] = useState("+56"); // default Chile 🇨🇱
  const [internalValue, setInternalValue] = useState(""); // para RUT u otros casos

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
      const raw = e.target.value.replace(/\D/g, ""); // ⬅️ solo dígitos
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

  const countryCodes = [
    { code: "+56", country: "CL" }
  ];

  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      {label && (
        <label className={`text-sm font-medium text-white ${classNameLabel}`}>
          {label}
        </label>
      )}

      {type === "phone" ? (
        <div
          className={`flex items-center rounded-lg border border-white/20 bg-white/10 
            focus-within:ring-2 focus-within:ring-blue-400 transition duration-200 ${classNameInput}`}
        >
          {/* Dropdown de códigos */}
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="bg-transparent w-24 text-white py-2 focus:outline-none border-r border-white/20 "
          >
            {countryCodes.map(({ code, country }) => (
              <option key={code} value={code} className="text-white bg-sky-900">
                {country} {code}
              </option>
            ))}
          </select>

          {/* Input del número */}
          <input
            type="tel"
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder || "987654321"}
            readOnly={isReadOnly}
            className={`px-4 py-2 rounded-e-lg hover:border-blue-400 bg-black/5 text-white 
              placeholder-gray-300 border border-white/20 focus:outline-none transition duration-200 [&::-webkit-inner-spin-button]:appearance-none 
              [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield] ${classNameInput}`}
          />
        </div>
      ) : (
        <input
          type={type === "rut" ? "text" : type}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          readOnly={isReadOnly}
          className={`px-4 py-2 rounded-lg hover:border-blue-400 bg-white/10 text-white 
            placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 
            focus:ring-blue-400 transition duration-200 [&::-webkit-inner-spin-button]:appearance-none 
            [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield] ${classNameInput}`}
        />
      )}
    </div>
  );
}

export function SearchBar({
  placeholder = "",

}) {

  return (
    <div className="w-full max-w-sm min-w-[200px]">
      <div className="relative">
        <input
          className="w-full bg-transparent placeholder:text-slate-400 text-white text-sm border border-slate-200 rounded-md pl-3 pr-28 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow"
          placeholder={placeholder} 
        />
        <button
          className="absolute top-1 right-1 w-min flex items-center rounded-full py-1 px-2.5 border border-transparent text-center text-sm text-white transition-all shadow-sm hover:shadow focus:bg-slate-700 focus:shadow-none active:bg-slate-700 hover:bg-slate-700 active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4">
            <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z"  clipRule="evenodd" />
          </svg>
        </button> 
      </div>
    </div>
  );
}

export function DropdownMenu({
  tittle = "Opción",
  items = [],
  classNameMenu = "",
  classNameList = "",
  value,          // ✅ opcional: valor controlado
  onSelect,
}) {
  const [internalSelected, setInternalSelected] = React.useState(tittle);
  const [open, setOpen] = React.useState(false);
  const [menuWidth, setMenuWidth] = React.useState(null);

  const handlerRef = React.useRef(null);

  // 🔹 Sincroniza solo si value está definido
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
    // Actualiza estado interno solo si no es controlado
    if (value === undefined) {
      setInternalSelected(item);
    }
    setOpen(false);

    if (onSelect) onSelect(item);
  };

  return (
    <Menu open={open} handler={setOpen}>
      <div className="flex flex-col">
        <span className="text-white text-sm mb-1 font-bold">{tittle}</span>
        <MenuHandler
          ref={handlerRef}
          className={`rounded-lg py-2 hover:border-blue-400 bg-white/10 text-white placeholder-gray-300 border border-white/20 
                      focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200 ${classNameMenu}`}
        >
          <Button className="p-2 bg-sky-950 text-white w-full">
            <div className="flex items-center justify-between w-full">
              <span className="ml-5">{internalSelected || tittle}</span>
              <ChevronDownIcon
                className={`w-4 h-4 mr-3 transition-transform duration-200 ${
                  open ? "rotate-180" : "rotate-0"
                }`}
              />
            </div>
          </Button>
        </MenuHandler>
      </div>

      <MenuList
        style={{ width: menuWidth }}
        className={`px-0 py-1 max-w-96 min-w-52 overflow-hidden rounded-lg bg-gradient-to-tl border-sky-600 from-sky-950 to-sky-900 ${classNameList}`}
      >
        {items.map((item, index) => (
          <MenuItem
            key={index}
            onClick={() => handleSelect(item)}
            className="w-full px-3 py-1 text-white font-semibold hover:bg-black/10"
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
      setSelectedItems(value || []); // sincronizar cuando cambia el prop
    }, [value]);

    const toggleItem = (item) => {
      setSelectedItems((prev) => 
        prev.includes(item)
          ? prev.filter((i) => i !== item)
          : [...prev, item]
      );
    };
  
    // cuando cambian los seleccionados, avisamos al padre
    useEffect(() => {
      if (onSelect) {
        onSelect(selectedItems);
      }
    }, [selectedItems, onSelect]);
  
    // Detectar click fuera
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
        <span className="text-white text-sm mb-1 font-bold">{tittle}</span>
        <button
          onClick={() => setOpen(!open)}
          className="w-full p-2 flex justify-between items-center font-bold
                    rounded-lg py-2 hover:border-blue-400 bg-white/10 text-white placeholder-gray-300 border border-white/20 
                    focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
        >
          {selectedItems.length > 0
            ? `${selectedItems.length} seleccionado(s)`
            : "Seleccionar..."}
          <ChevronDownIcon
            className={`w-4 h-4 transition-transform ${
              open ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>
  
        {open && (
          <div
            className="absolute mt-1 shadow-lg z-10 border-[1px] justify-self-center
                          px-0 py-1 max-w-96 min-w-44 max-h-52 overflow-auto rounded-lg bg-gradient-to-tl border-sky-700 from-sky-950 to-sky-900
                          flex flex-col scrollbar-custom"
          >
            {items.map((item, index) => {
              const isSelected = selectedItems.includes(item);
              return (
                <div
                  key={index}
                  onClick={() => toggleItem(item)}
                  className={`px-3 py-1 font-medium cursor-pointer text-center text-[15px] hover:transition duration-200 ${
                    isSelected
                      ? "bg-black/30 text-white"
                      : "text-white hover:bg-black/10"
                  }`}
                >
                  {item}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  
  
  

  export function DatepickerField({ label, selectedDate, onChange, placeholder, className="w-full", classNameDatePicker="", classNameLabel="", minDate }) {
    return (
      <div className={`flex flex-col space-y-1 ${className}`}>
        {label && <label className={`text-sm font-medium text-white ${classNameLabel}`}>{label}</label>}
  
        <DatePicker
          selected={selectedDate}
          onChange={onChange}
          placeholderText={placeholder}
          className={`px-4 py-2 rounded-lg bg-white/10 text-white 
                    placeholder-gray-300 border border-white/20 
                      focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200 w-full
                      ${classNameDatePicker}`}
          dateFormat="dd/MM/yyyy"
          calendarClassName="bg-blue-700 text-white rounded-lg border border-blue-400 p-2 shadow-lg"
          dayClassName={date =>
            "hover:bg-blue-500 rounded-md transition-colors"
          }
          minDate={minDate}
        />
      </div>
    );
  }

  export function CheckboxDropdown({ label, items, value, onChange }) {
    const [checked, setChecked] = useState(value);
  
    const handleChange = (e) => {
      setChecked(prev => !prev);
      onChange?.(!checked); // notifica al padre
    };

    return (
      <div className="inline-block my-4 w-full">
        <label className="flex items-center justify-between space-x-2 cursor-pointer bg-black/30 hover:bg-black/50 transition-colors rounded-full py-1 px-2">
          {/* Checkbox personalizado */}
          <input
            type="checkbox"
            checked={checked}
            onChange={handleChange}
            className="hidden"
          />
          <span
            className={`
              w-6 h-6 flex items-center justify-center 
              rounded-lg border-2 
              transition-colors duration-300
              ${checked ? "bg-black border-sky-700" : "bg-black/90 border-black"}
              hover:${checked ? "bg-black border-black" : "bg-black hover:border-sky-950"}
            `}
          >
            {checked && (
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                viewBox="0 0 24 24"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
  
          {/* Label */}
          <span className="text-white">{label}</span>
          <div></div>
        </label>
        <div
          className={`mt-2 w-full bg-sky-900 border-sky-950 border rounded-lg shadow-md transition-all duration-300 overflow-hidden ${
            checked ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <ul className="divide-y divide-gray-200">
            {items.map((item, index) => (
              <li
                key={index}
                className="p-2 cursor-pointer transition-colors"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }