# 🔌 Guía de Integración API - ALS

Esta guía detalla cómo sistemas externos pueden conectarse al servidor ALS para enviar Órdenes de Inspección Técnica (OITs) y Cotizaciones de forma automatizada.

## 📋 Información de Conexión

- **Servidor (Base URL):** `http://ec2-3-210-177-245.compute-1.amazonaws.com:3000`
- **Ambiente:** Producción (AWS EC2)

---

## 🔐 1. Autenticación

Para interactuar con la API, primero debes obtener un **Token JWT**.

**Endpoint:** `POST /api/auth/login`

**Cuerpo (JSON):**
```json
{
  "email": "admin@serambiente.com",
  "password": "admin123"
}
```

**Respuesta Exitosa (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": { ... }
}
```

> ⚠️ **Nota:** El token debe enviarse en el header `Authorization` de todas las peticiones subsiguientes:
> `Authorization: Bearer <TU_TOKEN>`

---

## 📤 2. Envío de OITs y Cotizaciones (Multipart)

Este endpoint permite cargar archivos (PDFs de OIT y Cotización) y crear el registro en la base de datos para procesamiento asíncrono por la IA.

**Endpoint:** `POST /api/oits/async`
**Content-Type:** `multipart/form-data`

### Parámetros del Formulario:

| Campo | Tipo | Obligatorio | Descripción |
| :--- | :--- | :--- | :--- |
| `oitFile` | Archivo | **Sí** | El archivo PDF de la OIT (Orden de Trabajo). |
| `quotationFile` | Archivo | No | El archivo PDF de la cotización asociada (mejora la precisión de la IA). |
| `oitNumber` | Texto | No | Número identificador de la OIT. Si no se envía, se genera uno temporal (`OIT-<timestamp>`). |
| `description` | Texto | No | Descripción inicial o contexto adicional. |

---

## 💻 Ejemplos de Implementación

### Ejemplo cURL

```bash
curl -X POST http://ec2-3-210-177-245.compute-1.amazonaws.com:3000/api/oits/async \
  -H "Authorization: Bearer <TU_TOKEN>" \
  -F "oitFile=@/ruta/al/archivo/oit_1234.pdf" \
  -F "quotationFile=@/ruta/al/archivo/cotizacion_1234.pdf" \
  -F "oitNumber=OIT-EXT-2024-001" \
  -F "description=Muestreo de aguas residuales cliente XYZ"
```

### Ejemplo Node.js (Axios)

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function sendOIT() {
  const form = new FormData();
  form.append('oitFile', fs.createReadStream('./oit.pdf'));
  form.append('quotationFile', fs.createReadStream('./cotizacion.pdf'));
  form.append('oitNumber', 'OIT-API-001');

  try {
    const response = await axios.post('http://ec2-3-210-177-245.compute-1.amazonaws.com:3000/api/oits/async', form, {
      headers: {
        ...form.getHeaders(),
        // Reemplaza con el token obtenido en el login
        'Authorization': 'Bearer <TU_TOKEN>' 
      }
    });
    console.log('✅ OIT Enviada:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

sendOIT();
```

---

## 🔄 Flujo de Datos

1. **Recepción:** El servidor recibe los archivos y crea un registro con estado `UPLOADING`.
2. **Respuesta Rápida:** La API responde inmediatamente con el ID de la OIT creada.
3. **Procesamiento:** En segundo plano:
   - Se guardan los archivos en disco.
   - Se extrae el texto de los PDFs.
   - La IA analiza el contenido para llenar la metadata y proponer una planificación.
   - El estado cambia a `ANALYZING` y finalmente a `PENDING` o `SCHEDULED`.

---

## 📝 3. Actualización de Archivos de una OIT Existente

Este endpoint permite reemplazar los archivos (PDFs de OIT y/o Cotización) de una OIT ya existente. Al subir nuevos archivos, el sistema automáticamente dispara un re-análisis con IA.

**Endpoint:** `PATCH /api/oits/:id`
**Content-Type:** `multipart/form-data`

### Parámetros del Formulario:

| Campo | Tipo | Obligatorio | Descripción |
| :--- | :--- | :--- | :--- |
| `oitFile` | Archivo | No | Nuevo archivo PDF de la OIT. Reemplaza el existente. |
| `quotationFile` | Archivo | No | Nuevo archivo PDF de cotización. Reemplaza el existente. |
| `oitNumber` | Texto | No | Actualizar el número de OIT. |
| `description` | Texto | No | Actualizar descripción. |
| `status` | Texto | No | Cambiar el estado (ej: `PENDING`, `SCHEDULED`, etc). |

### Ejemplo cURL

```bash
curl -X PATCH http://ec2-3-210-177-245.compute-1.amazonaws.com:3000/api/oits/<OIT_ID> \
  -H "Authorization: Bearer <TU_TOKEN>" \
  -F "oitFile=@/ruta/al/nuevo_oit.pdf" \
  -F "quotationFile=@/ruta/a/nueva_cotizacion.pdf"
```

### Ejemplo Node.js (Axios)

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function updateOITFiles(oitId) {
  const form = new FormData();
  form.append('oitFile', fs.createReadStream('./nuevo_oit.pdf'));
  form.append('quotationFile', fs.createReadStream('./nueva_cotizacion.pdf'));

  try {
    const response = await axios.patch(
      `http://ec2-3-210-177-245.compute-1.amazonaws.com:3000/api/oits/${oitId}`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': 'Bearer <TU_TOKEN>'
        }
      }
    );
    console.log('✅ OIT Actualizada:', response.data);
    // Si response.data.reanalyzing === true, la IA está procesando en segundo plano
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

updateOITFiles('uuid-de-la-oit');
```

### Respuesta Exitosa (200 OK)

```json
{
  "id": "uuid-de-la-oit",
  "oitNumber": "OIT-123",
  "oitFileUrl": "/uploads/oitFile-xxx.pdf",
  "quotationFileUrl": "/uploads/quotationFile-xxx.pdf",
  "status": "ANALYZING",
  "reanalyzing": true,
  "engineers": [...]
}
```

> 💡 **Nota:** Si `reanalyzing: true`, significa que la IA está procesando los nuevos documentos en segundo plano. El estado cambiará automáticamente cuando termine.

