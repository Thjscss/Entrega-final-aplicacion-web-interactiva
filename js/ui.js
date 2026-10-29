// ==========================================================================
// ui.js — Todo lo que se ve: renderizado del DOM y notificaciones.
// Usa Toastify (avisos cortos) y SweetAlert2 (confirmaciones y errores).
// ==========================================================================

const ETIQUETAS_CATEGORIA = { mouse: "Mouse", teclado: "Teclado", auriculares: "Auriculares" };
const COLORES_TOAST = { exito: "#12805c", error: "#c0344f", info: "#5b45c9" };
const ESTILO_SWAL = { background: "#181a33", color: "#eceefc" };

export const elementos = {
    catalogo: document.getElementById("catalogo"),
    inputBusqueda: document.getElementById("input-busqueda"),
    selectOrden: document.getElementById("select-orden"),
    filtrosCategoria: document.getElementById("filtros-categoria"),
    contadorResultados: document.getElementById("contador-resultados"),
    estadoCarga: document.getElementById("estado-carga"),
    bloqueError: document.getElementById("bloque-error"),
    textoError: document.getElementById("texto-error"),
    btnReintentar: document.getElementById("btn-reintentar"),
    contadorCarrito: document.getElementById("contador-carrito"),
    panelLateral: document.getElementById("panel-lateral"),
    vistaCarrito: document.getElementById("vista-carrito"),
    vistaCheckout: document.getElementById("vista-checkout"),
    vistaConfirmacion: document.getElementById("vista-confirmacion"),
    listaCarrito: document.getElementById("lista-carrito"),
    carritoVacio: document.getElementById("carrito-vacio"),
    inputCupon: document.getElementById("input-cupon"),
    btnAplicarCupon: document.getElementById("btn-aplicar-cupon"),
    btnQuitarCupon: document.getElementById("btn-quitar-cupon"),
    estadoCupon: document.getElementById("estado-cupon"),
    textoCupon: document.getElementById("texto-cupon"),
    subtotal: document.getElementById("subtotal"),
    filaDescuento: document.getElementById("fila-descuento"),
    descuento: document.getElementById("descuento"),
    total: document.getElementById("total"),
    btnFinalizar: document.getElementById("btn-finalizar"),
    btnVaciar: document.getElementById("btn-vaciar"),
    estadoSync: document.getElementById("estado-sync"),
    totalCheckout: document.getElementById("total-checkout"),
    formCompra: document.getElementById("form-compra"),
    inputNombre: document.getElementById("input-nombre"),
    inputEmail: document.getElementById("input-email"),
    selectPago: document.getElementById("select-pago"),
    errorNombre: document.getElementById("error-nombre"),
    errorEmail: document.getElementById("error-email"),
    errorPago: document.getElementById("error-pago"),
    btnConfirmar: document.getElementById("btn-confirmar"),
    btnVolver: document.getElementById("btn-volver"),
    detallePedido: document.getElementById("detalle-pedido"),
    btnSeguirComprando: document.getElementById("btn-seguir-comprando"),
    btnReiniciar: document.getElementById("btn-reiniciar")
};

const CAMPOS_FORMULARIO = {
    nombre: { control: elementos.inputNombre, mensaje: elementos.errorNombre },
    email: { control: elementos.inputEmail, mensaje: elementos.errorEmail },
    formaPago: { control: elementos.selectPago, mensaje: elementos.errorPago }
};

// ==========================================================================
// Utilidades
// ==========================================================================
export function formatearPrecio(valor) {
    return valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

// Crea elementos con textContent (nunca innerHTML) para que un texto escrito por el usuario
// se muestre como texto y no se ejecute como HTML.
function crearElemento(etiqueta, { clase, texto, atributos } = {}) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto !== undefined) elemento.textContent = texto;
    Object.entries(atributos || {}).forEach(([nombre, valor]) => elemento.setAttribute(nombre, valor));
    return elemento;
}

// ==========================================================================
// Notificaciones (librerías externas)
// ==========================================================================
export function mostrarToast(texto, tipo = "exito") {
    Toastify({
        text: texto,
        duration: 3000,
        gravity: "top",
        position: "right",
        close: true,
        stopOnFocus: true,
        style: { background: COLORES_TOAST[tipo] || COLORES_TOAST.info }
    }).showToast();
}

export function mostrarAlertaError(titulo, detalle) {
    Swal.fire({
        icon: "error",
        title: titulo,
        text: detalle,
        confirmButtonText: "Entendido",
        confirmButtonColor: "#7c5cf0",
        ...ESTILO_SWAL
    });
}

export async function pedirConfirmacion({ titulo, texto, textoConfirmar }) {
    const { isConfirmed } = await Swal.fire({
        icon: "question",
        title: titulo,
        text: texto,
        showCancelButton: true,
        confirmButtonText: textoConfirmar,
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#7c5cf0",
        cancelButtonColor: "#3a3d6b",
        ...ESTILO_SWAL
    });
    return isConfirmed;
}

export function mostrarProcesando() {
    Swal.fire({
        title: "Procesando tu compra…",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
        ...ESTILO_SWAL
    });
}

export function mostrarExito(titulo, texto) {
    Swal.fire({
        icon: "success",
        title: titulo,
        text: texto,
        confirmButtonText: "Ver comprobante",
        confirmButtonColor: "#7c5cf0",
        ...ESTILO_SWAL
    });
}

// ==========================================================================
// Estados de la interfaz: cargando, error, controles y guardado
// ==========================================================================
export function mostrarCargando(visible) {
    elementos.estadoCarga.hidden = !visible;
}

export function mostrarError(mensaje) {
    elementos.textoError.textContent = mensaje;
    elementos.bloqueError.hidden = false;
}

export function ocultarError() {
    elementos.bloqueError.hidden = true;
}

// Mientras no hay catálogo se bloquean los controles que dependen de él.
export function habilitarControles(habilitado) {
    [elementos.inputBusqueda, elementos.selectOrden, elementos.inputCupon,
        elementos.btnAplicarCupon, elementos.btnReiniciar].forEach(control => {
        control.disabled = !habilitado;
    });
}

export function actualizarEstadoGuardado(exito) {
    elementos.estadoSync.textContent = exito
        ? "✓ Carrito guardado en este dispositivo"
        : "⚠ No se pudo guardar el carrito: podría perderse al recargar";
    elementos.estadoSync.className = `estado-sync ${exito ? "estado-sync-ok" : "estado-sync-error"}`;
}

export function limpiarEstadoGuardado() {
    elementos.estadoSync.textContent = "";
    elementos.estadoSync.className = "estado-sync";
}

export function marcarCategoriaActiva(categoria) {
    elementos.filtrosCategoria.querySelectorAll(".chip").forEach(chip => {
        const esActiva = chip.dataset.categoria === categoria;
        chip.classList.toggle("activo", esActiva);
        chip.setAttribute("aria-pressed", String(esActiva));
    });
}

// Muestra una sola de las tres vistas del panel lateral: carrito, checkout o confirmacion.
export function mostrarVista(nombreVista) {
    const vistas = {
        carrito: elementos.vistaCarrito,
        checkout: elementos.vistaCheckout,
        confirmacion: elementos.vistaConfirmacion
    };
    Object.entries(vistas).forEach(([nombre, vista]) => {
        vista.hidden = nombre !== nombreVista;
    });

    if (nombreVista !== "carrito") {
        elementos.panelLateral.scrollIntoView?.({ block: "start" });
    }
}

// ==========================================================================
// Catálogo
// ==========================================================================
function describirStock(stockDisponible) {
    if (stockDisponible === 0) return "Sin stock";
    if (stockDisponible === 1) return "Última unidad";
    return stockDisponible <= 5 ? `Últimas ${stockDisponible} unidades` : `Stock: ${stockDisponible}`;
}

function describirBotonAgregar(stockDisponible, limiteAlcanzado) {
    if (stockDisponible === 0) return "Sin stock";
    return limiteAlcanzado ? "Máximo en el carrito" : "Agregar al carrito";
}

function crearTarjetaProducto(producto, cantidadEnCarrito, stockVendido) {
    const stockDisponible = producto.stockDisponible(stockVendido);
    const limiteAlcanzado = cantidadEnCarrito >= stockDisponible;

    const tarjeta = crearElemento("article", { clase: "tarjeta-producto" });
    const imagen = crearElemento("img", {
        clase: "tarjeta-imagen",
        atributos: { src: producto.imagen, alt: "", loading: "lazy" }
    });
    const categoria = crearElemento("span", {
        clase: "etiqueta-categoria",
        texto: ETIQUETAS_CATEGORIA[producto.categoria] || producto.categoria
    });
    const nombre = crearElemento("h3", { clase: "tarjeta-nombre", texto: producto.nombre });
    const precio = crearElemento("p", { clase: "tarjeta-precio", texto: formatearPrecio(producto.precio) });
    const stock = crearElemento("p", { clase: "tarjeta-stock", texto: describirStock(stockDisponible) });
    const botonAgregar = crearElemento("button", {
        clase: "btn-tienda btn-principal",
        texto: describirBotonAgregar(stockDisponible, limiteAlcanzado),
        atributos: { type: "button", "data-accion": "agregar", "data-id": producto.id }
    });
    botonAgregar.disabled = limiteAlcanzado;

    tarjeta.append(imagen, categoria, nombre, precio, stock, botonAgregar);
    return tarjeta;
}

export function renderizarCatalogo(productos, carrito, stockVendido) {
    const cantidadProductos = productos.length;
    elementos.contadorResultados.textContent =
        `${cantidadProductos} ${cantidadProductos === 1 ? "producto" : "productos"}`;

    if (cantidadProductos === 0) {
        const sinResultados = crearElemento("p", {
            clase: "mensaje-vacio",
            texto: "No hay productos que coincidan. Probá con otra búsqueda o categoría."
        });
        elementos.catalogo.replaceChildren(sinResultados);
        return;
    }

    const tarjetas = productos.map(producto => {
        const { cantidad = 0 } = carrito.items.find(({ id }) => id === producto.id) || {};
        return crearTarjetaProducto(producto, cantidad, stockVendido);
    });
    elementos.catalogo.replaceChildren(...tarjetas);
}

// ==========================================================================
// Carrito
// ==========================================================================
function crearBotonAccion({ texto, accion, idProducto, etiqueta, deshabilitado, clase }) {
    const boton = crearElemento("button", {
        clase,
        texto,
        atributos: { type: "button", "data-accion": accion, "data-id": idProducto, "aria-label": etiqueta }
    });
    boton.disabled = deshabilitado;
    return boton;
}

function crearLineaCarrito({ producto, cantidad, subtotal, stockDisponible }) {
    const linea = crearElemento("li", { clase: "linea-carrito" });
    const nombre = crearElemento("p", { clase: "linea-nombre", texto: producto.nombre });
    const precioUnitario = crearElemento("p", {
        clase: "linea-detalle",
        texto: `${formatearPrecio(producto.precio)} c/u`
    });

    const controles = crearElemento("div", { clase: "control-cantidad" });
    const botonRestar = crearBotonAccion({
        texto: "−", accion: "restar", idProducto: producto.id, clase: "btn-cantidad",
        etiqueta: `Quitar una unidad de ${producto.nombre}`, deshabilitado: cantidad <= 1
    });
    const textoCantidad = crearElemento("span", { clase: "cantidad", texto: String(cantidad) });
    const botonSumar = crearBotonAccion({
        texto: "+", accion: "sumar", idProducto: producto.id, clase: "btn-cantidad",
        etiqueta: `Agregar una unidad de ${producto.nombre}`, deshabilitado: cantidad >= stockDisponible
    });
    controles.append(botonRestar, textoCantidad, botonSumar);

    const textoSubtotal = crearElemento("strong", { clase: "linea-subtotal", texto: formatearPrecio(subtotal) });
    const botonQuitar = crearBotonAccion({
        texto: "Quitar", accion: "quitar", idProducto: producto.id, clase: "btn-enlace",
        etiqueta: `Quitar ${producto.nombre} del carrito`, deshabilitado: false
    });

    linea.append(nombre, precioUnitario, controles, textoSubtotal, botonQuitar);
    return linea;
}

export function renderizarCarrito(lineas, totales, cupon) {
    const { subtotal, descuento, total, cantidadUnidades, porcentajeDescuento } = totales;
    const carritoSinProductos = lineas.length === 0;

    elementos.contadorCarrito.textContent = cantidadUnidades;
    elementos.carritoVacio.hidden = !carritoSinProductos;
    elementos.listaCarrito.replaceChildren(...lineas.map(crearLineaCarrito));
    elementos.btnFinalizar.disabled = carritoSinProductos;
    elementos.btnVaciar.disabled = carritoSinProductos;

    elementos.estadoCupon.hidden = !cupon;
    elementos.textoCupon.textContent = cupon ? `Cupón ${cupon} aplicado: ${porcentajeDescuento}% de descuento.` : "";

    elementos.subtotal.textContent = formatearPrecio(subtotal);
    elementos.filaDescuento.hidden = descuento === 0;
    elementos.descuento.textContent = `- ${formatearPrecio(descuento)}`;
    elementos.total.textContent = formatearPrecio(total);
    elementos.totalCheckout.textContent = formatearPrecio(total);
}

export function leerCupon() {
    return elementos.inputCupon.value;
}

export function limpiarCupon() {
    elementos.inputCupon.value = "";
}

// ==========================================================================
// Checkout y comprobante
// ==========================================================================
export function leerDatosComprador() {
    return {
        nombre: elementos.inputNombre.value,
        email: elementos.inputEmail.value,
        formaPago: elementos.selectPago.value
    };
}

export function mostrarErroresFormulario(errores) {
    Object.entries(CAMPOS_FORMULARIO).forEach(([clave, { control, mensaje }]) => {
        const textoError = errores[clave];
        control.classList.toggle("is-invalid", Boolean(textoError));
        mensaje.textContent = textoError || "";
    });
}

export function limpiarFormularioCompra() {
    elementos.formCompra.reset();
    mostrarErroresFormulario({});
}

export function bloquearConfirmacion(bloqueado) {
    elementos.btnConfirmar.disabled = bloqueado;
    elementos.btnVolver.disabled = bloqueado;
}

function crearFilaTotal(etiqueta, valor, clase = "fila-total") {
    const fila = crearElemento("div", { clase });
    fila.append(crearElemento("dt", { texto: etiqueta }), crearElemento("dd", { texto: valor }));
    return fila;
}

export function renderizarComprobante(pedido) {
    const { numero, fecha, comprador, cupon, lineas, totales } = pedido;
    const { nombre, email, formaPago } = comprador;

    const encabezado = crearElemento("p", { clase: "pedido-numero", texto: `Pedido ${numero}` });
    const datos = crearElemento("p", { clase: "linea-detalle", texto: `${fecha} · ${formaPago}` });
    const datosComprador = crearElemento("p", { clase: "linea-detalle", texto: `${nombre} (${email})` });

    const listaProductos = crearElemento("ul", { clase: "lista-comprobante" });
    lineas.forEach(({ producto, cantidad, subtotal }) => {
        const item = crearElemento("li");
        item.append(
            crearElemento("span", { texto: `${cantidad} × ${producto.nombre}` }),
            crearElemento("strong", { texto: formatearPrecio(subtotal) })
        );
        listaProductos.append(item);
    });

    const resumen = crearElemento("dl", { clase: "totales" });
    resumen.append(crearFilaTotal("Subtotal", formatearPrecio(totales.subtotal)));
    if (cupon) {
        resumen.append(crearFilaTotal(`Descuento (${cupon})`, `- ${formatearPrecio(totales.descuento)}`, "fila-total fila-descuento"));
    }
    resumen.append(crearFilaTotal("Total pagado", formatearPrecio(totales.total), "fila-total fila-total-final"));

    elementos.detallePedido.replaceChildren(encabezado, datos, datosComprador, listaProductos, resumen);
}
