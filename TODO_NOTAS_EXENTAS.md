# TODO: Implementación de Notas de Crédito y Débito Exentas

## Resumen
Agregar soporte para documentos exentos separados:
- `notasCreditoExentas` (nueva colección)
- `notasDebitoExentas` (nueva colección)

Nuevos tipos de documento en UI:
- "Nota de crédito exenta" → siempre vinculada a `facturasExentas`
- "Nota de débito exenta" → siempre vinculada a `notasCreditoExentas`

---

## 1. Ringresar.jsx (Ingreso de Documentos)

### 1.1 Agregar tipos de documento
- [ ] Línea 63-70: Agregar "Nota de crédito exenta" y "Nota de débito exenta" al array `TIPOS_DOCUMENTO`

### 1.2 Modificar lógica de Nota de Crédito
- [ ] Línea 179-182: Actualizar validación para NC exenta (no necesita `tipoDocNc`)
- [ ] Línea 995-1036: Ocultar dropdown "Tipo de documento a vincular" si es NC exenta (siempre es facturasExentas) o NC normal (siempre es facturas)
- [ ] Línea 557-651: Duplicar bloque de guardado para "Nota de crédito exenta":
  - Guardar en colección `notasCreditoExentas`
  - `tipoFacturaAsociada` siempre será `"facturasExentas"`
  - Buscar factura en `facturasExentas`
  - Registrar en auditoría con `tipoDocumento: "notasCreditoExentas"`

### 1.3 Modificar lógica de Nota de Débito
- [ ] Línea 184-187: Actualizar validación para ND exenta
- [ ] Línea 1038-1059: Mostrar campo diferente según tipo:
  - ND normal: "N° de Nota de crédito a vincular"
  - ND exenta: "N° de Nota de crédito exenta a vincular"
- [ ] Línea 654-772: Duplicar bloque de guardado para "Nota de débito exenta":
  - Guardar en colección `notasDebitoExentas`
  - Buscar NC en `notasCreditoExentas`
  - Actualizar factura en `facturasExentas`
  - Registrar en auditoría con `tipoDocumento: "notasDebitoExentas"`

### 1.4 Actualizar cálculo de IVA
- [ ] Línea 102-110: NC exenta y ND exenta no tienen IVA (agregar a condición)
- [ ] Línea 114: Actualizar `ivaParaTotal` para incluir NC/ND exentas

### 1.5 Crear objetos de documento exentos
- [ ] Después de línea 356: Crear `notaCreditoExenta` (sin IVA)
- [ ] Después de línea 372: Crear `notaDebitoExenta` (sin IVA)

---

## 2. RRevisionDocumentos.jsx (Revisión de Documentos)

### 2.1 Agregar colecciones al fetch
- [ ] Buscar array `DOC_TYPES` o similar y agregar:
  ```javascript
  { tipo: 'NC Exenta', subcol: 'notasCreditoExentas', isAdditive: false }
  { tipo: 'ND Exenta', subcol: 'notasDebitoExentas', isAdditive: true }
  ```

### 2.2 Actualizar lógica de trazado de cadena
- [ ] En función que traza ND → NC → Factura:
  - Si es `notasDebitoExentas`, buscar NC en `notasCreditoExentas`
  - La factura siempre será en `facturasExentas`

### 2.3 Actualizar operaciones de edición
- [ ] Permitir editar NC exentas y ND exentas
- [ ] Validar que no se puede cambiar el tipo (exenta a normal o viceversa)

### 2.4 Actualizar operaciones de eliminación
- [ ] Manejar eliminación de NC exenta (actualizar factura exenta vinculada)
- [ ] Manejar eliminación de ND exenta (actualizar NC exenta y factura exenta)

### 2.5 Actualizar operaciones de reversión
- [ ] Manejar reversión para documentos exentos

---

## 3. RProcesar.jsx (Procesamiento de Pagos)

### 3.1 Agregar colecciones al fetch de documentos
- [ ] Buscar donde se definen los tipos de documento y agregar:
  - `notasCreditoExentas`
  - `notasDebitoExentas`

### 3.2 Actualizar lectura de NDs en transacción
- [ ] Cuando se lee una ND exenta, buscar NC en `notasCreditoExentas`
- [ ] Cuando se actualiza factura desde ND exenta, usar `facturasExentas`

### 3.3 Actualizar lógica de egreso
- [ ] Incluir documentos exentos en el procesamiento de pagos
- [ ] Guardar `tipoDoc` correcto en array de documentos pagados

---

## 4. RCalendario.jsx (Vista Calendario)

### 4.1 Agregar colecciones al fetch
- [ ] Agregar `notasCreditoExentas` y `notasDebitoExentas` a las colecciones que se cargan

### 4.2 Actualizar procesamiento de datos
- [ ] En `processDocData`: manejar tipos exentos
- [ ] Asignar colores/estilos diferenciados si es necesario

### 4.3 Actualizar visualización
- [ ] Mostrar label correcto para documentos exentos en el calendario

---

## 5. RIndex.jsx (Dashboard/Estadísticas)

### 5.1 Agregar tipos de documento
- [ ] Línea donde se define `DOC_TYPES`, agregar:
  ```javascript
  { tipo: 'NC Exenta', subcol: 'notasCreditoExentas', isAdditive: false }
  { tipo: 'ND Exenta', subcol: 'notasDebitoExentas', isAdditive: true }
  ```

### 5.2 Actualizar cálculo de neto
- [ ] Línea 293-294: NC exentas y ND exentas son documentos exentos (no dividir por 1.19)
  ```javascript
  const isExempt = docType.subcol === 'facturasExentas'
    || docType.subcol === 'boletasExentas'
    || docType.subcol === 'notasCreditoExentas'
    || docType.subcol === 'notasDebitoExentas';
  ```

### 5.3 Actualizar gráficos/estadísticas
- [ ] Incluir documentos exentos en totales y gráficos
- [ ] Verificar que el signo (additive/subtractive) se aplica correctamente

---

## 6. CAuditoria.jsx (Logs de Auditoría)

### 6.1 Agregar labels para nuevos tipos
- [ ] En `TIPO_DOCUMENTO_LABELS` o similar, agregar:
  ```javascript
  notasCreditoExentas: "Nota de Crédito Exenta"
  notasDebitoExentas: "Nota de Débito Exenta"
  ```

### 6.2 Actualizar modal de detalle
- [ ] Mostrar información correcta para documentos exentos

---

## 7. Otros archivos a revisar

### 7.1 Utilidades de PDF (generarPDF.js)
- [ ] Si genera PDFs de documentos, agregar soporte para NC/ND exentas

### 7.2 Componentes compartidos
- [ ] Revisar si hay componentes que muestran tipos de documento y actualizarlos

### 7.3 Reglas de Firestore (si aplica)
- [ ] Agregar reglas de seguridad para nuevas colecciones

---

## 8. Testing

### 8.1 Flujo de creación
- [ ] Crear NC exenta vinculada a factura exenta
- [ ] Crear ND exenta vinculada a NC exenta
- [ ] Verificar que los totales se actualizan correctamente en la cadena

### 8.2 Flujo de pago
- [ ] Procesar pago que incluya NC exenta
- [ ] Procesar pago que incluya ND exenta
- [ ] Verificar cálculos de egreso

### 8.3 Flujo de eliminación
- [ ] Eliminar ND exenta y verificar que NC exenta se actualiza
- [ ] Eliminar NC exenta y verificar que factura exenta se actualiza

### 8.4 Visualización
- [ ] Verificar que aparecen en RIndex con totales correctos
- [ ] Verificar que aparecen en RCalendario
- [ ] Verificar que aparecen en RRevisionDocumentos
- [ ] Verificar que aparecen en CAuditoria

---

## Notas Importantes

1. **Patrón de colecciones**: Seguir el mismo patrón que `facturas`/`facturasExentas`
2. **No hay IVA**: Los documentos exentos no tienen IVA (iva = 0)
3. **Cadena de documentos**:
   - NC exenta → siempre vinculada a `facturasExentas`
   - ND exenta → siempre vinculada a `notasCreditoExentas` → `facturasExentas`
4. **Eliminar dropdown**: Para NC normal ya no mostrar "Tipo de documento a vincular" (siempre es facturas). Para NC exenta tampoco (siempre es facturasExentas)
