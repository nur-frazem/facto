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

export function Textfield ({ 
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

  const isReadOnly = readOnly || (!onChange && value !== undefined);

  const formatCurrency = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Si currency es true, el valor mostrado debe estar formateado
  const displayValue = currency ? formatCurrency(value) : value;

  // Cuando cambia, devolvemos solo números limpios si es moneda
  const handleChange = (e) => {
    if (currency) {
      const raw = e.target.value.replace(/\D/g, ""); // deja solo dígitos
      onChange?.({
        ...e,
        target: { ...e.target, value: raw ? parseInt(raw, 10) : "" }
      });
    } else {
      onChange?.(e);
    }
  };

  return (
      <div className={`flex flex-col space-y-1 ${className}`}>
      {label && <label className={`text-sm font-medium text-white ${classNameLabel}`}>{label}</label>}
          <input
              type={type}
              value={displayValue}
              onChange={handleChange}
              placeholder={placeholder}
              readOnly={isReadOnly}
              className={`px-4 py-2 rounded-lg hover:border-blue-400 bg-white/10 text-white 
                      placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 
                      focus:ring-blue-400 transition duration-200 [&::-webkit-inner-spin-button]:appearance-none 
                      [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield] ${classNameInput}`}
          />
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
          <Button className="p-2 bg-blue-500 text-white w-full">
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
        className={`px-0 py-1 max-w-96 min-w-52 overflow-hidden rounded-lg bg-gradient-to-tl border-blue-400 from-purple-700 to-blue-500 ${classNameList}`}
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
      let newSelection;
      setSelectedItems((prev) => {
        newSelection = prev.includes(item)
          ? prev.filter((i) => i !== item)
          : [...prev, item];
        return newSelection;
      });
      if (onSelect) onSelect(newSelection);
    };
  
    // 👇 cuando cambian los seleccionados, avisamos al padre
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
                          px-0 py-1 max-w-96 min-w-44 max-h-52 overflow-auto rounded-lg bg-gradient-to-tl border-blue-400 from-purple-700 to-blue-500
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