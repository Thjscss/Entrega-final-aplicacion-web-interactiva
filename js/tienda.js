// ==========================================================================
// tienda.js — Lógica de la tienda (datos, almacenamiento y carrito).
// No toca el DOM: eso vive en ui.js.
// ==========================================================================

const RUTA_PRODUCTOS = "./data/productos.json";
const CLAVE_CARRITO = "gamerStore:carrito";
const CLAVE_STOCK_VENDIDO = "gamerStore:stockVendido";

// Cupones válidos: código → porcentaje de descuento.
const DESCUENTOS_POR_CUPON = { GAMER10: 10 };

const EXPRESION_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ==========================================================================
// Modelo
// ==========================================================================
export class Producto {
    constructor({ id, nombre, precio, categoria, stock, imagen }) {
        this.id = id;
        this.nombre = nombre;
        this.precio = precio;
        this.categoria = categoria;
        this.stock = stock;
        this.imagen = imagen;
    }

    // Unidades que todavía se pueden comprar (stock inicial menos lo ya vendido).
    stockDisponible(stockVendido) {
        return this.stock - (stockVendido[this.id] || 0);
    }
}

// ==========================================================================
// Datos: fetch + async/await
// ==========================================================================

// fetch SOLO rechaza ante fallos de red: un 404 o 500 igual "resuelve",
// por eso se revisa respuesta.ok a mano. Los errores se manejan en main.js (try/catch/finally).
export async function obtenerProductos() {
    const respuesta = await fetch(RUTA_PRODUCTOS);
    if (!respuesta.ok) {
        throw new Error(`El servidor respondió ${respuesta.status} ${respuesta.statusText}`.trim());
    }

    const datos = await respuesta.json();
    if (!Array.isArray(datos) || datos.length === 0) {
        throw new Error("El archivo de productos está vacío o no tiene el formato esperado.");
    }

    return datos.map(datosProducto => new Producto(datosProducto));
}

// ==========================================================================
// Almacenamiento: localStorage (guardar, modificar, borrar y vaciar)
// ==========================================================================
function leerAlmacenamiento(clave) {
    try {
        const guardado = localStorage.getItem(clave);
        return guardado ? JSON.parse(guardado) : null;
    } catch (error) {
        return null;
    }
}

// Devuelve true si se pudo guardar (puede fallar por cuota llena o modo privado).
function escribirAlmacenamiento(clave, valor) {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
        return true;
    } catch (error) {
        return false;
    }
}

function borrarAlmacenamiento(clave) {
    try {
        localStorage.removeItem(clave);
        return true;
    } catch (error) {
        return false;
    }
}

// Lee el carrito guardado y lo depura contra el catálogo actual:
// descarta productos que ya no existen y ajusta cantidades al stock disponible.
export function cargarCarrito(catalogo, stockVendido) {
    const { items, cupon } = leerAlmacenamiento(CLAVE_CARRITO) || {};
    const itemsGuardados = Array.isArray(items) ? items : [];

    const itemsValidos = itemsGuardados.reduce((validos, item) => {
        const producto = catalogo.find(({ id }) => id === item?.id);
        if (!producto) return validos;

        const cantidadGuardada = Math.trunc(Number(item.cantidad)) || 0;
        const cantidad = Math.min(cantidadGuardada, producto.stockDisponible(stockVendido));
        return cantidad > 0 ? [...validos, { id: producto.id, cantidad }] : validos;
    }, []);

    return {
        items: itemsValidos,
        cupon: Object.hasOwn(DESCUENTOS_POR_CUPON, cupon) ? cupon : ""
    };
}

// Guarda el carrito; si quedó vacío y sin cupón, borra la clave en vez de guardar "nada".
export function guardarCarrito(carrito) {
    const estaVacio = carrito.items.length === 0 && carrito.cupon === "";
    return estaVacio
        ? borrarAlmacenamiento(CLAVE_CARRITO)
        : escribirAlmacenamiento(CLAVE_CARRITO, carrito);
}

export function cargarStockVendido() {
    const guardado = leerAlmacenamiento(CLAVE_STOCK_VENDIDO);
    return guardado && typeof guardado === "object" ? guardado : {};
}

export function guardarStockVendido(stockVendido) {
    return escribirAlmacenamiento(CLAVE_STOCK_VENDIDO, stockVendido);
}

// Vacía todo lo que la tienda guardó en el navegador.
export function vaciarAlmacenamiento() {
    const carritoBorrado = borrarAlmacenamiento(CLAVE_CARRITO);
    const stockBorrado = borrarAlmacenamiento(CLAVE_STOCK_VENDIDO);
    return carritoBorrado && stockBorrado;
}

// ==========================================================================
// Catálogo: búsqueda, filtro y orden
// ==========================================================================
const COMPARADORES_DE_ORDEN = {
    "precio-asc": (productoA, productoB) => productoA.precio - productoB.precio,
    "precio-desc": (productoA, productoB) => productoB.precio - productoA.precio,
    nombre: (productoA, productoB) => productoA.nombre.localeCompare(productoB.nombre, "es")
};

export function filtrarProductos(catalogo, { texto, categoria, orden }) {
    const terminoBusqueda = (texto || "").trim().toLowerCase();

    const productosFiltrados = catalogo.filter(producto => {
        const coincideCategoria = categoria === "todas" || producto.categoria === categoria;
        const coincideTexto = producto.nombre.toLowerCase().includes(terminoBusqueda)
            || producto.categoria.includes(terminoBusqueda);
        return coincideCategoria && coincideTexto;
    });

    const comparador = COMPARADORES_DE_ORDEN[orden];
    return comparador ? productosFiltrados.sort(comparador) : productosFiltrados;
}

// ==========================================================================
// Carrito: agregar, modificar cantidades, quitar, cupón y totales
// ==========================================================================
export function agregarProducto(carrito, idProducto, stockDisponible) {
    const itemExistente = carrito.items.find(({ id }) => id === idProducto);

    if (itemExistente) {
        if (itemExistente.cantidad >= stockDisponible) return false;
        itemExistente.cantidad++;
        return true;
    }

    if (stockDisponible < 1) return false;
    carrito.items.push({ id: idProducto, cantidad: 1 });
    return true;
}

// "cambio" es +1 o -1. Devuelve false si la cantidad quedaría fuera de 1..stock.
export function cambiarCantidad(carrito, idProducto, cambio, stockDisponible) {
    const item = carrito.items.find(({ id }) => id === idProducto);
    if (!item) return false;

    const nuevaCantidad = item.cantidad + cambio;
    if (nuevaCantidad < 1 || nuevaCantidad > stockDisponible) return false;

    item.cantidad = nuevaCantidad;
    return true;
}

export function quitarProducto(carrito, idProducto) {
    carrito.items = carrito.items.filter(({ id }) => id !== idProducto);
}

export function vaciarCarrito(carrito) {
    carrito.items = [];
    carrito.cupon = "";
}

export function aplicarCupon(carrito, codigoIngresado) {
    const codigo = codigoIngresado.trim().toUpperCase();
    if (!Object.hasOwn(DESCUENTOS_POR_CUPON, codigo)) return false;

    carrito.cupon = codigo;
    return true;
}

export function quitarCupon(carrito) {
    carrito.cupon = "";
}

export function obtenerPorcentajeDescuento(cupon) {
    return DESCUENTOS_POR_CUPON[cupon] || 0;
}

// Convierte los items guardados ({id, cantidad}) en líneas con los datos completos del producto.
export function detallarCarrito({ items }, catalogo, stockVendido) {
    return items
        .map(({ id, cantidad }) => ({ producto: catalogo.find(producto => producto.id === id), cantidad }))
        .filter(({ producto }) => producto !== undefined)
        .map(({ producto, cantidad }) => ({
            producto,
            cantidad,
            subtotal: producto.precio * cantidad,
            stockDisponible: producto.stockDisponible(stockVendido)
        }));
}

export function calcularTotales(lineas, cupon) {
    const subtotal = lineas.reduce((acumulado, linea) => acumulado + linea.subtotal, 0);
    const cantidadUnidades = lineas.reduce((acumulado, linea) => acumulado + linea.cantidad, 0);
    const porcentajeDescuento = obtenerPorcentajeDescuento(cupon);
    const descuento = Math.round(subtotal * porcentajeDescuento / 100);

    return { subtotal, descuento, total: subtotal - descuento, cantidadUnidades, porcentajeDescuento };
}

// ==========================================================================
// Compra: validación del formulario, pedido y stock
// ==========================================================================
export function validarComprador({ nombre, email, formaPago }) {
    const errores = {};

    if (nombre.trim().length < 3) {
        errores.nombre = "Ingresá tu nombre y apellido.";
    }
    if (!EXPRESION_EMAIL.test(email.trim())) {
        errores.email = "Ingresá un email válido.";
    }
    if (!formaPago) {
        errores.formaPago = "Elegí una forma de pago.";
    }

    return errores;
}

export function crearPedido(lineas, totales, cupon, comprador) {
    return {
        numero: `GS-${Date.now().toString().slice(-6)}`,
        fecha: new Date().toLocaleString("es-AR"),
        comprador,
        cupon,
        lineas,
        totales
    };
}

// Descuenta del stock lo que se vendió en el pedido.
export function registrarVenta(stockVendido, lineas) {
    lineas.forEach(({ producto, cantidad }) => {
        stockVendido[producto.id] = (stockVendido[producto.id] || 0) + cantidad;
    });
}
