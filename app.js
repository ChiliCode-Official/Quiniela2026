const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTonzylHgo9XmI0GnTzyfkKSaORL7yFW0tuyzTGgOC-4QvX-UKT7VKHI_w01u9afeBtw/exec';

function safeNewDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  var str = dateStr.toString().trim();
  if (str.indexOf(' ') !== -1 && str.indexOf('T') === -1) {
    str = str.replace(' ', 'T');
  }
  return new Date(str);
}

function loadLocalInputCache() {
  if (!currentUser) {
    localInputCache = {};
    return;
  }
  const saved = localStorage.getItem(`quiniela_local_cache_${currentUser}`);
  if (saved) {
    try {
      localInputCache = JSON.parse(saved);
    } catch (e) {
      localInputCache = {};
    }
  } else {
    localInputCache = {};
  }
}

function saveLocalInputCache() {
  if (currentUser) {
    localStorage.setItem(`quiniela_local_cache_${currentUser}`, JSON.stringify(localInputCache));
  }
}

// --- ESTADO GLOBAL ---
let currentUser = null;
let currentPoints = 0;
let matchesData = [];
let userPredictions = [];
let localInputCache = {};

let searchQueryQ = '';
let stageFilterQ = 'all';
let groupFilterQ = 'all';

let searchQueryR = '';
let stageFilterR = 'all';
let groupFilterR = 'all';

const teamToGroup = {
  'México': 'Grupo A', 'Sudáfrica': 'Grupo A', 'Corea del Sur': 'Grupo A', 'República Checa': 'Grupo A',
  'Canadá': 'Grupo B', 'Bosnia y Herzegovina': 'Grupo B', 'Catar': 'Grupo B', 'Suiza': 'Grupo B',
  'Brasil': 'Grupo C', 'Marruecos': 'Grupo C', 'Haití': 'Grupo C', 'Escocia': 'Grupo C',
  'Estados Unidos': 'Grupo D', 'Paraguay': 'Grupo D', 'Australia': 'Grupo D', 'Turquía': 'Grupo D',
  'Alemania': 'Grupo E', 'Curazao': 'Grupo E', 'Costa de Marfil': 'Grupo E', 'Ecuador': 'Grupo E',
  'Países Bajos': 'Grupo F', 'Japón': 'Grupo F', 'Suecia': 'Grupo F', 'Túnez': 'Grupo F',
  'Bélgica': 'Grupo G', 'Egipto': 'Grupo G', 'Irán': 'Grupo G', 'Nueva Zelanda': 'Grupo G',
  'España': 'Grupo H', 'Cabo Verde': 'Grupo H', 'Arabia Saudita': 'Grupo H', 'Uruguay': 'Grupo H',
  'Francia': 'Grupo I', 'Senegal': 'Grupo I', 'Irak': 'Grupo I', 'Noruega': 'Grupo I',
  'Argentina': 'Grupo J', 'Argelia': 'Grupo J', 'Austria': 'Grupo J', 'Jordania': 'Grupo J',
  'Portugal': 'Grupo K', 'RD Congo': 'Grupo K', 'Uzbekistán': 'Grupo K', 'Colombia': 'Grupo K',
  'Inglaterra': 'Grupo L', 'Croacia': 'Grupo L', 'Ghana': 'Grupo L', 'Panamá': 'Grupo L'
};

const flagMap = {
  'México': 'mx', 'Sudáfrica': 'za', 'Corea del Sur': 'kr', 'República Checa': 'cz',
  'Canadá': 'ca', 'Bosnia y Herzegovina': 'ba', 'Catar': 'qa', 'Suiza': 'ch',
  'Brasil': 'br', 'Marruecos': 'ma', 'Haití': 'ht', 'Escocia': 'gb-sct',
  'Estados Unidos': 'us', 'Paraguay': 'py', 'Australia': 'au', 'Turquía': 'tr',
  'Alemania': 'de', 'Curazao': 'cw', 'Costa de Marfil': 'ci', 'Ecuador': 'ec',
  'Países Bajos': 'nl', 'Japón': 'jp', 'Suecia': 'se', 'Túnez': 'tn',
  'Bélgica': 'be', 'Egipto': 'eg', 'Irán': 'ir', 'Nueva Zelanda': 'nz',
  'España': 'es', 'Cabo Verde': 'cv', 'Arabia Saudita': 'sa', 'Uruguay': 'uy',
  'Francia': 'fr', 'Senegal': 'sn', 'Irak': 'iq', 'Noruega': 'no',
  'Argentina': 'ar', 'Argelia': 'dz', 'Austria': 'at', 'Jordania': 'jo',
  'Portugal': 'pt', 'RD Congo': 'cd', 'Uzbekistán': 'uz', 'Colombia': 'co',
  'Inglaterra': 'gb-eng', 'Croacia': 'hr', 'Ghana': 'gh', 'Panamá': 'pa'
};

function getMatchStage(partidoId) {
  const id = parseInt(partidoId);
  if (id >= 1 && id <= 72) return 'grupos';
  if (id >= 73 && id <= 88) return '16avos';
  if (id >= 89 && id <= 96) return 'octavos';
  if (id >= 97 && id <= 100) return 'cuartos';
  if (id >= 101 && id <= 102) return 'semis';
  if (id == 103) return 'tercer';
  if (id == 104) return 'final';
  return 'unknown';
}

function updateAlertsBanner() {
  const banner = document.getElementById('quiniela-alerts');
  if (!banner) return;
  
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const twoDaysMs = 2 * oneDayMs;
  const sevenDaysMs = 7 * oneDayMs;
  
  let pending1Day = 0;
  let pending2Days = 0;
  let pending7Days = 0;
  
  matchesData.forEach(match => {
    const hasSavedProno = userPredictions.some(p => p.partidoId == match.partidoId && p.golesLocal !== '' && p.golesVisitante !== '');
    const hasCachedProno = localInputCache[match.partidoId] && localInputCache[match.partidoId].golesLocal !== '' && localInputCache[match.partidoId].golesVisitante !== '';
    const hasPrediction = hasSavedProno || hasCachedProno;
    if (!hasPrediction && (match.status === 'SCHEDULED' || match.status === 'TIMED')) {
      const matchDate = match.date ? safeNewDate(match.date) : null;
      if (matchDate) {
        const lockTime = new Date(matchDate.getTime() - oneDayMs);
        const diff = lockTime - now;
        
        if (diff > 0) {
          if (diff <= oneDayMs) {
            pending1Day++;
          } else if (diff <= twoDaysMs) {
            pending2Days++;
          } else if (diff <= sevenDaysMs) {
            pending7Days++;
          }
        }
      }
    }
  });
  
  if (pending1Day > 0 || pending2Days > 0 || pending7Days > 0) {
    banner.classList.remove('hide');
    let html = `
      <div style="display:flex; align-items:center; gap:10px;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:1.2rem;"></i>
        <span><strong>¡Recordatorio de Pronósticos Pendientes!</strong></span>
      </div>
      <ul style="margin-top: 8px; padding-left: 20px; font-weight: 500;">
    `;
    if (pending1Day > 0) {
      html += `<li><i class="fa-solid fa-circle-exclamation text-red"></i> ${pending1Day} partido(s) cierran en menos de 24 horas</li>`;
    }
    if (pending2Days > 0) {
      html += `<li><i class="fa-solid fa-clock text-yellow"></i> ${pending2Days} partido(s) cierran en menos de 2 días</li>`;
    }
    if (pending7Days > 0) {
      html += `<li><i class="fa-solid fa-calendar-day text-primary"></i> ${pending7Days} partido(s) cierran en menos de 1 semana</li>`;
    }
    html += `</ul>`;
    banner.innerHTML = html;
  } else {
    banner.classList.add('hide');
  }
}

function checkAndSendNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const twoDaysMs = 2 * oneDayMs;
  const sevenDaysMs = 7 * oneDayMs;
  
  let pending1Day = 0;
  let pending2Days = 0;
  let pending7Days = 0;
  
  matchesData.forEach(match => {
    const hasSavedProno = userPredictions.some(p => p.partidoId == match.partidoId && p.golesLocal !== '' && p.golesVisitante !== '');
    const hasCachedProno = localInputCache[match.partidoId] && localInputCache[match.partidoId].golesLocal !== '' && localInputCache[match.partidoId].golesVisitante !== '';
    const hasPrediction = hasSavedProno || hasCachedProno;
    if (!hasPrediction && (match.status === 'SCHEDULED' || match.status === 'TIMED')) {
      const matchDate = match.date ? safeNewDate(match.date) : null;
      if (matchDate) {
        const lockTime = new Date(matchDate.getTime() - oneDayMs);
        const diff = lockTime - now;
        
        if (diff > 0) {
          if (diff <= oneDayMs) {
            pending1Day++;
          } else if (diff <= twoDaysMs) {
            pending2Days++;
          } else if (diff <= sevenDaysMs) {
            pending7Days++;
          }
        }
      }
    }
  });
  
  const lastSent = localStorage.getItem('last_notif_time');
  const timeSinceLast = lastSent ? (now.getTime() - parseInt(lastSent)) : Infinity;
  
  if (timeSinceLast > 12 * 60 * 60 * 1000) {
    let title = "Quiniela Mundial 2026";
    let body = "";
    
    if (pending1Day > 0) {
      body = `¡Alerta! Tienes ${pending1Day} partidos pendientes que cierran en menos de 24 horas. ¡Envía tus pronósticos ya!`;
    } else if (pending2Days > 0) {
      body = `Recordatorio: Tienes ${pending2Days} partidos pendientes que cierran en menos de 2 días.`;
    } else if (pending7Days > 0) {
      body = `Aviso: Tienes ${pending7Days} partidos pendientes que cierran en menos de 1 semana.`;
    }
    
    if (body) {
      new Notification(title, {
        body: body,
        icon: './icon.svg'
      });
      localStorage.setItem('last_notif_time', now.getTime().toString());
    }
  }
}

// --- THEME TOGGLE (Light/Dark Material 3) ---
const themeBtn = document.getElementById('theme-btn');
const body = document.body;
const savedTheme = localStorage.getItem('theme') || 'light';
body.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

themeBtn.addEventListener('click', () => {
  const currentTheme = body.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  body.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
  themeBtn.innerHTML = theme === 'light' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
}

// --- PWA SETUP ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registrado', reg))
      .catch(err => console.log('SW error', err));
  });
}

let deferredPrompt;
const installBtn = document.getElementById('install-nav-item');
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

if (isStandalone) {
  if (installBtn) installBtn.classList.add('hide');
} else {
  if (isIOS) {
    if (installBtn) {
      installBtn.classList.remove('hide');
      installBtn.addEventListener('click', () => {
        document.getElementById('ios-modal').classList.remove('hide');
      });
    }
    document.getElementById('close-ios').addEventListener('click', () => document.getElementById('ios-modal').classList.add('hide'));
    document.getElementById('got-it-ios').addEventListener('click', () => document.getElementById('ios-modal').classList.add('hide'));
  } else if (!isMobile) {
    if (installBtn) {
      installBtn.classList.remove('hide');
      installBtn.addEventListener('click', () => {
        document.getElementById('qr-modal').classList.remove('hide');
      });
    }
    document.getElementById('close-qr').addEventListener('click', () => {
      document.getElementById('qr-modal').classList.add('hide');
    });
  } else {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) installBtn.classList.remove('hide');
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') installBtn.classList.add('hide');
          deferredPrompt = null;
        }
      });
    }
  }
}

// --- UTILIDADES ---
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.background = type === 'error' ? 'var(--danger)' : (type === 'warning' ? 'var(--warning)' : 'var(--success)');
  toast.style.color = type === 'warning' ? '#000' : '#fff';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatDate(isoString) {
  if (!isoString) return 'Fecha por definir';
  const d = safeNewDate(isoString);
  return d.toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' hrs';
}

// --- PASSWORD TOGGLE ---
const togglePassword = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');
if (togglePassword && passwordInput) {
  togglePassword.addEventListener('click', (e) => {
    e.preventDefault();
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    togglePassword.innerHTML = isPassword ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
  });
}

// --- NAVEGACIÓN ---
const navItems = document.querySelectorAll('.nav-item');
const tabs = document.querySelectorAll('.tab-content');

function handleNavigation(e) {
  // Buscamos el botón más cercano (por si se hizo clic en el icono)
  const item = e.currentTarget;
  const target = item.getAttribute('data-target');
  if (!target) return;

  e.preventDefault();
  e.stopPropagation();

  // 1. Feedback Visual Inmediato
  navItems.forEach(nav => nav.classList.remove('active'));
  item.classList.add('active');

  // 2. Cambiar Contenido
  tabs.forEach(tab => tab.classList.add('hide'));
  const targetTab = document.getElementById(target);
  if (targetTab) {
    targetTab.classList.remove('hide');
    window.scrollTo({ top: 0, behavior: 'auto' }); // 'auto' es más fiable que 'smooth' para cambios de pestaña
  }

  // 3. Cargar datos específicos
  if (target === 'tab-podio') loadPodio();
  else if (target === 'tab-resultados') renderResultados();
  else if (target === 'tab-quiniela') renderQuiniela();
}

navItems.forEach(item => {
  // Usamos solo un tipo de evento para evitar conflictos
  // Los navegadores modernos manejan el clic sin delay si el viewport está bien configurado
  item.addEventListener('click', handleNavigation);
});

// --- AUTO LOGIN & LOGOUT ---
const savedEmail = localStorage.getItem('quiniela_email');
const savedPass = localStorage.getItem('quiniela_pass');
if (savedEmail && savedPass) {
  document.getElementById('loading-overlay').classList.remove('hide');
  autoLogin(savedEmail, savedPass);
}

async function autoLogin(email, pass) {
  try {
    const queryParams = new URLSearchParams({ action: 'login', email: email, password: pass }).toString();
    const res = await fetch(`${SCRIPT_URL}?${queryParams}`);
    const data = await res.json();
    document.getElementById('loading-overlay').classList.add('hide');
    if (data.success) {
      currentUser = data.username;
      currentPoints = data.puntos;
      initApp();
    } else {
      showToast('Sesión expirada. Inicia de nuevo.', 'error');
      localStorage.removeItem('quiniela_email');
      localStorage.removeItem('quiniela_pass');
    }
  } catch (e) {
    document.getElementById('loading-overlay').classList.add('hide');
    showToast('Error de conexión automático.', 'error');
  }
}

document.getElementById('btn-logout').addEventListener('click', () => {
  localStorage.removeItem('quiniela_email');
  localStorage.removeItem('quiniela_pass');
  location.reload();
});

// --- AUTHENTICATION ---
const authForm = document.getElementById('auth-form');
const authMsg = document.getElementById('auth-msg');

document.getElementById('btn-login').addEventListener('click', (e) => handleAuth(e, 'login'));
document.getElementById('btn-register').addEventListener('click', (e) => handleAuth(e, 'register'));

async function handleAuth(e, action) {
  e.preventDefault();
  const emailInput = document.getElementById('email').value.trim();
  const usernameInput = document.getElementById('username') ? document.getElementById('username').value.trim() : '';
  const passwordInputValue = document.getElementById('password').value;
  
  if (!emailInput || !passwordInputValue) {
    showToast('Llena correo y contraseña', 'warning');
    return;
  }
  
  if (action === 'register') {
    if (!usernameInput) {
      showToast('Debes poner un nombre de usuario', 'warning');
      return;
    }
    if (!emailInput.endsWith('@notaria134.com.mx')) {
      showToast('Solo correos @notaria134.com.mx permitidos', 'error');
      return;
    }
  }
  
  document.getElementById('loading-overlay').classList.remove('hide');
  
  try {
    const queryParams = new URLSearchParams({ action, email: emailInput, username: usernameInput, password: passwordInputValue }).toString();
    const res = await fetch(`${SCRIPT_URL}?${queryParams}`);
    const data = await res.json();
    
    document.getElementById('loading-overlay').classList.add('hide');
    
    if (data.success) {
      if (action === 'login') {
        currentUser = data.username;
        currentPoints = data.puntos;
        localStorage.setItem('quiniela_email', emailInput);
        localStorage.setItem('quiniela_pass', passwordInputValue);
        initApp();
      } else {
        showToast('¡Cuenta creada exitosamente!', 'success');
        authMsg.textContent = '¡Listo! Tu cuenta fue creada. Haz clic en "Entrar".';
        authMsg.style.color = 'var(--success)';
      }
    } else {
      showToast(data.message, 'error');
    }
  } catch (error) {
    document.getElementById('loading-overlay').classList.add('hide');
    showToast('Error de conexión. Revisa tu internet.', 'error');
  }
}

// --- APP INITIALIZATION ---
let hasShownConfetti = false;

// Pull-To-Refresh setup
let ptrStartY = 0;
let ptrCurrentY = 0;
let isPulling = false;
const ptrIndicator = document.getElementById('ptr-indicator');
const ptrIcon = document.getElementById('ptr-icon');

document.addEventListener('touchstart', (e) => {
  if (window.scrollY === 0) {
    ptrStartY = e.touches[0].clientY;
    isPulling = true;
  }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (!isPulling) return;
  ptrCurrentY = e.touches[0].clientY;
  const pullDistance = ptrCurrentY - ptrStartY;
  
  if (pullDistance > 0 && window.scrollY === 0) {
    ptrIndicator.style.transform = `translateY(${Math.min(pullDistance / 2, 80)}px)`;
    if (pullDistance > 120) {
      ptrIcon.className = 'fa-solid fa-rotate text-primary';
    } else {
      ptrIcon.className = 'fa-solid fa-arrow-down text-primary';
    }
  }
}, { passive: true });

document.addEventListener('touchend', () => {
  if (!isPulling) return;
  isPulling = false;
  const pullDistance = ptrCurrentY - ptrStartY;
  
  if (pullDistance > 120 && window.scrollY === 0) {
    ptrIcon.className = 'fa-solid fa-circle-notch fa-spin text-primary';
    if (navigator.vibrate) navigator.vibrate(50);
    initApp().then(() => {
      ptrIndicator.style.transform = 'translateY(0)';
      ptrIcon.className = 'fa-solid fa-arrow-down text-primary';
    });
  } else {
    ptrIndicator.style.transform = 'translateY(0)';
  }
});

async function initApp() {
  document.getElementById('auth-view').classList.remove('active-view');
  document.getElementById('main-view').classList.add('active-view');
  document.getElementById('bottom-nav').classList.remove('hide');
  
  document.getElementById('display-user').textContent = currentUser;
  document.getElementById('display-pts').textContent = currentPoints + ' pts';
  
  // Solicitar permiso de notificaciones
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  
  loadLocalInputCache();
  
  await loadMatchesData();
  
  // Confetti and rank logic
  loadUserRankAndConfetti();
  
  // Ejecutar verificación de recordatorios
  checkAndSendNotifications();
}

async function loadUserRankAndConfetti() {
  try {
    const res = await fetch(`${SCRIPT_URL}?action=getPodio`);
    const data = await res.json();
    if (data.success && data.podio) {
      const index = data.podio.findIndex(u => u.username === currentUser);
      if (index !== -1) {
        const rank = index + 1;
        const displayRank = document.getElementById('display-rank');
        if (displayRank) {
          displayRank.textContent = `#${rank}`;
          displayRank.style.display = 'inline-block';
          if (rank === 1) {
            displayRank.style.background = '#FFD700'; // Gold
          } else if (rank === 2) {
            displayRank.style.background = '#C0C0C0'; // Silver
          } else if (rank === 3) {
            displayRank.style.background = '#CD7F32'; // Bronze
          } else {
            displayRank.style.background = 'var(--primary)';
            displayRank.style.color = 'white';
          }
        }
      }
      
      // Confetti Logic (Solo si los puntos aumentaron)
      const savedPointsKey = `last_known_points_${currentUser}`;
      const lastPoints = parseInt(localStorage.getItem(savedPointsKey)) || 0;
      
      if (currentPoints > lastPoints && !hasShownConfetti) {
        hasShownConfetti = true;
        if (window.confetti) {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            zIndex: 9999
          });
        }
      }
      
      // Guardamos la puntuación actual para la próxima vez
      localStorage.setItem(savedPointsKey, currentPoints);
    }
  } catch(e) {
    console.error("Error loading rank", e);
  }
}

async function loadMatchesData() {
  const quinielaList = document.getElementById('quiniela-list');
  const podioList = document.getElementById('podio-list');
  const resultadosList = document.getElementById('resultados-list');
  
  // Mostrar Skeleton Loaders
  const skeletonHTML = `
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
  `;
  if (quinielaList && quinielaList.innerHTML === '') quinielaList.innerHTML = skeletonHTML;
  if (podioList && podioList.innerHTML === '') podioList.innerHTML = skeletonHTML;
  if (resultadosList && resultadosList.innerHTML === '') resultadosList.innerHTML = skeletonHTML;

  try {
    const resPartidos = await fetch(`${SCRIPT_URL}?action=getPartidos`);
    const dataPartidos = await resPartidos.json();
    if (dataPartidos.success) matchesData = dataPartidos.matches;
    
    const resPronos = await fetch(`${SCRIPT_URL}?action=getMisPronosticos&username=${currentUser}`);
    const dataPronos = await resPronos.json();
    if (dataPronos.success) userPredictions = dataPronos.pronosticos;
    
    renderQuiniela();
    if (document.getElementById('resultados-list').parentElement.classList.contains('active-view')) {
      renderResultados();
    }
  } catch (error) {
    showToast('Error cargando datos reales', 'error');
  }
}

function renderQuiniela() {
  const container = document.getElementById('quiniela-list');
  container.innerHTML = '';
  
  const upcomingMatches = matchesData.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED');
  
  // Actualizar banner de alertas de cierre
  updateAlertsBanner();
  
  // Aplicar filtros
  const filteredMatches = upcomingMatches.filter(match => {
    // 1. Filtro por Texto
    const local = match.equipoLocal.toLowerCase();
    const visitante = match.equipoVisitante.toLowerCase();
    if (searchQueryQ && !local.includes(searchQueryQ) && !visitante.includes(searchQueryQ)) {
      return false;
    }
    
    // 2. Filtro por Etapa
    const stage = getMatchStage(match.partidoId);
    if (stageFilterQ !== 'all' && stage !== stageFilterQ) {
      return false;
    }
    
    // 3. Filtro por Grupo
    if (groupFilterQ !== 'all') {
      if (stage !== 'grupos') return false;
      const matchGroup = teamToGroup[match.equipoLocal];
      if (matchGroup !== groupFilterQ) {
        return false;
      }
    }
    
    return true;
  });
  
  if (filteredMatches.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-face-frown-open"></i>
        <h3>¡Sin Resultados!</h3>
        <p style="margin-top: 10px;">No hay partidos que coincidan con la búsqueda.</p>
      </div>
    `;
    return;
  }
  
  // Ordenar por fecha
  filteredMatches.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return safeNewDate(a.date) - safeNewDate(b.date);
  });
  
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  filteredMatches.forEach(match => {
    const cached = localInputCache[match.partidoId];
    const prono = userPredictions.find(p => p.partidoId == match.partidoId);
    
    let pLocal = '';
    let pVisit = '';
    let isPending = false;
    
    if (cached) {
      pLocal = cached.golesLocal;
      pVisit = cached.golesVisitante;
      const savedLocal = prono ? String(prono.golesLocal).trim() : '';
      const savedVisit = prono ? String(prono.golesVisitante).trim() : '';
      if (String(pLocal).trim() !== savedLocal || String(pVisit).trim() !== savedVisit) {
        isPending = true;
      }
    } else if (prono) {
      pLocal = String(prono.golesLocal).trim();
      pVisit = String(prono.golesVisitante).trim();
    }
    
    const matchDate = match.date ? safeNewDate(match.date) : null;
    const lockTime = matchDate ? new Date(matchDate.getTime() - oneDayMs) : null;
    const isLocked = lockTime && now >= lockTime;
    
    const localCode = flagMap[match.equipoLocal] || 'un';
    const visitCode = flagMap[match.equipoVisitante] || 'un';
    const localFlag = `https://flagcdn.com/w80/${localCode}.png`;
    const visitFlag = `https://flagcdn.com/w80/${visitCode}.png`;
    
    let isLive = false;
    if (match.status === 'IN_PLAY' || match.status === 'PAUSED') isLive = true;
    
    let statusText = 'PREDICCIÓN: FALTANTE';
    let statusClass = 'scheduled';
    if (pLocal !== '' && pVisit !== '') {
      statusText = 'PREDICCIÓN: SÍ | RESULTADO: PENDIENTE';
      statusClass = 'finished';
    }
    if (isLive) {
      statusText = 'EN VIVO';
      statusClass = 'live';
    }

    let saveBtnHtml = '';
    if (!isLocked) {
      const btnClass = isPending ? 'btn-save-prono pending-save' : (prono ? 'btn-save-prono saved' : 'btn-save-prono');
      const btnText = isPending ? 'Actualizar' : (prono ? 'Guardado' : 'Guardar');
      const btnIcon = isPending ? '<i class="fa-solid fa-rotate"></i>' : (prono ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-floppy-disk"></i>');
      saveBtnHtml = `
        <div class="match-action">
          <button id="btn-${match.partidoId}" class="${btnClass}" onclick="savePrediction(${match.partidoId}, this)">
            ${btnIcon} ${btnText}
          </button>
        </div>
      `;
    }
    
    const div = document.createElement('div');
    div.className = isLocked ? 'm-card match-card locked-card' : 'm-card match-card';
    
    div.innerHTML = `
      <div class="match-header">
        <span>COPA DE FÚTBOL</span>
        <span class="match-date">${match.date ? new Date(match.date).toLocaleString('es-MX', {day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit'}) : 'Por definir'}</span>
      </div>
      
      <div class="teams-container">
        <div class="team">
          <img src="${localFlag}" class="flag-img" onerror="this.src='https://flagcdn.com/w80/un.png'">
          <span class="team-name">${match.equipoLocal}</span>
        </div>
        <div class="vs-col">
          <span class="vs-text">VS</span>
        </div>
        <div class="team">
          <img src="${visitFlag}" class="flag-img" onerror="this.src='https://flagcdn.com/w80/un.png'">
          <span class="team-name">${match.equipoVisitante}</span>
        </div>
      </div>
      
      <div class="score-controls-row">
        <div class="score-control">
          <button class="btn-score" onclick="changeScore('h-${match.partidoId}', -1)" ${isLocked ? 'disabled' : ''}>-</button>
          <input type="number" id="h-${match.partidoId}" class="score-input" min="0" max="20" placeholder="-" value="${pLocal}" onchange="markAsPending(${match.partidoId})" ${isLocked ? 'disabled' : ''}>
          <button class="btn-score" onclick="changeScore('h-${match.partidoId}', 1)" ${isLocked ? 'disabled' : ''}>+</button>
        </div>
        <span style="font-weight: 800; color: var(--text-muted);">:</span>
        <div class="score-control">
          <button class="btn-score" onclick="changeScore('a-${match.partidoId}', -1)" ${isLocked ? 'disabled' : ''}>-</button>
          <input type="number" id="a-${match.partidoId}" class="score-input" min="0" max="20" placeholder="-" value="${pVisit}" onchange="markAsPending(${match.partidoId})" ${isLocked ? 'disabled' : ''}>
          <button class="btn-score" onclick="changeScore('a-${match.partidoId}', 1)" ${isLocked ? 'disabled' : ''}>+</button>
        </div>
      </div>
      
      ${saveBtnHtml}
      
      <div class="match-status-bar">
        <div class="status-pill ${statusClass}">${statusText}</div>
      </div>
    `;
    container.appendChild(div);
  });
}

window.changeScore = function(inputId, amount) {
  if (navigator.vibrate) navigator.vibrate(10);
  const input = document.getElementById(inputId);
  if (!input || input.disabled) return;
  let val = parseInt(input.value);
  if (isNaN(val)) val = 0;
  val += amount;
  if (val < 0) val = 0;
  if (val > 20) val = 20;
  input.value = val;
  
  const partidoId = inputId.split('-')[1];
  markAsPending(partidoId);
}

window.autoSaveTimers = window.autoSaveTimers || {};

window.markAsPending = function(partidoId) {
  const hInput = document.getElementById(`h-${partidoId}`);
  const aInput = document.getElementById(`a-${partidoId}`);
  const btnSave = document.getElementById(`btn-${partidoId}`);
  
  if (!hInput || !aInput || !btnSave) return;
  
  const hVal = hInput.value.trim();
  const aVal = aInput.value.trim();
  
  const prono = userPredictions.find(p => p.partidoId == partidoId);
  const savedLocal = prono ? String(prono.golesLocal).trim() : '';
  const savedVisit = prono ? String(prono.golesVisitante).trim() : '';
  
  if (hVal === savedLocal && aVal === savedVisit) {
    delete localInputCache[partidoId];
    btnSave.className = 'btn-save-prono' + (prono ? ' saved' : '');
    btnSave.innerHTML = prono ? '<i class="fa-solid fa-check"></i> Actualizar' : 'Guardar';
  } else {
    localInputCache[partidoId] = { golesLocal: hVal, golesVisitante: aVal };
    btnSave.className = 'btn-save-prono pending-save';
    btnSave.innerHTML = '<i class="fa-solid fa-rotate"></i> Actualizar';
    
    // Autoguardado al ingresar ambos valores (espera 600ms después del último número ingresado)
    if (hVal !== '' && aVal !== '') {
      if (window.autoSaveTimers[partidoId]) {
        clearTimeout(window.autoSaveTimers[partidoId]);
      }
      window.autoSaveTimers[partidoId] = setTimeout(() => {
        // Solo llamamos savePrediction si el botón no está deshabilitado por un guardado anterior
        if (!btnSave.disabled) {
          savePrediction(partidoId, btnSave);
        }
      }, 600);
    }
  }
  saveLocalInputCache();
  updateAlertsBanner();
}

window.savePrediction = async function(partidoId, btn) {
  if (!btn) btn = event.currentTarget;
  
  const hInput = document.getElementById(`h-${partidoId}`).value;
  const aInput = document.getElementById(`a-${partidoId}`).value;
  
  if (hInput === '' || aInput === '') {
    showToast('Ingresa ambos resultados', 'warning');
    return;
  }
  
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
  btn.disabled = true;
  
  try {
    const queryParams = new URLSearchParams({
      action: 'predict',
      username: currentUser,
      partidoId: partidoId,
      golesLocal: hInput,
      golesVisitante: aInput
    }).toString();
    
    const res = await fetch(`${SCRIPT_URL}?${queryParams}`);
    const data = await res.json();
    
    btn.disabled = false;
    if (data.success) {
      // Update memory
      let prono = userPredictions.find(p => p.partidoId == partidoId);
      if (prono) {
        prono.golesLocal = hInput;
        prono.golesVisitante = aInput;
      } else {
        userPredictions.push({ partidoId: partidoId, golesLocal: hInput, golesVisitante: aInput });
      }
      
      delete localInputCache[partidoId];
      saveLocalInputCache();
      
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      btn.className = 'btn-save-prono saved';
      btn.innerHTML = `<dotlottie-player src="https://lottie.host/8c067e41-0306-4443-8f0a-1102928574d7/1n13wFzLWe.json" background="transparent" speed="1" style="width: 25px; height: 25px;" autoplay></dotlottie-player> Guardado`;
      
      showToast('Pronóstico guardado exitosamente', 'success');
      updateAlertsBanner();
    } else {
      showToast(data.message, 'error');
      btn.innerHTML = originalHtml;
    }
  } catch (error) {
    btn.disabled = false;
    showToast('Error al guardar', 'error');
    btn.innerHTML = originalHtml;
  }
}

async function loadPodio() {
  const container = document.getElementById('podio-list');
  
  // Cargamos los datos reales del servidor para todos los usuarios
  container.innerHTML = '<div style="text-align:center; padding: 30px;"><i class="fa-solid fa-spinner fa-spin fa-2x text-muted"></i></div>';
  
  try {
    const res = await fetch(`${SCRIPT_URL}?action=getPodio`);
    const data = await res.json();
    
    if (data.success) {
      container.innerHTML = '';
      if (data.podio.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-ranking-star"></i>
            <h3>Aún no hay puntos</h3>
            <p style="margin-top: 10px;">¡Comienza a llenar tu quiniela!</p>
          </div>
        `;
        return;
      }
      
      // Solo mostramos los primeros 15 lugares para el administrador
      const top10 = data.podio.slice(0, 15);
      
      top10.forEach((user, index) => {
        const topClass = index === 0 ? 'top-1' : index === 1 ? 'top-2' : index === 2 ? 'top-3' : '';
        const icon = index === 0 ? '<i class="fa-solid fa-crown"></i>' : (index + 1);
        
        container.innerHTML += `
          <div class="rank-item ${topClass}">
            <div class="rank-pos">${icon}</div>
            <div class="rank-user">${user.username}</div>
            <div class="rank-pts">${user.puntos} pts</div>
          </div>
        `;
      });
      
      container.innerHTML += `
        <div style="text-align:center; padding: 15px; font-size: 0.8rem; color: var(--text-muted);">
          <i class="fa-solid fa-lock"></i> Vista exclusiva de Administrador (Top 10)
        </div>
      `;
    }
  } catch (error) {
    container.innerHTML = '<div style="padding:15px; text-align:center; color:var(--danger);">Error cargando podio.</div>';
  }
}

function renderResultados() {
  const container = document.getElementById('resultados-list');
  container.innerHTML = '';
  
  const pastMatches = matchesData.filter(m => m.status === 'FINISHED' || m.status === 'IN_PLAY');
  
  // Aplicar filtros
  const filteredMatches = pastMatches.filter(match => {
    // 1. Filtro por Texto
    const local = match.equipoLocal.toLowerCase();
    const visitante = match.equipoVisitante.toLowerCase();
    if (searchQueryR && !local.includes(searchQueryR) && !visitante.includes(searchQueryR)) {
      return false;
    }
    
    // 2. Filtro por Etapa
    const stage = getMatchStage(match.partidoId);
    if (stageFilterR !== 'all' && stage !== stageFilterR) {
      return false;
    }
    
    // 3. Filtro por Grupo
    if (groupFilterR !== 'all') {
      if (stage !== 'grupos') return false;
      const matchGroup = teamToGroup[match.equipoLocal];
      if (matchGroup !== groupFilterR) {
        return false;
      }
    }
    
    return true;
  });
  
  if (filteredMatches.length === 0) {
    container.innerHTML = '<div class="m-card" style="text-align:center; color:var(--text-muted); padding: 30px;">No hay resultados que coincidan con la búsqueda.</div>';
    return;
  }
  
  // Ordenar por fecha
  filteredMatches.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return safeNewDate(a.date) - safeNewDate(b.date);
  });
  
  filteredMatches.forEach(match => {
    const statusText = match.status === 'IN_PLAY' ? 'En Vivo' : 'Finalizado';
    const statusClass = match.status === 'IN_PLAY' ? 'live' : 'finished';
    const sIcon = match.status === 'IN_PLAY' ? '<i class="fa-solid fa-circle-dot"></i>' : '<i class="fa-solid fa-check-double"></i>';
    
    // Calcular feedback del pronóstico del usuario
    let feedbackHtml = '';
    const prono = userPredictions.find(p => p.partidoId == match.partidoId);
    
    if (prono && match.status === 'FINISHED') {
      let pts = 0;
      const rh = parseInt(match.golesLocal), ra = parseInt(match.golesVisitante);
      const ph = parseInt(prono.golesLocal), pa = parseInt(prono.golesVisitante);
      
      let rGanador = rh > ra ? 1 : (rh < ra ? -1 : 0);
      let pGanador = ph > pa ? 1 : (ph < pa ? -1 : 0);
      
      if (ph === rh && pa === ra) pts = 2;
      else if (rGanador === pGanador) pts = 1;
      
      let msg = pts === 2 ? '¡Marcador Exacto! +2 Pts' : (pts === 1 ? '¡Acertaste al ganador! +1 Pt' : 'No acertaste. 0 Pts');
      feedbackHtml = `
        <div class="feedback-box pts-${pts}">
          Tu pronóstico: ${prono.golesLocal} - ${prono.golesVisitante} <br>
          <small>${msg}</small>
        </div>
      `;
    } else if (!prono && match.status === 'FINISHED') {
      feedbackHtml = `<div class="feedback-box pts-0">No enviaste pronóstico. 0 Pts</div>`;
    }

    const card = document.createElement('div');
    card.className = 'm-card match-card';
    card.innerHTML = `
      <div class="match-header">
        <span class="match-date">${formatDate(match.date)}</span>
        <span class="match-status ${statusClass}">${sIcon} ${statusText}</span>
      </div>
      <div class="teams-container" style="margin-top: 15px;">
        <div class="team">
          <span class="team-name">${match.equipoLocal}</span>
          <span class="real-score">${match.golesLocal !== '' ? match.golesLocal : '-'}</span>
        </div>
        <div class="vs">VS</div>
        <div class="team">
          <span class="team-name">${match.equipoVisitante}</span>
          <span class="real-score">${match.golesVisitante !== '' ? match.golesVisitante : '-'}</span>
        </div>
      </div>
      ${feedbackHtml}
    `;
    container.appendChild(card);
  });
}

// --- BINDING FILTROS DE BÚSQUEDA Y SELECCIÓN ---
document.getElementById('search-q').addEventListener('input', (e) => {
  searchQueryQ = e.target.value.toLowerCase().trim();
  renderQuiniela();
});

document.getElementById('filter-stage-q').addEventListener('change', (e) => {
  stageFilterQ = e.target.value;
  const grpWrapper = document.getElementById('group-filter-wrapper-q');
  if (stageFilterQ === 'all' || stageFilterQ === 'grupos') {
    grpWrapper.classList.remove('hide');
  } else {
    grpWrapper.classList.add('hide');
    document.getElementById('filter-group-q').value = 'all';
    groupFilterQ = 'all';
  }
  renderQuiniela();
});

document.getElementById('filter-group-q').addEventListener('change', (e) => {
  groupFilterQ = e.target.value;
  renderQuiniela();
});

document.getElementById('search-r').addEventListener('input', (e) => {
  searchQueryR = e.target.value.toLowerCase().trim();
  renderResultados();
});

document.getElementById('filter-stage-r').addEventListener('change', (e) => {
  stageFilterR = e.target.value;
  const grpWrapper = document.getElementById('group-filter-wrapper-r');
  if (stageFilterR === 'all' || stageFilterR === 'grupos') {
    grpWrapper.classList.remove('hide');
  } else {
    grpWrapper.classList.add('hide');
    document.getElementById('filter-group-r').value = 'all';
    groupFilterR = 'all';
  }
  renderResultados();
});

document.getElementById('filter-group-r').addEventListener('change', (e) => {
  groupFilterR = e.target.value;
  renderResultados();
});
