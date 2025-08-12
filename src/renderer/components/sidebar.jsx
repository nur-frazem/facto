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
  PresentationChartBarIcon,
  ShoppingBagIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  InboxIcon,
  PowerIcon,
  Bars3Icon,
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
    dashboard: false,
    ecommerce: false,
  });
  const [collapsed, setCollapsed] = useState(false);

  const toggleAccordion = (name) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const navigate = useNavigate();

  return (
    <Card
      className={`
        h-full 
        p-4 
        shadow-xl shadow-blue-gray-900/5 
        backdrop-brightness-75
        flex flex-col
        transition-width duration-300
        ${collapsed ? "w-20" : "w-64 max-w-[20rem]"}
        overflow-hidden
      `}
    >
      {/* Toggle button */}
      <div className="flex justify-between items-center mb-2 px-2">
        {!collapsed && (
          <Typography variant="h5" className="text-gray-100">
            FACTO
          </Typography>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Bars3Icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      <List className="flex-1 overflow-y-auto p-0">
        {/* Dashboard Accordion */}
        <Accordion
          open={openAccordions.dashboard}
          icon={
            <ChevronDownIcon
              strokeWidth={2.5}
              className={`mx-auto h-4 w-4 transition-transform text-gray-100 ${
                openAccordions.dashboard ? "rotate-180" : ""
              } ${collapsed ? "hidden" : "block"}`}
            />
          }
        >
          <ListItem
            className="p-0"
            selected={openAccordions.dashboard}
            onClick={() => toggleAccordion("dashboard")}
            style={{ cursor: "pointer" }}
          >
            <AccordionHeader className="border-b-0 p-3 flex items-center gap-2">
              <ListItemPrefix>
                <PresentationChartBarIcon className="h-5 w-5 text-gray-100" />
              </ListItemPrefix>
              {!collapsed && (
                <Typography className="mr-auto font-normal text-gray-100">
                  Dashboard
                </Typography>
              )}
            </AccordionHeader>
          </ListItem>
          {!collapsed && (
            <AccordionContent isOpen={openAccordions.dashboard}>
              <AccordionBody className="py-1 text-gray-100">
                <List className="p-0">
                  <ListItem>
                    <ListItemPrefix>
                      <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                    </ListItemPrefix>
                    Analytics
                  </ListItem>
                  <ListItem>
                    <ListItemPrefix>
                      <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                    </ListItemPrefix>
                    Reporting
                  </ListItem>
                  <ListItem>
                    <ListItemPrefix>
                      <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                    </ListItemPrefix>
                    Projects
                  </ListItem>
                </List>
              </AccordionBody>
            </AccordionContent>
          )}
        </Accordion>

        {/* E-Commerce Accordion */}
        <Accordion
          open={openAccordions.ecommerce}
          icon={
            <ChevronDownIcon
              strokeWidth={2.5}
              className={`mx-auto h-4 w-4 transition-transform text-gray-100 ${
                openAccordions.ecommerce ? "rotate-180" : ""
              } ${collapsed ? "hidden" : "block"}`}
            />
          }
        >
          <ListItem
            className="p-0"
            selected={openAccordions.ecommerce}
            onClick={() => toggleAccordion("ecommerce")}
            style={{ cursor: "pointer" }}
          >
            <AccordionHeader className="border-b-0 p-3 flex items-center gap-2">
              <ListItemPrefix>
                <ShoppingBagIcon className="h-5 w-5 text-gray-100" />
              </ListItemPrefix>
              {!collapsed && (
                <Typography className="mr-auto font-normal text-gray-100">
                  E-Commerce
                </Typography>
              )}
            </AccordionHeader>
          </ListItem>
          {!collapsed && (
            <AccordionContent isOpen={openAccordions.ecommerce}>
              <AccordionBody className="py-1 text-gray-100">
                <List className="p-0">
                  <ListItem>
                    <ListItemPrefix>
                      <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                    </ListItemPrefix>
                    Orders
                  </ListItem>
                  <ListItem>
                    <ListItemPrefix>
                      <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                    </ListItemPrefix>
                    Products
                  </ListItem>
                </List>
              </AccordionBody>
            </AccordionContent>
          )}
        </Accordion>

        <hr className={`my-2 border-blue-900 ${collapsed ? "mx-4" : ""}`} />

        <ListItem className="cursor-pointer text-gray-100">
          <ListItemPrefix>
            <InboxIcon className="h-5 w-5 text-gray-100" />
          </ListItemPrefix>
          {!collapsed && "Inbox"}
          <ListItemSuffix>
            {!collapsed && (
              <Chip
                value="14"
                size="sm"
                variant="ghost"
                className="rounded-full text-gray-100"
              />
            )}
          </ListItemSuffix>
        </ListItem>
        <ListItem className="cursor-pointer text-gray-100">
          <ListItemPrefix>
            <UserCircleIcon className="h-5 w-5" />
          </ListItemPrefix>
          {!collapsed && "Profile"}
        </ListItem>
        <ListItem className="cursor-pointer text-gray-100">
          <ListItemPrefix>
            <Cog6ToothIcon className="h-5 w-5" />
          </ListItemPrefix>
          {!collapsed && "Settings"}
        </ListItem>
        <ListItem
          onClick={() => navigate("/")}
          className="cursor-pointer flex items-center gap-2 text-gray-100"
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
