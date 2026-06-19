// app.js
import { escucharDatos, guardarDatosEnNube } from "./firebase-service.js";

// --- ESTADO DE LA APLICACIÓN ---
// Ahora inicia completamente vacío, Firebase se encarga de estructurarlo y llenarlo
let datos = {
    categorias: [],
    lugares: [],
    productos: [],
    cajonAbierto: false
};

// Variable local para controlar qué producto se está editando en la interfaz
let idProductoEditando = null;

function capitalizarTexto(txt) {
    if (!txt) return '';
    return txt.trim().charAt(0).toUpperCase() + txt.trim().slice(1).toLowerCase();
}

function sincronizar() {
    guardarDatosEnNube(datos);
}

// --- NAVEGACIÓN ---
window.switchTab = function(tabId, title, event) {
    const activeBtn = event ? event.currentTarget : document.querySelector('.nav-btn');

    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${tabId}`).classList.remove('hidden');
    document.getElementById('app-title').innerText = title;
    
    const txtTotal = document.getElementById('total-estimado');
    if (tabId === 'compras') {
        txtTotal.classList.remove('hidden');
    } else {
        txtTotal.classList.add('hidden');
    }

    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        btn.classList.remove('text-emerald-800');
        btn.classList.add('text-stone-400');
        const span = btn.querySelector('span');
        if(span) span.classList.replace('opacity-75', 'opacity-40');
    });
    
    if (activeBtn) {
        activeBtn.classList.remove('text-stone-400');
        activeBtn.classList.add('text-emerald-800');
        const activeSpan = activeBtn.querySelector('span');
        if(activeSpan) activeSpan.classList.replace('opacity-40', 'opacity-75');
    }
}

window.toggleCajon = function() {
    datos.cajonAbierto = !datos.cajonAbierto;
    sincronizar();
}

function actualizarEstadoCajonVisual() {
    const contenido = document.getElementById('contenido-cajon');
    const flecha = document.getElementById('flecha-cajon');
    
    if (contenido && flecha) {
        if (datos.cajonAbierto) {
            contenido.classList.remove('hidden');
            flecha.classList.add('rotar-90');
        } else {
            contenido.classList.add('hidden');
            flecha.classList.remove('rotar-90');
        }
    }
}

// --- RENDERS ---
function render() {
    renderSelects();
    renderListaCompras();
    renderDespensa();
    actualizarEstadoCajonVisual();
}

function renderSelects() {
    const pCat = document.getElementById('prod-categoria');
    const pLug = document.getElementById('prod-lugar');
    
    if (pCat && pLug) {
        pCat.innerHTML = '<option value="" disabled selected>📂 Categoría</option>' + 
            datos.categorias.map(c => `<option value="${c}">${c}</option>`).join('');
        
        pLug.innerHTML = '<option value="" disabled selected>📍 Lugar</option>' + 
            datos.lugares.map(l => `<option value="${l}">${l}</option>`).join('');
    }
}

// 🛒 PESTAÑA 1: Lista de Compras (Organizada por Lugar)
function renderListaCompras() {
    const contenedor = document.getElementById('lista-compras-agrupada');
    const contador = document.getElementById('contador-compras');
    const txtTotal = document.getElementById('total-estimado');
    if (!contenedor) return;
    
    contenedor.innerHTML = '';
    
    const itemsParaComprar = datos.productos.filter(p => p.enLista);
    if(contador) contador.innerText = itemsParaComprar.length > 0 ? `${itemsParaComprar.length} pnd` : '0';

    const sumaTotal = itemsParaComprar.reduce((acc, p) => acc + (p.precio || 0), 0);
    if(txtTotal) txtTotal.innerText = sumaTotal > 0 ? `Total estimado: $${sumaTotal.toLocaleString()}` : '';

    if (itemsParaComprar.length === 0) {
        contenedor.innerHTML = `<p class="text-center text-stone-400 text-xs mt-10 tracking-tight">¡Todo listo! Lista vacía.</p>`;
        return;
    }

    // 📍 Ahora recorremos y agrupamos por LUGAR en vez de categoría
    datos.lugares.forEach(lug => {
        const prodDeEsteLug = itemsParaComprar.filter(p => p.lugar === lug);
        if (prodDeEsteLug.length > 0) {
            let lugHTML = `
                <div class="space-y-1">
                    <h3 class="text-[10px] font-medium tracking-wider text-stone-400 uppercase ml-1">📍 ${lug}</h3>
                    <div class="bg-white rounded-lg border border-stone-100 divide-y divide-stone-50 overflow-hidden shadow-2xs">
            `;
            
            prodDeEsteLug.forEach(p => {
                const tagPrecio = p.precio > 0 ? `<span class="precio-tag text-[10px] text-stone-500 font-medium ml-1 bg-stone-100 px-1 rounded-sm">$${p.precio.toLocaleString()}</span>` : '';
                
                lugHTML += `
                    <div class="contenedor-fila-lista flex items-center justify-between py-2.5 px-3">
                        <div class="bloque-info-producto flex items-baseline gap-2 max-w-[80%] flex-wrap">
                            <span class="texto-producto text-xs font-normal text-stone-800 break-words">${p.nombre}</span>
                            ${tagPrecio}
                            <span class="text-[9px] text-stone-400 shrink-0">🗂️ ${p.categoria}</span>
                        </div>
                        <div class="area-check ml-2 shrink-0">
                            <input type="checkbox" onchange="completarCompra('${p.id}')" class="checkbox-oculto">
                            <span class="chulito-falso"></span>
                        </div>
                    </div>
                `;
            });
            
            lugHTML += `</div></div>`;
            contenedor.innerHTML += lugHTML;
        }
    });
}

// Función auxiliar para renderizar la estructura interna de cada fila de la Despensa (Normal o Edición)
function generarFilaProductoHTML(p) {
    const esEditando = idProductoEditando === p.id;
    
    // Bloque Izquierdo: Información o Inputs de Edición
    let bloqueInfo = '';
    if (esEditando) {
        bloqueInfo = `
            <div class="flex items-center gap-1 w-[65%]">
                <button onclick="eliminarProducto('${p.id}')" class="btn-eliminar text-red-400 transition-colors font-sans pr-1 text-xs">✕</button>
                <input type="text" id="edit-nombre-${p.id}" value="${p.nombre}" class="w-full p-1 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-stone-400 todo-capitalizado">
                <input type="number" id="edit-precio-${p.id}" value="${p.precio}" class="w-20 p-1 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-stone-400 text-right">
            </div>
        `;
    } else {
        const stringPrecio = p.precio > 0 ? ` • $${p.precio.toLocaleString()}` : '';
        bloqueInfo = `
            <div class="flex items-baseline gap-1 max-w-[60%] truncate">
                <button onclick="eliminarProducto('${p.id}')" class="btn-eliminar text-stone-300 transition-colors font-sans pr-1 text-xs">✕</button>
                <p class="text-xs font-normal text-stone-800 truncate">${p.nombre}</p>
                <span class="text-[9px] text-stone-400 shrink-0 ml-1">📍 ${p.lugar}${stringPrecio}</span>
            </div>
        `;
    }

    // Bloque Derecho: Botones de Acción (Lápiz/Chulito y Llevar/Quitar)
    const botonEditar = esEditando 
        ? `<button onclick="guardarEdicion('${p.id}')" class="text-xs text-emerald-600 hover:text-emerald-700 px-1 font-sans">✓</button>`
        : `<button onclick="activarEdicion('${p.id}')" class="text-xs text-stone-400 hover:text-stone-600 px-1 font-sans">✏️</button>`;

    const botonLlevar = `
        <button onclick="toggleLista('${p.id}')" class="text-[10px] font-medium px-2 py-1 rounded transition-all ${p.enLista ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-800'}">
            ${p.enLista ? 'Quitar' : '＋ Llevar'}
        </button>
    `;

    return `
        <div class="flex items-center justify-between py-2 px-2.5 bg-white minimal-fila-despensa">
            ${bloqueInfo}
            <div class="flex items-center gap-2 shrink-0">
                ${botonEditar}
                ${botonLlevar}
            </div>
        </div>
    `;
}

// 🗂️ PESTAÑA 2: Despensa
function renderDespensa() {
    const contenedorCajon = document.getElementById('contenido-cajon');
    const contenedorNormal = document.getElementById('lista-despensa-agrupada');
    const buscadorInput = document.getElementById('search-despensa');
    if (!contenedorCajon || !contenedorNormal) return;

    const buscador = buscadorInput ? buscadorInput.value.toLowerCase() : '';
    
    contenedorCajon.innerHTML = '';
    contenedorNormal.innerHTML = '';

    const filtrados = datos.productos.filter(p => p.nombre.toLowerCase().includes(buscador));

    // 1. Cajón de pendientes
    const pendientes = filtrados.filter(p => p.pendiente);
    if (pendientes.length === 0) {
        contenedorCajon.innerHTML = `<p class="text-stone-400 p-3 text-center text-[11px]">No hay productos en espera.</p>`;
    } else {
        pendientes.forEach(p => {
            contenedorCajon.innerHTML += generarFilaProductoHTML(p);
        });
    }

    // 2. Listado normal agrupado por categoría
    const normales = filtrados.filter(p => !p.pendiente);

    datos.categorias.forEach(cat => {
        const prodDeEstaCat = normales.filter(p => p.categoria === cat);
        if (prodDeEstaCat.length > 0) {
            let catHTML = `
                <div class="space-y-1">
                    <h3 class="text-[10px] font-medium tracking-wider text-stone-400 uppercase ml-1">🔸 ${cat}</h3>
                    <div class="bg-white rounded-lg border border-stone-100 divide-y divide-stone-50 overflow-hidden shadow-2xs">
            `;

            prodDeEstaCat.forEach(p => {
                catHTML += generarFilaProductoHTML(p);
            });

            catHTML += `</div></div>`;
            contenedorNormal.innerHTML += catHTML;
        }
    });
}

// --- ACCIONES EDICIÓN EN CALIENTE ---
window.activarEdicion = function(id) {
    idProductoEditando = id;
    renderDespensa(); // Re-renderiza para mutar la fila seleccionada en inputs
}

window.guardarEdicion = function(id) {
    const nuevoNombre = document.getElementById(`edit-nombre-${id}`).value;
    const nuevoPrecio = document.getElementById(`edit-precio-${id}`).value;

    if (!nuevoNombre.trim() || !nuevoPrecio) {
        alert("El nombre y el precio son obligatorios.");
        return;
    }

    const prod = datos.productos.find(p => p.id === id);
    if (prod) {
        prod.nombre = capitalizarTexto(nuevoNombre);
        prod.precio = parseFloat(nuevoPrecio);
        idProductoEditando = null; // Cerramos modo edición
        sincronizar(); // Guardamos en Firebase y actualiza la UI globalmente
    }
}

// --- ACCIONES DE COMPRA ---
window.completarCompra = function(id) {
    setTimeout(() => {
        const prod = datos.productos.find(p => p.id === id);
        if(prod) {
            prod.enLista = false;
            sincronizar();
        }
    }, 250); 
}

window.toggleLista = function(id) {
    const prod = datos.productos.find(p => p.id === id);
    if(prod) {
        prod.enLista = !prod.enLista;
        sincronizar();
    }
}

window.eliminarProducto = function(id) {
    if(confirm("¿Seguro que deseas eliminar este producto por completo?")) {
        datos.productos = datos.productos.filter(p => p.id !== id);
        if(idProductoEditando === id) idProductoEditando = null;
        sincronizar();
    }
}

// --- SUBMITS ---
document.getElementById('form-producto').addEventListener('submit', (e) => {
    e.preventDefault();
    const inputPrecio = document.getElementById('prod-precio').value;
    const checkPendiente = document.getElementById('prod-pendiente').checked;
    const categoria = document.getElementById('prod-categoria').value;
    const lugar = document.getElementById('prod-lugar').value;
    
    // Doble verificación de seguridad para obligar campos cargados
    if(!categoria || !lugar) {
        alert("Por favor selecciona una Categoría y un Lugar válidos.");
        return;
    }

    const nuevoProd = {
        id: 'prod_' + Date.now(),
        nombre: capitalizarTexto(document.getElementById('prod-nombre').value),
        precio: parseFloat(inputPrecio), // Ya es obligatorio por el HTML, se parsea seguro
        categoria: categoria,
        lugar: lugar,
        pendiente: checkPendiente,
        enLista: false
    };
    
    datos.productos.push(nuevoProd);
    sincronizar();
    e.target.reset();
    
    const msg = document.getElementById('notificacion-guardado');
    if(msg) {
        msg.classList.remove('hidden');
        setTimeout(() => msg.classList.add('hidden'), 1500);
    }
});

document.getElementById('form-categoria').addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = capitalizarTexto(document.getElementById('cat-nombre').value);
    if(nombre && !datos.categorias.includes(nombre)) {
        datos.categorias.push(nombre);
        sincronizar();
    }
    e.target.reset();
});

document.getElementById('form-lugar').addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = capitalizarTexto(document.getElementById('lug-nombre').value);
    if(nombre && !datos.lugares.includes(nombre)) {
        datos.lugares.push(nombre);
        sincronizar();
    }
    e.target.reset();
});

const searchInput = document.getElementById('search-despensa');
if(searchInput) {
    searchInput.addEventListener('input', renderDespensa);
}

// --- CONEXIÓN EN TIEMPO REAL CON FIREBASE ---
escucharDatos((datosRemotos) => {
    if (datosRemotos) {
        // Mapeo seguro en caso de que falten los nodos raíz en una base de datos nueva
        datos.categorias = datosRemotos.categorias || [];
        datos.lugares = datosRemotos.lugares || [];
        datos.productos = datosRemotos.productos || [];
        datos.cajonAbierto = datosRemotos.cajonAbierto || false;
    } else {
        // Inicialización de esquema limpio si Firestore está en blanco
        sincronizar();
    }
    render();
});