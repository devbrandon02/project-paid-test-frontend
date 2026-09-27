# Store Checkout SPA

Aplicación de una sola página para explorar productos, completar datos de entrega y tarjeta, revisar el total y consultar el resultado del pago. Construida con React, TypeScript, Redux Toolkit, DaisyUI y Tailwind CSS. La interfaz sólo se comunica con el backend; las credenciales del procesador se mantienen en el servidor.

## Requisitos

- Node.js 20 o superior
- npm
- API backend iniciada localmente o una URL de entorno Sandbox

## Instalar y ejecutar

```bash
npm install
npm run dev
```

En PowerShell, copiar la plantilla local:

```powershell
Copy-Item .env.example .env.local
```

Vite muestra la URL local al iniciar (por defecto `http://localhost:5173`). La aplicación usa `http://localhost:3000` como API base cuando no se configura otra URL.

Edita `VITE_API_URL` en `.env.local` para apuntar a otra instancia:

```dotenv
VITE_API_URL=http://localhost:3000
```

`VITE_API_URL` sólo contiene la URL pública de la API. Nunca coloques claves privadas, llaves de integridad ni credenciales de pago en variables `VITE_*`, porque se incluyen en el bundle del navegador.

## Recorrido implementado

1. Catálogo de productos y stock consultados en `GET /products`.
2. Formulario de datos del comprador, entrega y tarjeta.
3. Resumen de producto, tarifa de servicio, envío y total.
4. Creación de transacción y procesamiento del pago con el backend.
5. Comprobante del estado, importes y referencia; regreso al catálogo.

Los campos se validan en cliente antes de permitir avanzar. La validación no reemplaza la validación del API.

## Estado y manejo de tarjeta

Redux Toolkit mantiene el estado de la sesión de compra. Se persisten localmente el producto seleccionado, la etapa recuperable y el resultado de una transacción; no se guardan número de tarjeta, CVC, titular ni formulario personal. Los datos de tarjeta sólo permanecen en memoria mientras se completa el formulario y se envían al backend para su tokenización en Sandbox.

## Arquitectura

- `domain/`: modelos y reglas independientes de React/HTTP.
- `application/ports/` y `application/use-cases/`: contrato de salida y casos de uso.
- `infrastructure/api/`: adaptador HTTP del contrato de checkout.
- `infrastructure/persistence/`: adaptador de almacenamiento local.
- `features/checkout/`: componentes y slice Redux de la experiencia.
- `presentation/`: formato de importes para la UI.

La composición de dependencias está en `src/app/store.ts`. El adaptador de infraestructura se inyecta como argumento de thunk; los casos de uso no importan React ni Redux.

## Validación local

```bash
npm run lint
npm test
npm run test:coverage
npm run build
```

Última validación registrada: **36 pruebas en 8 suites** y cobertura global frontend de **93,65% statements, 87,42% branches, 91,54% functions y 96,06% lines**. Vitest exige al menos 80% en todas las métricas.

## Integración de API

El contrato y la colección Postman están documentados en el repositorio backend, en `README.md` y `postman/checkout-api.postman_collection.json`. La API local usa `http://localhost:3000`; una instancia desplegada se configura mediante `VITE_API_URL`.

## Despliegue

El proyecto genera archivos estáticos en `dist/` con `npm run build`. Puede servirse desde un proveedor estático/CDN. Para una entrega real, configurar HTTPS, `VITE_API_URL` con la URL HTTPS del backend y política SPA de fallback a `index.html`. No se incluye aún una URL de despliegue.
