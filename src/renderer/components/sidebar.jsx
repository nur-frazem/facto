import React, { useState, useEffect } from "react";
import {
  Card,
  Typography,
  List,
  ListItem,
  ListItemPrefix,
  ListItemSuffix,
  Chip,
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
import { useNavigate } from "react-router-dom";

// Animación suave de apertura/cierre de accordion
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
  const [isLockedCollapsed, setIsLockedCollapsed] = useState(false); // Bloqueo

  const toggleAccordion = (name) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const navigate = useNavigate();

  // Detectar tamaño de pantalla y bloquear si es iPad o menor
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

    handleResize(); // Ejecutar en montaje
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Card
      className={`
        h-full rounded-none
        p-4 
        shadow-xl shadow-blue-gray-900/5
        bg-gradient-to-t from-sky-900 to-sky-950
        flex flex-col
        transition-width duration-300
        ${collapsed ? "w-20" : "w-72 max-w-[20rem]"}
        overflow-hidden
      `}
    >
      {/* Toggle button */}
      <div className="flex justify-between items-center mb-2 px-2">
        {!collapsed && (
          <Typography variant="h5" className="text-gray-100 cursor-default">
            FACTO
          </Typography>
        )}
        {!isLockedCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Bars3Icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </button>
        )}
      </div>

      <List className="flex-1 overflow-y-auto p-0">

        {/* Home */}
        <ListItem className="cursor-pointer text-gray-100 hover:bg-black/20  
                          active:bg-black/40 transition-all duration-300"
                  onClick={() => navigate("/home")}>
            <ListItemPrefix>
              <HomeIcon className="h-5 w-5 mr-2" />
            </ListItemPrefix>
            {!collapsed && "Home"}
        </ListItem>

        {/* recepcion Accordion */}
        <Accordion
          open={openAccordions.recepcion}
          icon={
            <ChevronDownIcon
              strokeWidth={2.5}
              className={`mx-auto h-4 w-4 transition-transform text-gray-100 ${
                openAccordions.recepcion ? "rotate-180" : ""
              } ${collapsed ? "hidden" : "block"}`}
            />
          }
        >
          <ListItem
            className="p-0"
            selected={openAccordions.recepcion}
            onClick={() => toggleAccordion("recepcion")}
            style={{ cursor: "pointer" }}
          >
            <AccordionHeader className="border-b-0 text-base p-3 flex items-center gap-2  rounded-lg hover:bg-black/20 
                                      active:bg-black/40  transition-all duration-300">
              <ListItemPrefix>
                <DocumentArrowDownIcon className="h-5 w-5 text-gray-100" />
              </ListItemPrefix>
              {!collapsed && (
                <Typography className="mr-auto font-normal text-gray-100">
                  Recepción
                </Typography>
              )}
            </AccordionHeader>
          </ListItem>
          {!collapsed && (
            <AccordionContent isOpen={openAccordions.recepcion}>
              <AccordionBody className="py-1 text-gray-100">
                <List className="p-0">
                  <ListItem className=" hover:bg-black/20 transition-all duration-100"
                            onClick={() => navigate("/recepcion-index/ingresar")}
                            >
                    <ListItemPrefix>
                      <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                    </ListItemPrefix>
                    Ingreso de documentos
                  </ListItem>
                  <ListItem className=" hover:bg-black/20 transition-all duration-100"
                            onClick={() => navigate("/recepcion-index/procesar")}
                            >
                    <ListItemPrefix>
                      <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                    </ListItemPrefix>
                    Procesar documentos
                  </ListItem>
                  <ListItem className= " hover:bg-black/20  transition-all duration-100"
                            onClick={() => navigate("/recepcion-index/revision-documentos")}
                  >
                    <ListItemPrefix>
                      <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                    </ListItemPrefix>
                    Revisión de documentos
                  </ListItem>
                </List>
              </AccordionBody>
            </AccordionContent>
          )}
        </Accordion>

        {/* Emisión Accordion */}
        <Accordion
          open={openAccordions.emision}
          icon={
            <ChevronDownIcon
              strokeWidth={2.5}
              className={`mx-auto h-4 w-4 transition-transform text-gray-100 ${
                openAccordions.emision ? "rotate-180" : ""
              } ${collapsed ? "hidden" : "block"}`}
            />
          }
        >
          <ListItem
            className="p-0"
            selected={openAccordions.emision}
            onClick={() => toggleAccordion("emision")}
            style={{ cursor: "pointer" }}
          >
            <AccordionHeader className="border-b-0 p-3 flex items-center gap-2 rounded-lg hover:bg-black/20 active:bg-black/40 transition-all duration-300">
              <ListItemPrefix>
                <PaperAirplaneIcon className="h-5 w-5 text-gray-100" />
              </ListItemPrefix>
              {!collapsed && (
                <Typography className="mr-auto font-normal text-gray-100">
                  Emisión
                </Typography>
              )}
            </AccordionHeader>
          </ListItem>
          {!collapsed && (
            <AccordionContent isOpen={openAccordions.emision}>
              <AccordionBody className="py-1 text-gray-100 ">
                <List className="p-0">
                  <ListItem className="hover:bg-black/20 transition-all duration-100">
                    <ListItemPrefix>
                      <ChevronRightIcon strokeWidth={3} className="h-3 w-5 " />
                    </ListItemPrefix>
                    Revisión de documentos
                  </ListItem>
                  <ListItem className="hover:bg-black/20 transition-all duration-100">
                    <ListItemPrefix>
                      <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                    </ListItemPrefix>
                    Modificar estados de pago
                  </ListItem>
                </List>
              </AccordionBody>
            </AccordionContent>
          )}
        </Accordion>

        <hr className={`my-2 border-blue-900 ${collapsed ? "mx-4" : ""}`} />


        <ListItem 
          onClick={() => navigate("/informes-index")}
          className="cursor-pointer text-gray-100 hover:bg-black/20 transition-all duration-300">
          <ListItemPrefix>
            <PresentationChartLineIcon className="h-5 w-5 mr-2" />
          </ListItemPrefix>
          {!collapsed && "Informes"}
        </ListItem>


        <ListItem className="cursor-pointer text-gray-100 hover:bg-black/20 transition-all duration-300"
          onClick={() => navigate("/configuracion-index")}
          >
          <ListItemPrefix>
            <Cog6ToothIcon className="h-5 w-5 mr-2" />
          </ListItemPrefix>
          {!collapsed && "Configuración"}
        </ListItem>


        <ListItem
          onClick={() => navigate("/")}
          className="cursor-pointer flex items-center gap-2 text-gray-100 hover:bg-black/20 transition-all duration-300"
        >
          <ListItemPrefix>
            <PowerIcon className="h-5 w-5" />
          </ListItemPrefix>
          {!collapsed && "Cerrar sesión"}
        </ListItem>
      </List>
    </Card>
  );
}
