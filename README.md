# GT Logistics - Sistema de Gestión de Rutas

Hola. Este es el espacio de documentación y contexto técnico para GT Logistics, una aplicación móvil interna que desarrollamos para optimizar las rutas de entrega en Green Tomato. 

La idea principal detrás de este proyecto era dejar atrás los procesos manuales y darle a nuestros conductores una herramienta que realmente les facilitara el trabajo en la calle. Al mismo tiempo, necesitábamos tener trazabilidad real y segura de cada paquete desde la oficina.

## Arquitectura y Flujo de Datos

La interfaz móvil está construida sobre Google AppSheet, pero gran parte del trabajo pesado ocurre antes de que el conductor abra la app:

* **Automatización (Google Apps Script):** Tenemos un script que toma los pedidos de la semana y los cruza con nuestra base de datos maestra de clientes. Esto limpia la información y genera órdenes únicas en nuestra tabla central de operaciones, evitando errores de digitación.
* **Privacidad y Acceso:** Toda la autenticación está bloqueada y restringida al dominio corporativo de la empresa. No hay cuentas externas ni accesos no autorizados.

## Experiencia del Conductor (Front-end)

Diseñamos la aplicación pensando en alguien que está manejando o caminando con paquetes, por lo que la interfaz debía ser directa:

* **Organización:** Los pedidos pendientes se muestran en tarjetas agrupadas por zona y día de entrega. También hay una pestaña de historial para lo ya completado.
* **Geolocalización visual:** Una vista de mapa que muestra los pines de entrega, priorizando la lectura rápida del nombre del cliente y su dirección.
* **Herramientas de un clic:** Botones integrados en cada tarjeta para llamar al cliente, enviarle un SMS o lanzar la ruta directamente en Google Maps o Waze sin tener que copiar y pegar direcciones.

## Prueba de Entrega (Proof of Delivery)

Para mantener el control de calidad, el proceso de check-in al dejar un paquete es estricto pero rápido. Al marcar algo como "Entregado", la app requiere:

1. Una fotografía del paquete en el lugar.
2. Confirmación de si se recogieron bolsas retornables.
3. El registro exacto de la hora de entrega.
4. Las coordenadas GPS exactas capturadas en segundo plano. 

Con estos datos, el sistema genera automáticamente un enlace interactivo del mapa para que podamos auditar cualquier entrega si surge alguna duda.

## Próximos Pasos

El sistema ha estabilizado mucho nuestra logística actual. El siguiente paso en el que estamos trabajando es conectar esto hacia afuera: implementar notificaciones automatizadas para que el cliente final reciba un aviso en el momento exacto en que el conductor completa este proceso de entrega.

---
*Nota: Dado que el front-end está construido en AppSheet, este repositorio sirve para documentar la arquitectura, alojar los scripts de Google Apps Script asociados y mantener el registro de las versiones y mejoras del sistema.*
