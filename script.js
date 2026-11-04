const zona = document.getElementById('zona');
const archivo = document.getElementById('archivo');
const vista = document.getElementById('vista');
const lista = document.getElementById('lista');
const titular = document.getElementById('titular');
const resultado = document.getElementById('resultado');

// Convierte RGB a HSL (h: 0-360, s y l: 0-1)
function rgbAHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0, s = 0, l = (max + min) / 2;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [h, s, l];
}

// Clasifica cada píxel en una familia de color
function clasificar(r, g, b) {
  const [h, s, l] = rgbAHsl(r, g, b);
  if (l < 0.12) return 'Negro';
  if (l > 0.92) return 'Blanco';
  if (s < 0.12) return 'Gris';
  if (h < 15 || h >= 345) return l < 0.3 ? 'Café' : 'Rojo';
  if (h < 40) return l < 0.42 ? 'Café' : 'Naranja';
  if (h < 70) return 'Amarillo';
  if (h < 165) return 'Verde';
  if (h < 200) return 'Turquesa';
  if (h < 255) return 'Azul';
  if (h < 290) return 'Morado';
  return 'Rosa';
}

function analizar(img) {
  const lado = 120; // se reduce la imagen para que sea rápido
  const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.naturalWidth * escala));
  c.height = Math.max(1, Math.round(img.naturalHeight * escala));
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const datos = ctx.getImageData(0, 0, c.width, c.height).data;

  const grupos = {};
  let total = 0;
  for (let i = 0; i < datos.length; i += 4) {
    if (datos[i + 3] < 128) continue; // ignora transparencia
    const r = datos[i], g = datos[i + 1], b = datos[i + 2];
    const nombre = clasificar(r, g, b);
    const gr = grupos[nombre] || (grupos[nombre] = { n: 0, r: 0, g: 0, b: 0 });
    gr.n++; gr.r += r; gr.g += g; gr.b += b;
    total++;
  }

  return Object.entries(grupos)
    .map(([nombre, v]) => ({
      nombre,
      pct: (v.n / total) * 100,
      rgb: [Math.round(v.r / v.n), Math.round(v.g / v.n), Math.round(v.b / v.n)]
    }))
    .sort((a, b) => b.pct - a.pct);
}

const aHex = ([r, g, b]) =>
  '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

function mostrar(colores) {
  const top = colores[0];
  titular.innerHTML = `Predomina el <b>${top.nombre.toLowerCase()}</b> con ${top.pct.toFixed(1)}%`;
  lista.innerHTML = '';

  colores.filter(c => c.pct >= 0.5).forEach(c => {
    const hex = aHex(c.rgb);
    const fila = document.createElement('div');
    fila.className = 'fila';
    fila.innerHTML = `
      <div class="muestra" style="background:${hex}"></div>
      <div>
        <div class="nombre"><span>${c.nombre}</span><span class="hex">${hex}</span></div>
        <div class="barra"><i style="background:${hex}"></i></div>
      </div>
      <div class="pct">${c.pct.toFixed(1)}%</div>`;
    lista.appendChild(fila);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fila.querySelector('i').style.width = c.pct + '%';
    }));
  });

  resultado.classList.add('visible');
  resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function procesar(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  vista.onload = () => {
    mostrar(analizar(vista));
    URL.revokeObjectURL(url);
  };
  vista.src = url;
}

// Eventos
zona.addEventListener('click', () => archivo.click());
document.getElementById('otra').addEventListener('click', () => archivo.click());
archivo.addEventListener('change', e => {
  procesar(e.target.files[0]);
  archivo.value = ''; // permite subir la misma imagen otra vez
});

zona.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    archivo.click();
  }
});

['dragenter', 'dragover'].forEach(ev =>
  zona.addEventListener(ev, e => {
    e.preventDefault();
    zona.classList.add('arrastrando');
  })
);
['dragleave', 'drop'].forEach(ev =>
  zona.addEventListener(ev, e => {
    e.preventDefault();
    zona.classList.remove('arrastrando');
  })
);
zona.addEventListener('drop', e => procesar(e.dataTransfer.files[0]));

