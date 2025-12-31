import React, { useState, useEffect } from "react";
import {
  Card,
  Typography,
  List,
  ListItem,
  ListItemPrefix,
  Accordion,
  AccordionHeader,
  AccordionBody,
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
} from "@material-tailwind/react";
import {
  DocumentArrowDownIcon,
  PaperAirplaneIcon,
  PresentationChartLineIcon,
  Cog6ToothIcon,
  PowerIcon,
  Bars3Icon,
  HomeIcon,
  SwatchIcon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/solid";
import { ChevronRightIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { useAuth, ROLES_LABELS } from "../context/AuthContext";
import { useTheme, THEMES, THEMES_LABELS, TEXT_SIZES } from "../context/ThemeContext";

// Smooth accordion animation
function AccordionContent({ isOpen, children }) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [maxHeight, setMaxHeight] = useState(isOpen ? "1000px" : "0px");

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setMaxHeight("1000px");
    } else {
      setMaxHeight("0px");
      const timeoutId = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  return (
    <div
      style={{
        maxHeight,
        overflow: "hidden",
        transition: "max-height 0.3s ease",
      }}
    >
      {shouldRender && children}
    </div>
  );
}

export function SidebarWithContentSeparator() {
  const [openAccordions, setOpenAccordions] = useState({
    recepcion: false,
    emision: false,
  });
  const [collapsed, setCollapsed] = useState(false);
  const [isLockedCollapsed, setIsLockedCollapsed] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [textSizeMenuOpen, setTextSizeMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { userData, tienePermiso, tieneAcceso, getRol, getRoleData } = useAuth();
  const { theme, setTheme, isLightTheme, textSize, setTextSize, resetTextSize } = useTheme();

  const toggleAccordion = (name) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      navigate("/");
    }
  };

  // Detect screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setCollapsed(true);
        setIsLockedCollapsed(true);
      } else {
        setCollapsed(false);
        setIsLockedCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-open accordion based on current route
  useEffect(() => {
    if (location.pathname.includes("recepcion")) {
      setOpenAccordions(prev => ({ ...prev, recepcion: true }));
    } else if (location.pathname.includes("emision")) {
      setOpenAccordions(prev => ({ ...prev, emision: true }));
    }
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;
  const isActiveSection = (section) => location.pathname.includes(section);

  const listItemStyles = `
    cursor-pointer
    ${isLightTheme
      ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200"
      : "text-slate-300 hover:bg-white/10 hover:text-white active:bg-white/15"
    }
    transition-all duration-200
    rounded-lg mb-1
  `;

  const activeItemStyles = isLightTheme
    ? "bg-blue-100 text-blue-700"
    : "bg-primary/50 text-white";

  const subItemStyles = `
    cursor-pointer
    ${isLightTheme
      ? "text-gray-500 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200"
      : "text-slate-400 hover:bg-white/5 hover:text-white active:bg-white/10"
    }
    transition-all duration-200
    rounded-lg text-sm
  `;

  // Verificar permisos para mostrar items del menú (nuevo sistema de permisos)
  const puedeVerRecepcion = tieneAcceso("RECEPCION") || tieneAcceso("RECEPCION_INDEX");
  const puedeIngresarDocumentos = tieneAcceso("RECEPCION_INGRESAR");
  const puedeProcesarPagos = tieneAcceso("RECEPCION_PROCESAR");
  const puedeVerDocumentos = tieneAcceso("RECEPCION_REVISION");
  const puedeVerCalendario = tieneAcceso("RECEPCION_CALENDARIO");
  const puedeVerEmision = tieneAcceso("EMISION") || tieneAcceso("EMISION_INDEX");
  const puedeVerInformes = tieneAcceso("INFORMES") || tieneAcceso("INFORMES_INDEX");
  const puedeVerConfiguracion = tieneAcceso("CONFIGURACION") || tieneAcceso("CONFIGURACION_INDEX");

  // Obtener color del badge de rol
  const getRolBadgeColor = () => {
    const rol = getRol();
    const roleData = getRoleData(rol);

    // Si el rol tiene color personalizado
    if (roleData?.color) {
      return "border-2"; // Use inline styles for custom colors
    }

    // Default role colors (fallback)
    if (isLightTheme) {
      switch (rol) {
        case "super_admin": return "bg-purple-100 text-purple-700 border-purple-300";
        case "admin": return "bg-blue-100 text-blue-700 border-blue-300";
        case "gestor": return "bg-green-100 text-green-700 border-green-300";
        case "digitador": return "bg-yellow-100 text-yellow-700 border-yellow-300";
        case "visor": return "bg-slate-100 text-slate-700 border-slate-300";
        default: return "bg-slate-100 text-slate-700 border-slate-300";
      }
    } else {
      switch (rol) {
        case "super_admin": return "bg-purple-500/30 text-purple-300 border-purple-500/50";
        case "admin": return "bg-blue-500/30 text-blue-300 border-blue-500/50";
        case "gestor": return "bg-green-500/30 text-green-300 border-green-500/50";
        case "digitador": return "bg-yellow-500/30 text-yellow-300 border-yellow-500/50";
        case "visor": return "bg-slate-500/30 text-slate-300 border-slate-500/50";
        default: return "bg-slate-500/30 text-slate-300 border-slate-500/50";
      }
    }
  };

  // Get inline style for role badge with custom color
  const getRolBadgeStyle = () => {
    const rol = getRol();
    const roleData = getRoleData(rol);
    if (roleData?.color) {
      return {
        backgroundColor: `${roleData.color}20`,
        color: roleData.color,
        borderColor: `${roleData.color}50`
      };
    }
    return {};
  };

  // Get role label (supports custom roles)
  const getRoleLabel = () => {
    const rol = getRol();
    const roleData = getRoleData(rol);
    if (roleData?.nombre) {
      return roleData.nombre;
    }
    return ROLES_LABELS[rol] || rol;
  };

  return (
    <Card
      className={`
        h-full rounded-none
        p-3
        shadow-xl
        border-r
        flex flex-col
        transition-all duration-300
        ${collapsed ? "w-[4.5rem]" : "w-64"}
        overflow-hidden
        ${isLightTheme
          ? "bg-gradient-to-b from-white to-gray-50 border-gray-200"
          : "bg-gradient-to-b from-surface-light to-surface border-white/5"
        }
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4 px-2">
        {!collapsed && (
          <Typography variant="h5" className={`font-bold tracking-wide ${isLightTheme ? "text-gray-800" : "text-white"}`}>
            FACTO
          </Typography>
        )}
        {!isLockedCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`p-2 rounded-lg transition-colors ${isLightTheme ? "hover:bg-gray-200" : "hover:bg-white/10"}`}
            aria-label={collapsed ? "Expandir" : "Contraer"}
          >
            <Bars3Icon className={`h-5 w-5 ${isLightTheme ? "text-gray-500" : "text-slate-400"}`} />
          </button>
        )}
      </div>

      {/* User info badge */}
      {!collapsed && userData && (
        <div className="mb-4 px-2">
          <div className={`px-3 py-2 rounded-lg border ${getRolBadgeColor()}`} style={getRolBadgeStyle()}>
            <p className="text-xs font-medium truncate">{userData.nombre || userData.email}</p>
            <p className="text-[10px] opacity-70">{getRoleLabel()}</p>
          </div>
        </div>
      )}

      <List className="flex-1 overflow-y-auto p-0 pb-14 scrollbar-custom">
        {/* Home */}
        <ListItem
          className={`${listItemStyles} ${isActive("/home") ? activeItemStyles : ""}`}
          onClick={() => navigate("/home")}
        >
          <ListItemPrefix>
            <HomeIcon className="h-5 w-5" />
          </ListItemPrefix>
          {!collapsed && <span className="ml-2">Inicio</span>}
        </ListItem>

        {/* Recepción Accordion - Solo si tiene algún permiso de recepción */}
        {puedeVerRecepcion && (
          <Accordion
            open={openAccordions.recepcion}
            icon={
              <ChevronDownIcon
                strokeWidth={2.5}
                className={`h-4 w-4 transition-transform ${isLightTheme ? "text-gray-400" : "text-slate-400"} ${
                  openAccordions.recepcion ? "rotate-180" : ""
                } ${collapsed ? "hidden" : "block"}`}
              />
            }
          >
            <ListItem
              className={`p-0 ${isActiveSection("recepcion") && !openAccordions.recepcion ? activeItemStyles : ""}`}
              selected={openAccordions.recepcion}
              onClick={() => collapsed ? navigate("/recepcion-index") : toggleAccordion("recepcion")}
            >
              <AccordionHeader
                className={`
                  border-b-0 p-3 flex items-center gap-2 rounded-lg
                  transition-all duration-200
                  ${isLightTheme
                    ? "hover:bg-gray-100 active:bg-gray-200"
                    : "hover:bg-white/10 active:bg-white/15"
                  }
                  ${isActiveSection("recepcion")
                    ? (isLightTheme ? "text-blue-700" : "text-white")
                    : (isLightTheme ? "text-gray-600" : "text-slate-300")
                  }
                `}
              >
                <ListItemPrefix>
                  <DocumentArrowDownIcon className="h-5 w-5" />
                </ListItemPrefix>
                {!collapsed && (
                  <Typography className="mr-auto font-medium text-sm">
                    Recepción
                  </Typography>
                )}
              </AccordionHeader>
            </ListItem>

            {!collapsed && (
              <AccordionContent isOpen={openAccordions.recepcion}>
                <AccordionBody className="py-1">
                  <List className="p-0 pl-4">
                    {/* Ingreso de documentos - Solo si puede ingresar */}
                    {puedeIngresarDocumentos && (
                      <ListItem
                        className={`${subItemStyles} ${isActive("/recepcion-index/ingresar") ? (isLightTheme ? "bg-blue-100 text-blue-700" : "bg-accent-blue/20 text-white") : ""}`}
                        onClick={() => navigate("/recepcion-index/ingresar")}
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={2} className="h-3 w-3" />
                        </ListItemPrefix>
                        <span className="ml-1">Ingreso de documentos</span>
                      </ListItem>
                    )}

                    {/* Procesar documentos - Solo si puede procesar pagos */}
                    {puedeProcesarPagos && (
                      <ListItem
                        className={`${subItemStyles} ${isActive("/recepcion-index/procesar") ? (isLightTheme ? "bg-blue-100 text-blue-700" : "bg-accent-blue/20 text-white") : ""}`}
                        onClick={() => navigate("/recepcion-index/procesar")}
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={2} className="h-3 w-3" />
                        </ListItemPrefix>
                        <span className="ml-1">Procesar documentos</span>
                      </ListItem>
                    )}

                    {/* Revisión de documentos - Todos los que pueden ver documentos */}
                    {puedeVerDocumentos && (
                      <ListItem
                        className={`${subItemStyles} ${isActive("/recepcion-index/revision-documentos") ? (isLightTheme ? "bg-blue-100 text-blue-700" : "bg-accent-blue/20 text-white") : ""}`}
                        onClick={() => navigate("/recepcion-index/revision-documentos")}
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={2} className="h-3 w-3" />
                        </ListItemPrefix>
                        <span className="ml-1">Revisión de documentos</span>
                      </ListItem>
                    )}

                    {/* Calendario - Todos los que pueden ver calendario */}
                    {puedeVerCalendario && (
                      <ListItem
                        className={`${subItemStyles} ${isActive("/recepcion-index/calendario") ? (isLightTheme ? "bg-blue-100 text-blue-700" : "bg-accent-blue/20 text-white") : ""}`}
                        onClick={() => navigate("/recepcion-index/calendario")}
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={2} className="h-3 w-3" />
                        </ListItemPrefix>
                        <span className="ml-1">Calendario interactivo</span>
                      </ListItem>
                    )}
                  </List>
                </AccordionBody>
              </AccordionContent>
            )}
          </Accordion>
        )}

        {/* Emisión Accordion - Solo si tiene permiso de emisión */}
        {puedeVerEmision && (
          <Accordion
            open={openAccordions.emision}
            icon={
              <ChevronDownIcon
                strokeWidth={2.5}
                className={`h-4 w-4 transition-transform ${isLightTheme ? "text-gray-400" : "text-slate-400"} ${
                  openAccordions.emision ? "rotate-180" : ""
                } ${collapsed ? "hidden" : "block"}`}
              />
            }
          >
            <ListItem
              className={`p-0 ${isActiveSection("emision") && !openAccordions.emision ? activeItemStyles : ""}`}
              selected={openAccordions.emision}
              onClick={() => collapsed ? navigate("/emision-index") : toggleAccordion("emision")}
            >
              <AccordionHeader
                className={`
                  border-b-0 p-3 flex items-center gap-2 rounded-lg
                  transition-all duration-200
                  ${isLightTheme
                    ? "hover:bg-gray-100 active:bg-gray-200"
                    : "hover:bg-white/10 active:bg-white/15"
                  }
                  ${isActiveSection("emision")
                    ? (isLightTheme ? "text-blue-700" : "text-white")
                    : (isLightTheme ? "text-gray-600" : "text-slate-300")
                  }
                `}
              >
                <ListItemPrefix>
                  <PaperAirplaneIcon className="h-5 w-5" />
                </ListItemPrefix>
                {!collapsed && (
                  <Typography className="mr-auto font-medium text-sm">
                    Emisión
                  </Typography>
                )}
              </AccordionHeader>
            </ListItem>

            {!collapsed && (
              <AccordionContent isOpen={openAccordions.emision}>
                <AccordionBody className="py-1">
                  <List className="p-0 pl-4">
                    <ListItem className={subItemStyles}>
                      <ListItemPrefix>
                        <ChevronRightIcon strokeWidth={2} className="h-3 w-3" />
                      </ListItemPrefix>
                      <span className="ml-1">Revisión de documentos</span>
                    </ListItem>

                    <ListItem className={subItemStyles}>
                      <ListItemPrefix>
                        <ChevronRightIcon strokeWidth={2} className="h-3 w-3" />
                      </ListItemPrefix>
                      <span className="ml-1">Estados de pago</span>
                    </ListItem>
                  </List>
                </AccordionBody>
              </AccordionContent>
            )}
          </Accordion>
        )}

        {/* Divider */}
        <hr className={`my-3 ${isLightTheme ? "border-gray-200" : "border-white/10"} ${collapsed ? "mx-2" : ""}`} />

        {/* Informes - Solo si tiene permiso */}
        {puedeVerInformes && (
          <ListItem
            onClick={() => navigate("/informes-index")}
            className={`${listItemStyles} ${isActive("/informes-index") ? activeItemStyles : ""}`}
          >
            <ListItemPrefix>
              <PresentationChartLineIcon className="h-5 w-5" />
            </ListItemPrefix>
            {!collapsed && <span className="ml-2">Informes</span>}
          </ListItem>
        )}

        {/* Configuración - Solo si tiene permiso */}
        {puedeVerConfiguracion && (
          <ListItem
            onClick={() => navigate("/configuracion-index")}
            className={`${listItemStyles} ${isActiveSection("configuracion") ? activeItemStyles : ""}`}
          >
            <ListItemPrefix>
              <Cog6ToothIcon className="h-5 w-5" />
            </ListItemPrefix>
            {!collapsed && <span className="ml-2">Configuración</span>}
          </ListItem>
        )}

        {/* Spacer */}
        <div className="flex-grow" />

        {/* Text Size Selector */}
        <Menu
          open={textSizeMenuOpen}
          handler={setTextSizeMenuOpen}
          placement="right-start"
          offset={8}
        >
          <MenuHandler>
            <ListItem
              className={`
                cursor-pointer
                hover:bg-accent-blue/20 hover:text-accent-blue
                active:bg-accent-blue/30
                transition-all duration-200
                rounded-lg mb-1
                ${isLightTheme ? "text-slate-600" : "text-slate-300"}
              `}
            >
              <ListItemPrefix>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h12M3 18h18M17 12l4 4m0 0l-4 4m4-4H13" />
                </svg>
              </ListItemPrefix>
              {!collapsed && <span className="ml-2">Texto</span>}
            </ListItem>
          </MenuHandler>
          <MenuList
            className={`
              min-w-[200px] p-3 rounded-lg
              border shadow-lg z-[9999]
              ${isLightTheme
                ? "bg-white border-gray-200"
                : "bg-gradient-to-br from-surface-light to-surface border-white/10"
              }
            `}
          >
            <div className="px-1">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium ${isLightTheme ? "text-gray-700" : "text-white"}`}>
                  Tamaño de texto
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${isLightTheme ? "bg-gray-100 text-gray-600" : "bg-white/10 text-slate-300"}`}>
                  {textSize}%
                </span>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs ${isLightTheme ? "text-gray-500" : "text-slate-400"}`}>A</span>
                <input
                  type="range"
                  min={TEXT_SIZES.MIN}
                  max={TEXT_SIZES.MAX}
                  step={TEXT_SIZES.STEP}
                  value={textSize}
                  onChange={(e) => setTextSize(parseInt(e.target.value, 10))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-accent-blue"
                  style={{
                    background: isLightTheme
                      ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((textSize - TEXT_SIZES.MIN) / (TEXT_SIZES.MAX - TEXT_SIZES.MIN)) * 100}%, #e5e7eb ${((textSize - TEXT_SIZES.MIN) / (TEXT_SIZES.MAX - TEXT_SIZES.MIN)) * 100}%, #e5e7eb 100%)`
                      : `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((textSize - TEXT_SIZES.MIN) / (TEXT_SIZES.MAX - TEXT_SIZES.MIN)) * 100}%, #374151 ${((textSize - TEXT_SIZES.MIN) / (TEXT_SIZES.MAX - TEXT_SIZES.MIN)) * 100}%, #374151 100%)`
                  }}
                />
                <span className={`text-base font-medium ${isLightTheme ? "text-gray-500" : "text-slate-400"}`}>A</span>
              </div>

              <button
                onClick={resetTextSize}
                disabled={textSize === TEXT_SIZES.DEFAULT}
                className={`
                  w-full py-1.5 px-3 rounded-lg text-xs font-medium transition-colors
                  ${textSize === TEXT_SIZES.DEFAULT
                    ? (isLightTheme ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white/5 text-slate-500 cursor-not-allowed")
                    : (isLightTheme ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-white/10 text-slate-300 hover:bg-white/20")
                  }
                `}
              >
                Restablecer ({TEXT_SIZES.DEFAULT}%)
              </button>
            </div>
          </MenuList>
        </Menu>

        {/* Theme Selector */}
        <Menu
          open={themeMenuOpen}
          handler={setThemeMenuOpen}
          placement="right-start"
          offset={8}
        >
          <MenuHandler>
            <ListItem
              className={`
                cursor-pointer
                hover:bg-accent-blue/20 hover:text-accent-blue
                active:bg-accent-blue/30
                transition-all duration-200
                rounded-lg mb-1
                ${isLightTheme ? "text-slate-600" : "text-slate-300"}
              `}
            >
              <ListItemPrefix>
                <SwatchIcon className="h-5 w-5" />
              </ListItemPrefix>
              {!collapsed && <span className="ml-2">Temas</span>}
            </ListItem>
          </MenuHandler>
          <MenuList
            className={`
              min-w-[160px] p-2 rounded-lg
              border shadow-lg z-[9999]
              ${isLightTheme
                ? "bg-white border-gray-200"
                : "bg-gradient-to-br from-surface-light to-surface border-white/10"
              }
            `}
          >
            <MenuItem
              onClick={() => setTheme(THEMES.ORIGINAL)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-colors cursor-pointer
                ${theme === THEMES.ORIGINAL
                  ? "bg-accent-blue/20 text-accent-blue"
                  : isLightTheme
                    ? "text-gray-700 hover:bg-gray-100"
                    : "text-white hover:bg-white/10"
                }
              `}
            >
              <MoonIcon className="h-4 w-4" />
              <span className="text-sm font-medium">{THEMES_LABELS[THEMES.ORIGINAL]}</span>
              {theme === THEMES.ORIGINAL && (
                <svg className="h-4 w-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </MenuItem>
            <MenuItem
              onClick={() => setTheme(THEMES.CLARO)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-colors cursor-pointer
                ${theme === THEMES.CLARO
                  ? "bg-accent-blue/20 text-accent-blue"
                  : isLightTheme
                    ? "text-gray-700 hover:bg-gray-100"
                    : "text-white hover:bg-white/10"
                }
              `}
            >
              <SunIcon className="h-4 w-4" />
              <span className="text-sm font-medium">{THEMES_LABELS[THEMES.CLARO]}</span>
              {theme === THEMES.CLARO && (
                <svg className="h-4 w-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </MenuItem>
          </MenuList>
        </Menu>

        {/* Logout */}
        <ListItem
          onClick={handleLogout}
          className={`
            cursor-pointer
            hover:bg-danger/20 hover:text-danger
            active:bg-danger/30
            transition-all duration-200
            rounded-lg mt-1
            ${isLightTheme ? "text-slate-500" : "text-slate-400"}
          `}
        >
          <ListItemPrefix>
            <PowerIcon className="h-5 w-5" />
          </ListItemPrefix>
          {!collapsed && <span className="ml-2">Cerrar sesión</span>}
        </ListItem>
      </List>
    </Card>
  );
}
