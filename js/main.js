// ==========================================================================
// main.js — Arranque de la tienda, estado y eventos.
// Circuito: ver productos → agregar → modificar cantidades → total → confirmar compra.
// ==========================================================================
import {
    obtenerProductos, cargarCarrito, guardarCarrito, cargarStockVendido, guardarStockVendido,
    vaciarAlmacenamiento, filtrarProductos, agregarProducto, cambiarCantidad, quitarProducto,
    vaciarCarrito, aplicarCupon, quitarCupon, detallarCarrito, calcularTotales,
    validarComprador, crearPedido, registrarVenta
} from "./tienda.js";
import {
    elementos, formatearPrecio, mostrarToast, mostrarAlertaError, pedirConfirmacion,
    mostrarProcesando, mostrarExito, mostrarCargando, mostrarError, ocultarError,
    habilitarControles, actualizarEstadoGuardado, limpiarEstadoGuardado, marcarCategoriaActiva, mostrarVista,
    renderizarCatalogo, renderizarCarrito, leerCupon, limpiarCupon, leerDatosComprador,
    mostrarErroresFormulario, limpiarFormularioCompra, bloquearConfirmacion, renderizarComprobante
} from "./ui.js";

const MILISEGUNDOS_PROCESAMIENTO = 1200;
const MILISEGUNDOS_AVISO_CUPON = 4000;

const estado = {
    catalogo: [],
    carrito: { items: [], cupon: "" },
    stockVendido: {},
    filtros: { texto: "", categoria: "todas", orden: "relevancia" },
    vistaActiva: "carrito"
};

const esperar = milisegundos => new Promise(resolver => setTimeout(resolver, milisegundos));

// ==========================================================================
// Render general
// ==========================================================================
function refrescarTienda() {
    const { catalogo, carrito, stockVendido, filtros } = estado;

    renderizarCatalogo(filtrarProductos(catalogo, filtros), carrito, stockVendido);

    const lineas = detallarCarrito(carrito, catalogo, stockVendido);
    renderizarCarrito(lineas, calcularTotales(lineas, carrito.cupon), carrito.cupon);
}

function cambiarVista(nombreVista) {
    estado.vistaActiva = nombreVista;
    mostrarVista(nombreVista);
}

function persistirCarrito() {
    actualizarEstadoGuardado(guardarCarrito(estado.carrito));
}

function buscarProducto(idProducto) {
    return estado.catalogo.find(({ id }) => id === idProducto);
}

// ==========================================================================
// Carga inicial: fetch + async/await con try/catch/finally
// ==========================================================================
async function iniciarTienda() {
    ocultarError();
    mostrarCargando(true);
    habilitarControles(false);

    try {
        estado.catalogo = await obtenerProductos();
        estado.stockVendido = cargarStockVendido();
        estado.carrito = cargarCarrito(estado.catalogo, estado.stockVendido);

        refrescarTienda();
        habilitarControles(true);
        mostrarToast(`Productos cargados con éxito (${estado.catalogo.length})`, "exito");
    } catch (error) {
        mostrarError(`No se pudo iniciar la tienda: ${error.message}`);
        mostrarAlertaError("No pudimos iniciar la tienda", error.message);
    } finally {
        mostrarCargando(false);
    }
}

// ==========================================================================
// Catálogo: búsqueda, categorías, orden y agregar al carrito
// ==========================================================================
function manejarBusqueda(evento) {
    estado.filtros.texto = evento.target.value;
    refrescarTienda();
}

function manejarCategoria(evento) {
    const chip = evento.target.closest(".chip");
    if (!chip) return;

    estado.filtros.categoria = chip.dataset.categoria;
    marcarCategoriaActiva(estado.filtros.categoria);
    refrescarTienda();
}

function manejarOrden(evento) {
    estado.filtros.orden = evento.target.value;
    refrescarTienda();
}

function manejarClickCatalogo(evento) {
    const boton = evento.target.closest("[data-accion='agregar']");
    if (!boton) return;

    const producto = buscarProducto(Number(boton.dataset.id));
    if (!producto) return;

    const agregado = agregarProducto(estado.carrito, producto.id, producto.stockDisponible(estado.stockVendido));
    if (!agregado) {
        mostrarToast("No hay más unidades disponibles de ese producto.", "error");
        return;
    }

    if (estado.vistaActiva === "confirmacion") cambiarVista("carrito");
    persistirCarrito();
    refrescarTienda();
    mostrarToast(`"${producto.nombre}" agregado al carrito.`, "exito");
}

// ==========================================================================
// Carrito: cantidades, quitar, vaciar y cupón
// ==========================================================================
function manejarClickCarrito(evento) {
    const boton = evento.target.closest("[data-accion]");
    if (!boton) return;

    const { accion, id } = boton.dataset;
    const producto = buscarProducto(Number(id));
    if (!producto) return;

    const stockDisponible = producto.stockDisponible(estado.stockVendido);
    const cambiosDeCantidad = { sumar: 1, restar: -1 };

    if (accion === "quitar") {
        quitarProducto(estado.carrito, producto.id);
        mostrarToast(`"${producto.nombre}" quitado del carrito.`, "info");
    } else if (!cambiarCantidad(estado.carrito, producto.id, cambiosDeCantidad[accion], stockDisponible)) {
        mostrarToast("Esa cantidad no está disponible.", "error");
        return;
    }

    persistirCarrito();
    refrescarTienda();
}

async function manejarVaciarCarrito() {
    const confirmado = await pedirConfirmacion({
        titulo: "¿Vaciar el carrito?",
        texto: "Se van a quitar todos los productos.",
        textoConfirmar: "Sí, vaciar"
    });
    if (!confirmado) return;

    vaciarCarrito(estado.carrito);
    limpiarCupon();
    persistirCarrito();
    refrescarTienda();
    mostrarToast("Carrito vaciado.", "info");
}

function manejarAplicarCupon() {
    const codigo = leerCupon();
    if (codigo.trim() === "") {
        mostrarToast("Ingresá un código de cupón.", "error");
        return;
    }

    if (!aplicarCupon(estado.carrito, codigo)) {
        mostrarToast("Ese cupón no es válido.", "error");
        return;
    }

    limpiarCupon();
    persistirCarrito();
    refrescarTienda();
    mostrarToast("Cupón aplicado.", "exito");
}

function manejarQuitarCupon() {
    quitarCupon(estado.carrito);
    persistirCarrito();
    refrescarTienda();
    mostrarToast("Cupón quitado.", "info");
}

// ==========================================================================
// Checkout: validar datos, confirmar y registrar el pedido
// ==========================================================================
function manejarFinalizar() {
    if (estado.carrito.items.length === 0) {
        mostrarToast("Agregá al menos un producto para continuar.", "error");
        return;
    }
    cambiarVista("checkout");
}

async function manejarConfirmarCompra(evento) {
    evento.preventDefault();

    const comprador = leerDatosComprador();
    const errores = validarComprador(comprador);
    mostrarErroresFormulario(errores);
    if (Object.keys(errores).length > 0) {
        mostrarToast("Revisá los campos marcados en rojo.", "error");
        return;
    }

    const lineas = detallarCarrito(estado.carrito, estado.catalogo, estado.stockVendido);
    const totales = calcularTotales(lineas, estado.carrito.cupon);

    const confirmado = await pedirConfirmacion({
        titulo: "¿Confirmar la compra?",
        texto: `Vas a pagar ${formatearPrecio(totales.total)} con ${comprador.formaPago.toLowerCase()}.`,
        textoConfirmar: "Sí, comprar"
    });
    if (!confirmado) return;

    bloquearConfirmacion(true);
    mostrarProcesando();

    try {
        await esperar(MILISEGUNDOS_PROCESAMIENTO);

        const pedido = crearPedido(lineas, totales, estado.carrito.cupon, {
            nombre: comprador.nombre.trim(),
            email: comprador.email.trim(),
            formaPago: comprador.formaPago
        });

        registrarVenta(estado.stockVendido, lineas);
        vaciarCarrito(estado.carrito);
        const ventaGuardada = guardarStockVendido(estado.stockVendido);
        actualizarEstadoGuardado(guardarCarrito(estado.carrito) && ventaGuardada);

        limpiarFormularioCompra();
        renderizarComprobante(pedido);
        cambiarVista("confirmacion");
        refrescarTienda();
        mostrarExito("¡Gracias por tu compra!", `Tu pedido ${pedido.numero} quedó confirmado.`);
    } catch (error) {
        mostrarAlertaError("No pudimos completar la compra", error.message);
    } finally {
        bloquearConfirmacion(false);
    }
}

// ==========================================================================
// Reinicio de la tienda (vacía el almacenamiento)
// ==========================================================================
async function manejarReiniciar() {
    const confirmado = await pedirConfirmacion({
        titulo: "¿Reiniciar la tienda?",
        texto: "Se borran el carrito y las compras guardadas en este dispositivo.",
        textoConfirmar: "Sí, reiniciar"
    });
    if (!confirmado) return;

    vaciarAlmacenamiento();
    estado.stockVendido = {};
    vaciarCarrito(estado.carrito);
    limpiarCupon();
    limpiarFormularioCompra();
    actualizarEstadoGuardado(true);
    limpiarEstadoGuardado();
    cambiarVista("carrito");
    refrescarTienda();
    mostrarToast("Tienda reiniciada.", "info");
}

// ==========================================================================
// Eventos y arranque
// ==========================================================================
elementos.inputBusqueda.addEventListener("input", manejarBusqueda);
elementos.selectOrden.addEventListener("change", manejarOrden);
elementos.filtrosCategoria.addEventListener("click", manejarCategoria);
elementos.catalogo.addEventListener("click", manejarClickCatalogo);
elementos.listaCarrito.addEventListener("click", manejarClickCarrito);
elementos.btnVaciar.addEventListener("click", manejarVaciarCarrito);
elementos.btnAplicarCupon.addEventListener("click", manejarAplicarCupon);
elementos.btnQuitarCupon.addEventListener("click", manejarQuitarCupon);
elementos.inputCupon.addEventListener("keydown", evento => {
    if (evento.key === "Enter") manejarAplicarCupon();
});
elementos.btnFinalizar.addEventListener("click", manejarFinalizar);
elementos.btnVolver.addEventListener("click", () => cambiarVista("carrito"));
elementos.formCompra.addEventListener("submit", manejarConfirmarCompra);
elementos.formCompra.addEventListener("input", evento => evento.target.classList.remove("is-invalid"));
elementos.btnSeguirComprando.addEventListener("click", () => cambiarVista("carrito"));
elementos.btnReintentar.addEventListener("click", iniciarTienda);
elementos.btnReiniciar.addEventListener("click", manejarReiniciar);

// Aviso diferido del cupón de bienvenida (setTimeout).
setTimeout(
    () => mostrarToast("Cupón GAMER10: 10% de descuento en tu compra.", "info"),
    MILISEGUNDOS_AVISO_CUPON
);

iniciarTienda();
