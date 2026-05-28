# Gestor Bienes Raíces

Aplicación web React/Vite lista para GitHub + Netlify.

## Qué incluye

- Roles/direcciones/grupos de propiedades.
- Contribuciones y gastos asociados por rol.
- Arrendatarios, encargado y datos de contacto.
- Contratos, anexos y pólizas con carga de PDFs.
- Fechas de vigencia y alertas anticipadas de vencimiento.
- Registro de ingresos por arriendos.
- Filtros por arrendatario, grupo de roles y rol.
- Reportes de morosidad, vencimientos, gastos e ingresos.
- Exportación CSV y respaldo JSON.

## Instalación local

```bash
npm install
npm run dev
```

Luego abre la URL local que muestra Vite.

## Despliegue en Netlify desde GitHub

1. Sube esta carpeta a un repositorio de GitHub.
2. En Netlify selecciona **Add new site > Import an existing project**.
3. Elige el repositorio.
4. Netlify detectará:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Deploy.

## Importante

Esta primera versión guarda datos y PDFs en el navegador del usuario mediante localStorage e IndexedDB. Es ideal como MVP rápido. Para uso multiusuario real, respaldo permanente, login y acceso desde distintos computadores, conviene conectarla después a Supabase, Firebase o una base de datos propia.
