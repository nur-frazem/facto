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
} from "@material-tailwind/react";
import {
  DocumentArrowDownIcon,
  PaperAirplaneIcon,
  PresentationChartLineIcon,
  Cog6ToothIcon,
  PowerIcon,
  Bars3Icon,
  HomeIcon,
} from "@heroicons/react/24/solid";
import { ChevronRightIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { useAuth, ROLES_LABELS } from "../context/AuthContext";

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

  const navigate = useNavigate();
  const location = useLocation();
  const { userData, tienePermiso, getRol } = useAuth();

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
    cursor-pointer text-slate-300
    hover:bg-white/10 hover:text-white
    active:bg-white/15
    transition-all duration-200
    rounded-lg mb-1
  `;

  const activeItemStyles = "bg-primary/50 text-white";

  const subItemStyles = `
    cursor-pointer text-slate-400
    hover:bg-white/5 hover:text-white
    active:bg-white/10
    transition-all duration-200
    rounded-lg text-sm
  `;

  // Verificar permisos para mostrar items del menú
  const puedeVerRecepcion = tienePermiso("VER_DOCUMENTOS") || tienePermiso("INGRESAR_DOCUMENTOS") || tienePermiso("PROCESAR_PAGOS");
  const puedeIngresarDocumentos = tienePermiso("INGRESAR_DOCUMENTOS");
  const puedeProcesarPagos = tienePermiso("PROCESAR_PAGOS");
  const puedeVerDocumentos = tienePermiso("VER_DOCUMENTOS");
  const puedeVerCalendario = tienePermiso("VER_CALENDARIO");
  const puedeVerInformes = tienePermiso("VER_INFORMES");
  const puedeVerConfiguracion = tienePermiso("VER_CONFIGURACION");

  // Obtener color del badge de rol
  const getRolBadgeColor = () => {
    const rol = getRol();
    switch (rol) {
      case "super_admin": return "bg-purple-500/30 text-purple-300 border-purple-500/50";
      case "admin": return "bg-blue-500/30 text-blue-300 border-blue-500/50";
      case "gestor": return "bg-green-500/30 text-green-300 border-green-500/50";
      case "digitador": return "bg-yellow-500/30 text-yellow-300 border-yellow-500/50";
      case "visor": return "bg-slate-500/30 text-slate-300 border-slate-500/50";
      default: return "bg-slate-500/30 text-slate-300 border-slate-500/50";
    }
  };

  return (
    <Card
      className={`
        h-full rounded-none
        p-3
        shadow-xl
        bg-gradient-to-b from-surface-light to-surface
        border-r border-white/5
        flex flex-col
        transition-all duration-300
        ${collapsed ? "w-[4.5rem]" : "w-64"}
        overflow-hidden
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4 px-2">
        {!collapsed && (
          <Typography variant="h5" className="text-white font-bold tracking-wide">
            FACTO
          </Typography>
        )}
        {!isLockedCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label={collapsed ? "Expandir" : "Contraer"}
          >
            <Bars3Icon className="h-5 w-5 text-slate-400" />
          </button>
        )}
      </div>

      {/* User info badge */}
      {!collapsed && userData && (
        <div className="mb-4 px-2">
          <div className={`px-3 py-2 rounded-lg border ${getRolBadgeColor()}`}>
            <p className="text-xs font-medium truncate">{userData.nombre || userData.email}</p>
            <p className="text-[10px] opacity-70">{ROLES_LABELS[getRol()] || getRol()}</p>
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
                className={`h-4 w-4 transition-transform text-slate-400 ${
                  openAccordions.recepcion ? "rotate-180" : ""
                } ${collapsed ? "hidden" : "block"}`}
              />
            }
          >
            <ListItem
              className={`p-0 ${isActiveSection("recepcion") && !openAccordions.recepcion ? activeItemStyles : ""}`}
              selected={openAccordions.recepcion}
              onClick={() => toggleAccordion("recepcion")}
            >
              <AccordionHeader
                className={`
                  border-b-0 p-3 flex items-center gap-2 rounded-lg
                  hover:bg-white/10 active:bg-white/15
                  transition-all duration-200
                  ${isActiveSection("recepcion") ? "text-white" : "text-slate-300"}
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
                        className={`${subItemStyles} ${isActive("/recepcion-index/ingresar") ? "bg-accent-blue/20 text-white" : ""}`}
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
                        className={`${subItemStyles} ${isActive("/recepcion-index/procesar") ? "bg-accent-blue/20 text-white" : ""}`}
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
                        className={`${subItemStyles} ${isActive("/recepcion-index/revision-documentos") ? "bg-accent-blue/20 text-white" : ""}`}
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
                        className={`${subItemStyles} ${isActive("/recepcion-index/calendario") ? "bg-accent-blue/20 text-white" : ""}`}
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

        {/* Emisión Accordion */}
        <Accordion
          open={openAccordions.emision}
          icon={
            <ChevronDownIcon
              strokeWidth={2.5}
              className={`h-4 w-4 transition-transform text-slate-400 ${
                openAccordions.emision ? "rotate-180" : ""
              } ${collapsed ? "hidden" : "block"}`}
            />
          }
        >
          <ListItem
            className="p-0"
            selected={openAccordions.emision}
            onClick={() => toggleAccordion("emision")}
          >
            <AccordionHeader
              className={`
                border-b-0 p-3 flex items-center gap-2 rounded-lg
                hover:bg-white/10 active:bg-white/15
                transition-all duration-200
                ${isActiveSection("emision") ? "text-white" : "text-slate-300"}
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

        {/* Divider */}
        <hr className={`my-3 border-white/10 ${collapsed ? "mx-2" : ""}`} />

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

        {/* Logout */}
        <ListItem
          onClick={handleLogout}
          className={`
            cursor-pointer text-slate-400
            hover:bg-danger/20 hover:text-danger
            active:bg-danger/30
            transition-all duration-200
            rounded-lg mt-2
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
