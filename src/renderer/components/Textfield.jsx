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

export function Textfield ({ 
  label, 
  type = "text", 
  value, 
  onChange, 
  placeholder, 
  readOnly, 
  className="w-full", 
  classNameLabel="",
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
              className="px-4 py-2 rounded-lg hover:border-blue-400 bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
          />
      </div>
  );
}

export function DropdownMenu({
    tittle = "Opción",
    items = [],
    classNameMenu = "",
    classNameList = "",
    onSelect,
  }) {
    const [selected, setSelected] = useState(tittle);
    const [open, setOpen] = useState(false);
    const [menuWidth, setMenuWidth] = useState(null);
  
    const handlerRef = useRef(null);
  
    useEffect(() => {
      if (!handlerRef.current) return;
  
      // Calcula ancho inicial y cuando cambia tamaño del botón
      const resizeObserver = new ResizeObserver(() => {
        setMenuWidth(handlerRef.current.offsetWidth);
      });
      resizeObserver.observe(handlerRef.current);
  
      return () => resizeObserver.disconnect();
    }, [handlerRef]);

    const handleSelect = (item) => {
      setSelected(item);
      setOpen(false);
      if (onSelect) onSelect(item);
    };
  
    return (
      <Menu open={open} handler={setOpen}>
        <div className="flex flex-col">
            <span className="text-white text-sm mb-1 font-bold">{tittle}</span>
            <MenuHandler
            ref={handlerRef}
            className={`rounded-lg py-2 hover:border-blue-400 bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200 ${classNameMenu}`}
            >
            <Button className="p-2 bg-blue-500 text-white w-full">
                <div className="flex items-center justify-between w-full">
                <span className="ml-5 ">{selected}</span>
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

  export function DatepickerField({ label, selectedDate, onChange, placeholder, className="w-full", classNameLabel="" }) {
    return (
      <div className={`flex flex-col space-y-1 ${className}`}>
        {label && <label className={`text-sm font-medium text-white ${classNameLabel}`}>{label}</label>}
  
        <DatePicker
          selected={selectedDate}
          onChange={onChange}
          placeholderText={placeholder}
          className="px-4 py-2 rounded-lg bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200 w-full"
          dateFormat="dd/MM/yyyy"
          calendarClassName="bg-blue-700 text-white rounded-lg border border-blue-400 p-2 shadow-lg"
          dayClassName={date =>
            "hover:bg-blue-500 rounded-md transition-colors"
          }
        />
      </div>
    );
  }