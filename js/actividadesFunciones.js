// URL del archivo CSV público de Google Sheets
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTUsBbnFj5HlAxFGG3EprYN-t9b1zJKdRJCeJn1J5RszJAsCGBkkUm7oH-fKFcxKhadzluF0VzTiyPX/pub?output=csv';

/**
 * Convierte el texto CSV en un arreglo de objetos.
 * Cada objeto representa un evento con sus respectivas propiedades.
 */
function parseCSV(text) {
  const [headerLine, ...rows] = text.trim().split('\n'); // Separa encabezado y filas
  const keys = headerLine.split(',').map(k => k.trim()); // Obtiene nombres de columnas
  return rows.map(row => { // Crea un objeto para cada fila
    const values = row.split(',');
    const obj = {};
    keys.forEach((key, i) => {
      obj[key] = values[i] ? values[i].trim() : '';
    });
    return obj;
  });
}

/**
 * Valida si un evento está marcado como activo.
 */
function isActive(evento) {
  return evento.Activo === '1'; // Solo considera eventos activos
}

/**
 * Verifica si el evento aún no ha finalizado (es un evento próximo o en curso).
 */
function isUpcoming(evento) {
  const now = new Date();
  const end = evento.Fecha_fin ? new Date(evento.Fecha_fin) : new Date(evento.Fecha_inicio);
  return end >= now; // Evento es válido si aún no ha terminado
}

/**
 * Carga los eventos desde la hoja de cálculo, los filtra y los muestra en la página.
 */
async function cargarEventos() {
  const container = document.getElementById('eventos'); // Contenedor donde se mostrarán los eventos
  container.textContent = 'Cargando eventos...';
  try {
    // Se usa 'nocache' para forzar a obtener datos actualizados
    const response = await fetch(sheetUrl + '&nocache=' + Date.now());
    if (!response.ok) throw new Error('No se pudo cargar los datos');

    const text = await response.text();
    // Filtra eventos activos y próximos
    const eventos = parseCSV(text).filter(isActive).filter(isUpcoming);

    if (eventos.length === 0) { // Si no hay eventos disponibles
      container.innerHTML = `
        <div class="no-eventos">
          <h3>Próximamente más actividades</h3>
          <p>Actualmente no hay eventos activos o próximos programados.</p>
          <p>Vuelve pronto para enterarte de nuevas actividades en la biblioteca.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    // Crea una tarjeta para cada evento
    eventos.forEach((evento, idx) => {
      const imgSrc = evento.Imagen || 'https://via.placeholder.com/280x420?text=Sin+Imagen';
      const card = document.createElement('div');
      card.className = 'evento';
      card.dataset.idx = idx; // Guarda índice del evento para referencia
      card.innerHTML = `
        <div class="img-container"><img src="${imgSrc}" alt="${evento.Título}"></div>
        <div class="info">
          <div class="titulo">${evento.Título}</div>
          <div class="descripcion">${evento.Descripción}</div>
          <div class="fecha">Inicio: ${evento.Fecha_inicio} <br> Fin: ${evento.Fecha_fin || '–'}</div>
          <button class="btn-mas">Ver más</button>
        </div>`;
      container.appendChild(card);
    });

    setupModal(eventos); // Configura el modal para mostrar detalles de los eventos
  } catch (error) {
    container.innerHTML = `<p>Error: ${error.message}</p>`; // Muestra mensaje de error si falla la carga
  }
}

/**
 * Configura la funcionalidad del modal para mostrar detalles del evento seleccionado.
 */
function setupModal(eventos) {
  // Obtiene los elementos del modal
  const modal = document.getElementById('modal');
  const closeBtn = modal.querySelector('.modal-close');
  const titleEl = modal.querySelector('#modalTitle');
  const datesEl = modal.querySelector('#modalDates');
  const placeEl = modal.querySelector('#modalPlace');
  const placeSection = modal.querySelector('#modalPlaceSection');
  const modeEl = modal.querySelector('#modalMode');
  const reqsEl = modal.querySelector('#modalReqs');
  const groupsEl = modal.querySelector('#modalGroups');
  const formsEl = modal.querySelector('#modalForms');

  // Escucha clics en toda la página
  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-mas')) { // Si se hace clic en "Ver más"
      const idx = e.target.closest('.evento').dataset.idx; // Obtiene el índice del evento
      const ev = eventos[idx];

      // Muestra los detalles del evento en el modal
      titleEl.textContent = ev.Título;
      datesEl.textContent = `Inicio: ${ev.Fecha_inicio} • Fin: ${ev.Fecha_fin || '–'}`;

      if (ev.Lugar?.trim()) { // Si hay lugar, lo muestra
        placeEl.textContent = ev.Lugar;
        placeSection.style.display = '';
      } else {
        placeSection.style.display = 'none';
      }

      modeEl.textContent = ev.Modalidad || '–';
      reqsEl.innerHTML = ev.Requisitos
        ? ev.Requisitos.split(';').map(r => `<li>${r.trim()}</li>`).join('')
        : '<li>–</li>';
      groupsEl.innerHTML = ev.Grupos
        ? ev.Grupos.split(';').map(g => `<li>${g.trim()}</li>`).join('')
        : '<li>–</li>';

      // Configura los formularios por grupo
      formsEl.innerHTML = '';
      const grupos = ev.Grupos ? ev.Grupos.split(';') : [];
      const formularios = ev.Formularios ? ev.Formularios.split(';') : [];

      if (grupos.length === 1 && formularios.length === 1) { // Caso: un grupo y un formulario
        formsEl.innerHTML = `<li><a href="${formularios[0].trim()}" target="_blank" class="modal-link">Formulario de inscripción</a></li>`;
      } else if (grupos.length === formularios.length) { // Caso: varios grupos con sus formularios
        formsEl.innerHTML = grupos.map((g, i) => {
          const grupo = g.trim();
          const form = formularios[i].trim();
          return `<li><a href="${form}" target="_blank" class="modal-link">Formulario para ${grupo}</a></li>`;
        }).join('');
      } else { // Si no hay formularios válidos
        formsEl.innerHTML = '<li>–</li>';
      }

      modal.classList.add('active'); // Muestra el modal
    }

    // Cierra el modal si se hace clic en el botón cerrar o fuera del contenido
    if (e.target === closeBtn || e.target === modal) {
      modal.classList.remove('active');
    }
  });

  // Cierra el modal al presionar la tecla Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal.classList.remove('active');
  });
}

// Cuando la página carga, se ejecuta cargarEventos
window.addEventListener('load', cargarEventos);
