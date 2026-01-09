// Permisos de acceso a vistas (jerárquicos)
export const PERMISOS_ACCESO = {
  RECEPCION: {
    key: 'RECEPCION',
    label: 'Recepción',
    children: {
      RECEPCION_INDEX: {
        key: 'RECEPCION_INDEX',
        label: 'Dashboard de recepción',
        route: '/recepcion-index',
      },
      RECEPCION_INGRESAR: {
        key: 'RECEPCION_INGRESAR',
        label: 'Ingreso de documentos',
        route: '/recepcion-index/ingresar',
      },
      RECEPCION_PROCESAR: {
        key: 'RECEPCION_PROCESAR',
        label: 'Procesar documentos',
        route: '/recepcion-index/procesar',
      },
      RECEPCION_REVISION: {
        key: 'RECEPCION_REVISION',
        label: 'Revisión de documentos',
        route: '/recepcion-index/revision-documentos',
      },
      RECEPCION_CALENDARIO: {
        key: 'RECEPCION_CALENDARIO',
        label: 'Calendario interactivo',
        route: '/recepcion-index/calendario',
      },
    },
  },
  EMISION: {
    key: 'EMISION',
    label: 'Emisión',
    children: {
      EMISION_INDEX: {
        key: 'EMISION_INDEX',
        label: 'Dashboard de emisión',
        route: '/emision-index',
      },
    },
  },
  CONFIGURACION: {
    key: 'CONFIGURACION',
    label: 'Configuración',
    children: {
      CONFIGURACION_INDEX: {
        key: 'CONFIGURACION_INDEX',
        label: 'Panel de configuración',
        route: '/configuracion-index',
      },
      CONFIGURACION_CUENTA: {
        key: 'CONFIGURACION_CUENTA',
        label: 'Mi cuenta',
        route: '/configuracion-cuenta',
      },
      CONFIGURACION_EMPRESAS: {
        key: 'CONFIGURACION_EMPRESAS',
        label: 'Clientes/Proveedores',
        route: '/configuracion-clientesProveedores',
      },
      CONFIGURACION_ROLES: {
        key: 'CONFIGURACION_ROLES',
        label: 'Gestión de usuarios y roles',
        route: '/configuracion-roles',
      },
      CONFIGURACION_AUDITORIA: {
        key: 'CONFIGURACION_AUDITORIA',
        label: 'Auditoría',
        route: '/configuracion-auditoria',
      },
      CONFIGURACION_CUENTAS_BANCARIAS: {
        key: 'CONFIGURACION_CUENTAS_BANCARIAS',
        label: 'Cuentas Bancarias',
        route: '/configuracion-cuentasBancarias',
      },
    },
  },
  INFORMES: {
    key: 'INFORMES',
    label: 'Informes',
    children: {
      INFORMES_INDEX: {
        key: 'INFORMES_INDEX',
        label: 'Dashboard de informes',
        route: '/informes-index',
      },
    },
  },
};

// Permisos de acciones (planos, agrupados por sección)
export const PERMISOS_ACCIONES = {
  REVISION_VER: {
    key: 'REVISION_VER',
    label: 'Ver detalles de documento',
    grupo: 'Revisión de Documentos',
  },
  REVISION_DESCARGAR: {
    key: 'REVISION_DESCARGAR',
    label: 'Descargar PDF de egreso',
    grupo: 'Revisión de Documentos',
  },
  REVISION_EDITAR: {
    key: 'REVISION_EDITAR',
    label: 'Editar documento',
    grupo: 'Revisión de Documentos',
  },
  REVISION_ELIMINAR: {
    key: 'REVISION_ELIMINAR',
    label: 'Eliminar documento / Reversar pagos',
    grupo: 'Revisión de Documentos',
  },
  PROCESAR_PAGO: {
    key: 'PROCESAR_PAGO',
    label: 'Procesar pago de documentos',
    grupo: 'Procesar Documentos',
  },
  CUENTAS_BANCARIAS_CREAR: {
    key: 'CUENTAS_BANCARIAS_CREAR',
    label: 'Crear cuenta bancaria',
    grupo: 'Cuentas Bancarias',
  },
  CUENTAS_BANCARIAS_EDITAR: {
    key: 'CUENTAS_BANCARIAS_EDITAR',
    label: 'Editar cuenta bancaria',
    grupo: 'Cuentas Bancarias',
  },
  CUENTAS_BANCARIAS_ELIMINAR: {
    key: 'CUENTAS_BANCARIAS_ELIMINAR',
    label: 'Eliminar cuenta bancaria',
    grupo: 'Cuentas Bancarias',
  },
};

// Paleta de colores predefinidos para roles
export const ROLE_COLORS = [
  '#EF4444', // Red (brighter, visible on dark theme)
  '#F97316', // Orange (brighter)
  '#EAB308', // Yellow (brighter)
  '#22C55E', // Green (brighter)
  '#14B8A6', // Teal (brighter)
  '#3B82F6', // Blue (brighter)
  '#8B5CF6', // Purple (brighter)
  '#EC4899', // Pink (brighter)
  '#9CA3AF', // Gray (brighter)
];

// Helper para obtener todas las keys de permisos de acceso
const getAllAccessPermissionKeys = () => {
  const keys = [];
  Object.values(PERMISOS_ACCESO).forEach((parent) => {
    keys.push(parent.key);
    if (parent.children) {
      Object.values(parent.children).forEach((child) => {
        keys.push(child.key);
      });
    }
  });
  return keys;
};

// Helper para obtener todas las keys de permisos de acciones
const getAllActionPermissionKeys = () => {
  return Object.values(PERMISOS_ACCIONES).map((p) => p.key);
};

// Crear objeto de permisos con todos en true
const allPermissionsTrue = () => {
  const permisos = {};
  getAllAccessPermissionKeys().forEach((key) => {
    permisos[key] = true;
  });
  getAllActionPermissionKeys().forEach((key) => {
    permisos[key] = true;
  });
  return permisos;
};

// Roles por defecto del sistema (protegidos, no se pueden editar ni eliminar)
export const DEFAULT_ROLES = {
  super_admin: {
    id: 'super_admin',
    nombre: 'Super Administrador',
    descripcion: 'Acceso total al sistema, puede asignar administradores',
    color: '#EF4444',
    isDefault: true,
    permisos: {
      ...allPermissionsTrue(),
      ASIGNAR_ADMIN: true, // Permiso especial solo para super_admin
    },
  },
  admin: {
    id: 'admin',
    nombre: 'Administrador',
    descripcion: 'Acceso total excepto asignación de administradores',
    color: '#3B82F6',
    isDefault: true,
    permisos: {
      ...allPermissionsTrue(),
      ASIGNAR_ADMIN: false,
    },
  },
  gestor: {
    id: 'gestor',
    nombre: 'Gestor',
    descripcion: 'Acceso a recepción e informes con todas las acciones',
    color: '#22C55E',
    isDefault: true,
    permisos: {
      // Acceso a vistas
      RECEPCION: true,
      RECEPCION_INDEX: true,
      RECEPCION_INGRESAR: true,
      RECEPCION_PROCESAR: true,
      RECEPCION_REVISION: true,
      RECEPCION_CALENDARIO: true,
      EMISION: false,
      EMISION_INDEX: false,
      CONFIGURACION: false,
      CONFIGURACION_INDEX: false,
      CONFIGURACION_CUENTA: true, // Siempre puede ver su cuenta
      CONFIGURACION_EMPRESAS: false,
      CONFIGURACION_ROLES: false,
      CONFIGURACION_AUDITORIA: false,
      CONFIGURACION_CUENTAS_BANCARIAS: false,
      INFORMES: true,
      INFORMES_INDEX: true,
      // Acciones
      REVISION_VER: true,
      REVISION_DESCARGAR: true,
      REVISION_EDITAR: true,
      REVISION_ELIMINAR: true,
      PROCESAR_PAGO: true,
      CUENTAS_BANCARIAS_CREAR: false,
      CUENTAS_BANCARIAS_EDITAR: false,
      CUENTAS_BANCARIAS_ELIMINAR: false,
      ASIGNAR_ADMIN: false,
    },
  },
  digitador: {
    id: 'digitador',
    nombre: 'Digitador',
    descripcion: 'Puede ingresar documentos y ver detalles',
    color: '#EAB308',
    isDefault: true,
    permisos: {
      // Acceso a vistas
      RECEPCION: true,
      RECEPCION_INDEX: true,
      RECEPCION_INGRESAR: true,
      RECEPCION_PROCESAR: false,
      RECEPCION_REVISION: true,
      RECEPCION_CALENDARIO: true,
      EMISION: false,
      EMISION_INDEX: false,
      CONFIGURACION: false,
      CONFIGURACION_INDEX: false,
      CONFIGURACION_CUENTA: true,
      CONFIGURACION_EMPRESAS: false,
      CONFIGURACION_ROLES: false,
      CONFIGURACION_AUDITORIA: false,
      CONFIGURACION_CUENTAS_BANCARIAS: false,
      INFORMES: false,
      INFORMES_INDEX: false,
      // Acciones
      REVISION_VER: true,
      REVISION_DESCARGAR: false,
      REVISION_EDITAR: false,
      REVISION_ELIMINAR: false,
      PROCESAR_PAGO: false,
      CUENTAS_BANCARIAS_CREAR: false,
      CUENTAS_BANCARIAS_EDITAR: false,
      CUENTAS_BANCARIAS_ELIMINAR: false,
      ASIGNAR_ADMIN: false,
    },
  },
  visor: {
    id: 'visor',
    nombre: 'Visor',
    descripcion: 'Solo puede ver documentos, sin modificar',
    color: '#9CA3AF',
    isDefault: true,
    permisos: {
      // Acceso a vistas
      RECEPCION: true,
      RECEPCION_INDEX: true,
      RECEPCION_INGRESAR: false,
      RECEPCION_PROCESAR: false,
      RECEPCION_REVISION: true,
      RECEPCION_CALENDARIO: true,
      EMISION: false,
      EMISION_INDEX: false,
      CONFIGURACION: false,
      CONFIGURACION_INDEX: false,
      CONFIGURACION_CUENTA: true,
      CONFIGURACION_EMPRESAS: false,
      CONFIGURACION_ROLES: false,
      CONFIGURACION_AUDITORIA: false,
      CONFIGURACION_CUENTAS_BANCARIAS: false,
      INFORMES: false,
      INFORMES_INDEX: false,
      // Acciones
      REVISION_VER: true,
      REVISION_DESCARGAR: false,
      REVISION_EDITAR: false,
      REVISION_ELIMINAR: false,
      PROCESAR_PAGO: false,
      CUENTAS_BANCARIAS_CREAR: false,
      CUENTAS_BANCARIAS_EDITAR: false,
      CUENTAS_BANCARIAS_ELIMINAR: false,
      ASIGNAR_ADMIN: false,
    },
  },
};

// Labels para mostrar en la UI
export const ROLES_LABELS = {
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  gestor: 'Gestor',
  digitador: 'Digitador',
  visor: 'Visor',
};

// Helper para crear un rol vacío (para el formulario de creación)
export const createEmptyRole = () => {
  const permisos = {};
  getAllAccessPermissionKeys().forEach((key) => {
    permisos[key] = false;
  });
  getAllActionPermissionKeys().forEach((key) => {
    permisos[key] = false;
  });
  // Siempre permitir acceso a la cuenta propia
  permisos.CONFIGURACION_CUENTA = true;

  return {
    id: '',
    nombre: '',
    descripcion: '',
    color: ROLE_COLORS[5], // Azul por defecto
    isDefault: false,
    permisos,
  };
};

// Helper para obtener todos los permisos de acceso como lista plana con jerarquía
export const getAccessPermissionsList = () => {
  const list = [];
  Object.values(PERMISOS_ACCESO).forEach((parent) => {
    list.push({ ...parent, isParent: true, children: Object.values(parent.children) });
  });
  return list;
};

// Helper para obtener permisos de acciones agrupados
export const getActionPermissionsGrouped = () => {
  const groups = {};
  Object.values(PERMISOS_ACCIONES).forEach((permission) => {
    if (!groups[permission.grupo]) {
      groups[permission.grupo] = [];
    }
    groups[permission.grupo].push(permission);
  });
  return groups;
};
