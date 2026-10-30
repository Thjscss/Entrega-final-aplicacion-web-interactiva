# Gamer Store — Simulador de compra online

Aplicación web interactiva que simula el circuito completo de una compra online de periféricos gaming (mouse, teclados y auriculares). Proyecto final del curso de JavaScript.

**Demo online:** https://thjscss.github.io/Entrega-final-aplicacion-web-interactiva/

## Circuito de compra

1. **Ver productos:** el catálogo se carga con `fetch` desde `data/productos.json`.
2. **Buscar y filtrar:** por nombre, por categoría y ordenando por precio o nombre.
3. **Agregar al carrito:** respetando el stock disponible de cada producto.
4. **Modificar cantidades:** botones `+` / `−`, quitar un producto o vaciar el carrito.
5. **Calcular el total:** subtotal, cupón de descuento (`GAMER10` = 10 %) y total final.
6. **Confirmar la compra:** formulario con nombre, email y forma de pago, validación, confirmación con SweetAlert2 y comprobante del pedido.
7. **Stock actualizado:** lo comprado se descuenta del stock y queda guardado en el navegador.

No hay registro ni login.

## Tecnologías

- HTML5, CSS3 y [Bootstrap 5.3](https://getbootstrap.com/) (grilla y formularios)
- JavaScript moderno con módulos ES (`import` / `export`)
- [Toastify](https://github.com/apvarun/toastify-js): avisos breves
- [SweetAlert2](https://sweetalert2.github.io/): confirmaciones y errores (no se usa `alert`, `confirm` ni `prompt`)

## Estructura

```text
Mi-Decimo-Script-Interactivo/
├── index.html            # Único archivo suelto de la aplicación
├── README.md
├── assets/
│   └── img/              # Logo y las ilustraciones por categoría
├── css/
│   └── estilos.css
├── data/
│   └── productos.json    # "Base de datos" simulada
└── js/
    ├── tienda.js         # Lógica: modelo, fetch, localStorage y carrito
    ├── ui.js             # Renderizado del DOM y notificaciones
    └── main.js           # Estado, eventos y flujo de la compra
```

## Cómo se cumplen los requisitos

| Requisito | Dónde |
| --- | --- |
| DOM y eventos | `ui.js` crea los elementos; `main.js` maneja los eventos (delegación en catálogo y carrito) |
| Arrays de objetos en `.json` + `fetch` | `data/productos.json`, consumido en `obtenerProductos()` (`tienda.js`) |
| Funciones de orden superior | `map`, `filter`, `reduce`, `find`, `forEach` y `sort` |
| localStorage | Guardar y modificar (carrito, cantidades, cupón, stock vendido), borrar (quitar producto o carrito vacío) y vaciar (`Reiniciar tienda`) |
| Ternario, OR y destructuring | Ternario y OR en `tienda.js` y `ui.js`; destructuring en los tres archivos `.js` |
| `async/await` + `try/catch/finally` | `iniciarTienda()` en `main.js`; el error de carga muestra un aviso y un botón para reintentar |
| Librerías externas | Toastify y SweetAlert2 |

## Cómo ejecutarlo

`fetch` y los módulos ES no funcionan abriendo `index.html` con doble clic (`file://`). Hay que usar un servidor local:

- **VS Code:** instalar la extensión *Live Server*, clic derecho sobre `index.html` y elegir *Open with Live Server*.
- **Node.js:** en la carpeta del proyecto, ejecutar `npx serve .` y abrir la dirección que indica la consola.
- **GitHub Pages:** en el repositorio, *Settings → Pages*, elegir la rama `main` y la carpeta `/ (root)`.
