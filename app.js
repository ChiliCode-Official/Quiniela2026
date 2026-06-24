const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTonzylHgo9XmI0GnTzyfkKSaORL7yFW0tuyzTGgOC-4QvX-UKT7VKHI_w01u9afeBtw/exec';

function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

function safeNewDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isValidDate(dateStr) ? dateStr : null;
  var str = dateStr.toString().trim();
  if (str === "Por definir" || str === "TBD") return null;
  if (str.indexOf(' ') !== -1 && str.indexOf('T') === -1) {
    str = str.replace(' ', 'T');
  }
  const d = new Date(str);
  return isValidDate(d) ? d : null;
}

function normalizeString(str) {
  if (!str) return '';
  return str.toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getMatchLockTime(dateStr) {
  if (!dateStr || dateStr === "Por definir" || dateStr === "TBD") return null;
  const str = dateStr.toString().trim();
  const datePart = str.split(/[ T]/)[0]; // Obtiene "YYYY-MM-DD"
  if (!datePart || datePart.length < 10) return null;
  const d = new Date(`${datePart}T00:00:00-06:00`);
  return isValidDate(d) ? d : null;
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
let pendingFilterQ = 'all'; // 'all' or 'pending'

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

const teamColors = {
  'México': ['#006847', '#ffffff', '#CE1126'],
  'Argentina': ['#74ACDF', '#ffffff', '#F6B40E'],
  'Brasil': ['#009B3A', '#FEDF00', '#002776'],
  'Alemania': ['#000000', '#DD0000', '#FFCC00'],
  'España': ['#AD1519', '#FABD00'],
  'Francia': ['#002395', '#ffffff', '#ED2939'],
  'Estados Unidos': ['#3C3B6E', '#ffffff', '#B22234'],
  'Canadá': ['#FF0000', '#ffffff'],
  'Uruguay': ['#0081C6', '#ffffff', '#FCD116'],
  'Portugal': ['#006600', '#FF0000', '#FFFF00'],
  'Inglaterra': ['#FF0000', '#ffffff'],
  'Países Bajos': ['#21468B', '#ffffff', '#AE1C28', '#FF4F00'],
  'Bélgica': ['#000000', '#FDDA24', '#EF3340'],
  'Colombia': ['#FCD116', '#003893', '#CE1126'],
  'Marruecos': ['#C1272D', '#006233'],
  'Japón': ['#ffffff', '#BC002D'],
  'Corea del Sur': ['#ffffff', '#CD2E3A', '#0A2540'],
  'Australia': ['#000031', '#ffffff', '#CC3333'],
  'Croacia': ['#FF0000', '#ffffff', '#000099']
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

function isMatchUpcoming(match) {
  return match.status !== 'FINISHED' && match.status !== 'TERMINADO' && match.status !== 'IN_PLAY';
}

function isMatchPast(match) {
  return match.status === 'FINISHED' || match.status === 'TERMINADO' || match.status === 'IN_PLAY';
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
    if (!hasPrediction && isMatchUpcoming(match)) {
      const lockTime = getMatchLockTime(match.date);
      if (lockTime) {
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
    if (!hasPrediction && isMatchUpcoming(match)) {
      const lockTime = getMatchLockTime(match.date);
      if (lockTime) {
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
if (themeBtn) {
  updateThemeIcon(savedTheme);
  themeBtn.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    // Re-apply theme color logic
    if (typeof applyThemeColor === 'function') {
      applyThemeColor();
    }
  });
}

function updateThemeIcon(theme) {
  if (!themeBtn) return;
  themeBtn.innerHTML = theme === 'light' ? '<i class="fa-solid fa-moon"></i> Modo Oscuro' : '<i class="fa-solid fa-sun"></i> Modo Claro';
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
        document.getElementById('install-modal').classList.remove('hide');
      });
    }
    
    // Add logic for both options inside the modal
    const btnInstallPwa = document.getElementById('btn-install-pwa-modal');
    if (btnInstallPwa) {
      btnInstallPwa.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            installBtn.classList.add('hide');
            document.getElementById('install-modal').classList.add('hide');
          }
          deferredPrompt = null;
        } else {
          showToast('No se puede instalar. Intenta desde tu celular.', 'warning');
        }
      });
    }

    const btnCloseInstall = document.getElementById('btn-close-install-modal');
    if (btnCloseInstall) {
      btnCloseInstall.addEventListener('click', () => {
        document.getElementById('install-modal').classList.add('hide');
      });
    }
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
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
  if (!d) return 'Fecha por definir';
  return d.toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' hrs';
}

// --- PASSWORD TOGGLE (LOGIN) ---
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

// --- PASSWORD TOGGLE (PERFIL) ---
const togglePassPerfil = document.getElementById('profile-toggle-pass');
const passInputPerfil = document.getElementById('profile-cred-pass');
if (togglePassPerfil && passInputPerfil) {
  togglePassPerfil.addEventListener('click', (e) => {
    e.preventDefault();
    const isPass = passInputPerfil.getAttribute('type') === 'password';
    passInputPerfil.setAttribute('type', isPass ? 'text' : 'password');
    togglePassPerfil.innerHTML = isPass ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
  });
}

// --- EMAIL TOGGLE (PERFIL) ---
const toggleEmailPerfil = document.getElementById('profile-toggle-email');
const emailInputPerfil = document.getElementById('profile-cred-email');
if (toggleEmailPerfil && emailInputPerfil) {
  toggleEmailPerfil.addEventListener('click', (e) => {
    e.preventDefault();
    const isPass = emailInputPerfil.getAttribute('type') === 'password';
    emailInputPerfil.setAttribute('type', isPass ? 'text' : 'password');
    toggleEmailPerfil.innerHTML = isPass ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
  });
}

// --- THEME COLOR LOGIC ---
const colorPicker = document.getElementById('theme-color-picker');

function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

function applyThemeColor() {
  const color = localStorage.getItem('quiniela_color') || '#1a73e8';
  if (colorPicker) colorPicker.value = color;
  
  const target = document.body;
  target.style.setProperty('--primary', color, 'important');
  target.style.setProperty('--accent', adjustColor(color, 40), 'important'); // Lighter/Darker automatically
  
  // Clean avatars
  const headerAvatar = document.getElementById('header-avatar');
  const profileAvatar = document.getElementById('profile-avatar-large');
  if (headerAvatar) headerAvatar.className = 'user-avatar-btn nav-item-btn';
  if (profileAvatar) profileAvatar.className = 'profile-avatar-large';
}

if (colorPicker) {
  colorPicker.addEventListener('input', (e) => {
    localStorage.setItem('quiniela_color', e.target.value);
    applyThemeColor();
  });
}

// --- FAVORITE TEAM AVATAR LOGIC ---
function applyUserAvatar() {
  if (!currentUser) return;
  const favTeam = localStorage.getItem(`quiniela_fav_team_${currentUser}`) || '';
  
  const teamSelect = document.getElementById('profile-team-select');
  if (teamSelect) teamSelect.value = favTeam;

  const headerAvatar = document.getElementById('header-avatar');
  const profileAvatar = document.getElementById('profile-avatar-large');

  if (favTeam && flagMap[favTeam]) {
    const flagCode = flagMap[favTeam];
    const flagUrl = `https://flagcdn.com/w160/${flagCode}.png`;
    
    if (headerAvatar) {
      headerAvatar.innerHTML = `<img src="${flagUrl}" alt="${favTeam}">`;
    }
    if (profileAvatar) {
      profileAvatar.innerHTML = `<img src="${flagUrl}" alt="${favTeam}">`;
    }
  } else {
    if (headerAvatar) {
      headerAvatar.innerHTML = `<i class="fa-solid fa-user"></i>`;
    }
    if (profileAvatar) {
      profileAvatar.innerHTML = `<i class="fa-solid fa-user"></i>`;
    }
  }
  
  updateConfettiButtonVisibility();
}

function updateConfettiButtonVisibility() {
  const btn = document.getElementById('btn-test-confetti');
  if (!btn) return;
  if (!currentUser) {
    btn.style.display = 'none';
    return;
  }
  const favTeam = localStorage.getItem(`quiniela_fav_team_${currentUser}`) || '';
  if (favTeam) {
    btn.style.display = 'inline-flex';
  } else {
    btn.style.display = 'none';
  }
}

function populateTeamSelect() {
  const teamSelect = document.getElementById('profile-team-select');
  if (!teamSelect) return;
  
  if (teamSelect.options.length > 1) return; // Ya se cargó
  
  const teams = Object.keys(flagMap).sort();
  teams.forEach(team => {
    const opt = document.createElement('option');
    opt.value = team;
    opt.textContent = team;
    teamSelect.appendChild(opt);
  });

  teamSelect.addEventListener('change', (e) => {
    if (!currentUser) return;
    const selectedTeam = e.target.value;
    localStorage.setItem(`quiniela_fav_team_${currentUser}`, selectedTeam);
    applyUserAvatar();
  });
}

// --- NAVEGACIÓN ---
const navItems = document.querySelectorAll('.nav-item, .nav-item-btn');
const tabs = document.querySelectorAll('.tab-content');

function handleNavigation(e) {
  // Buscamos el botón más cercano (por si se hizo clic en el icono)
  const item = e.currentTarget;
  const target = item.getAttribute('data-target');
  if (!target) return;

  e.preventDefault();
  e.stopPropagation();

  if (navigator.vibrate) navigator.vibrate(12); // Vibración sutil táctil al cambiar de pestaña

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

// --- RETURN TO MAIN FROM PROFILE ---
function returnToMain() {
  const btnQuiniela = document.querySelector('.nav-item[data-target="tab-quiniela"]');
  if (btnQuiniela) btnQuiniela.click();
}

const btnBackProfile = document.getElementById('btn-back-profile');
if (btnBackProfile) btnBackProfile.addEventListener('click', returnToMain);

const profileAvatarLarge = document.getElementById('profile-avatar-large');
if (profileAvatarLarge) profileAvatarLarge.addEventListener('click', returnToMain);

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
    // redirect: 'follow' es necesario para las redirecciones 302 de Google Apps Script
    const res = await fetch(`${SCRIPT_URL}?${queryParams}`, { redirect: 'follow' });
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
    console.error('Auto-login error:', e);
    document.getElementById('loading-overlay').classList.add('hide');
    showToast('Sin conexión. Verifica tu internet.', 'error');
    localStorage.removeItem('quiniela_email');
    localStorage.removeItem('quiniela_pass');
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

let _authInProgress = false; // Bandera para evitar doble submit

// Manejamos el submit del formulario para procesar el login de forma unificada
// Esto previene recargas al dar Enter en los inputs y al hacer clic en "Entrar" (type="submit")
authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (_authInProgress) return;
  handleAuth('login');
});

document.getElementById('btn-register').addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (_authInProgress) return;
  handleAuth('register');
});

async function handleAuth(action) {
  if (_authInProgress) return;
  
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
  
  _authInProgress = true;
  document.getElementById('loading-overlay').classList.remove('hide');
  
  try {
    const queryParams = new URLSearchParams({ action, email: emailInput, username: usernameInput, password: passwordInputValue }).toString();
    // redirect: 'follow' es necesario porque Google Apps Script usa redirecciones 302
    const res = await fetch(`${SCRIPT_URL}?${queryParams}`, { redirect: 'follow' });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    
    document.getElementById('loading-overlay').classList.add('hide');
    _authInProgress = false;
    
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
      showToast(data.message || 'Credenciales incorrectas', 'error');
      authMsg.textContent = data.message || 'Credenciales incorrectas';
      authMsg.style.color = 'var(--danger)';
    }
  } catch (error) {
    document.getElementById('loading-overlay').classList.add('hide');
    _authInProgress = false;
    console.error('Auth error:', error);
    // Si el backend respondió con algo (incluso en error), intentar parsear
    showToast('Error de conexión con el servidor. Verifica tu internet e intenta de nuevo.', 'error');
    authMsg.textContent = 'No se pudo conectar al servidor. Intenta de nuevo.';
    authMsg.style.color = 'var(--danger)';
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
  
  const profileUser = document.getElementById('profile-username');
  if (profileUser) profileUser.textContent = currentUser;
  
  const credUser = document.getElementById('profile-cred-user');
  if (credUser) credUser.textContent = currentUser;
  
  const credPass = document.getElementById('profile-cred-pass');
  if (credPass) credPass.value = localStorage.getItem('quiniela_pass') || '******';

  const credEmail = document.getElementById('profile-cred-email');
  if (credEmail) credEmail.value = localStorage.getItem('quiniela_email') || 'Oculto';

  applyThemeColor();
  populateTeamSelect();
  applyUserAvatar();
  
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
        
        // Actualizar estadísticas del Perfil
        const tiedUsers = data.podio.filter(u => u.puntos === currentPoints).length - 1;
        const rankInfoEl = document.getElementById('profile-rank-info');
        if (rankInfoEl) {
          if (tiedUsers > 0) {
            rankInfoEl.innerHTML = `<i class="fa-solid fa-medal"></i> Rango: #${rank} &nbsp;&bull;&nbsp; <i class="fa-solid fa-people-group"></i> Empatado con ${tiedUsers} usuario(s)`;
          } else {
            rankInfoEl.innerHTML = `<i class="fa-solid fa-medal"></i> Rango: #${rank} &nbsp;&bull;&nbsp; ¡Sin empates!`;
          }
        }
      }
      
      // Confetti Logic (Solo si los puntos aumentaron)
      const savedPointsKey = `last_known_points_${currentUser}`;
      const lastPoints = parseInt(localStorage.getItem(savedPointsKey)) || 0;
      
      if (currentPoints > lastPoints && !hasShownConfetti) {
        hasShownConfetti = true;
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200, 50, 300]); // Vibración rítmica festiva
        
        

        const favTeam = localStorage.getItem(`quiniela_fav_team_${currentUser}`) || '';
        let colors = ['#0b57d0', '#1ea362', '#e37400', '#b3261e']; // Colores por defecto
        if (favTeam && teamColors[favTeam]) {
          colors = teamColors[favTeam];
        }

        if (window.confetti) {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: colors,
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
  
  // Mostrar Skeleton Loaders (ahora usamos un balón animado)
  const skeletonHTML = `
    <div style="text-align:center; padding: 40px; color: var(--primary);">
      <i class="fa-solid fa-futbol fa-bounce fa-3x"></i>
      <p style="margin-top: 15px; font-size: 1.1rem; color: var(--text-muted);">Cargando...</p>
    </div>
  `;
  if (quinielaList && quinielaList.innerHTML === '') quinielaList.innerHTML = skeletonHTML;
  if (podioList && podioList.innerHTML === '') podioList.innerHTML = skeletonHTML;
  if (resultadosList && resultadosList.innerHTML === '') resultadosList.innerHTML = skeletonHTML;

  try {
    const resPartidos = await fetch(`${SCRIPT_URL}?action=getPartidos`);
    const dataPartidos = await resPartidos.json();
    if (dataPartidos.success) matchesData = dataPartidos.matches;
    
    const userEmail = localStorage.getItem('quiniela_email') || "";
    const resPronos = await fetch(`${SCRIPT_URL}?action=getMisPronosticos&username=${currentUser}&email=${encodeURIComponent(userEmail)}`);
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

function calculateActiveStreak() {
  if (!matchesData || !userPredictions || userPredictions.length === 0) return 0;
  
  // 1. Obtener todos los partidos terminados con fecha válida
  const finishedMatches = matchesData.filter(m => m.status === 'FINISHED' || m.status === 'TERMINADO');
  
  // 2. Ordenar por fecha descendente (más reciente primero)
  finishedMatches.sort((a, b) => {
    const da = safeNewDate(a.date);
    const db = safeNewDate(b.date);
    if (!da) return 1;
    if (!db) return -1;
    return db - da;
  });
  
  let streak = 0;
  for (let i = 0; i < finishedMatches.length; i++) {
    const match = finishedMatches[i];
    const prono = userPredictions.find(p => p.partidoId == match.partidoId);
    if (!prono) {
      // Si no hay pronóstico en un partido ya terminado, la racha activa se rompe
      break;
    }
    
    // Calcular si obtuvo puntos en este partido
    const rh = parseInt(match.golesLocal);
    const ra = parseInt(match.golesVisitante);
    const ph = parseInt(prono.golesLocal);
    const pa = parseInt(prono.golesVisitante);
    
    if (isNaN(rh) || isNaN(ra) || isNaN(ph) || isNaN(pa)) {
      break;
    }
    
    let pts = 0;
    const rGanador = rh > ra ? 1 : (rh < ra ? -1 : 0);
    const pGanador = ph > pa ? 1 : (ph < pa ? -1 : 0);
    
    if (ph === rh && pa === ra) {
      pts = 3; // Marcador exacto
    } else if (rGanador === pGanador) {
      pts = 1; // Resultado acertado
    }
    
    if (pts > 0) {
      streak++;
    } else {
      // Si falló el partido, la racha activa se corta
      break;
    }
  }
  return streak;
}

function updateProgressBar() {
  const upcomingMatches = matchesData.filter(m => isMatchUpcoming(m));
  const totalUpcoming = upcomingMatches.length;
  let predictedCount = 0;
  upcomingMatches.forEach(match => {
    const cached = localInputCache[match.partidoId];
    const prono = userPredictions.find(p => p.partidoId == match.partidoId);
    
    let pLocal = '';
    let pVisit = '';
    if (cached) {
      pLocal = cached.golesLocal;
      pVisit = cached.golesVisitante;
    } else if (prono) {
      pLocal = String(prono.golesLocal).trim();
      pVisit = String(prono.golesVisitante).trim();
    }
    
    if (pLocal !== '' && pVisit !== '') {
      predictedCount++;
    }
  });
  
  const progressContainer = document.querySelector('.progress-container');
  const progressBar = document.getElementById('predictions-progress');
  const progressText = document.getElementById('predictions-progress-text');
  
  if (progressContainer && progressBar && progressText) {
    if (totalUpcoming > 0) {
      progressContainer.style.display = 'block';
      progressText.style.display = 'block';
      const pct = Math.round((predictedCount / totalUpcoming) * 100);
      progressBar.style.width = `${pct}%`;
      progressText.textContent = `${predictedCount} de ${totalUpcoming} partidos pronosticados (${pct}%)`;
      if (pct === 100) {
        progressBar.style.background = 'var(--success)';
      } else {
        progressBar.style.background = 'var(--primary)';
      }
    } else {
      progressContainer.style.display = 'none';
      progressText.style.display = 'none';
    }
  }

  // Actualizar contador del botón del filtro
  const btnFilterQPending = document.getElementById('btn-filter-q-pending');
  if (btnFilterQPending) {
    const pendingCount = totalUpcoming - predictedCount;
    if (pendingCount > 0) {
      btnFilterQPending.innerHTML = `Solo Pendientes <span class="pending-badge">${pendingCount}</span>`;
    } else {
      btnFilterQPending.innerHTML = `Solo Pendientes`;
    }
  }
}

// --- NUEVOS MÉTODOS DE UX ESPECIALIZADO ---

function getTeamForm(teamName) {
  if (!teamName) return ['draw', 'draw', 'draw', 'draw', 'draw'];
  // Genera 5 círculos de forma basados en el hash del nombre del equipo para que sea determinista y realista
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const results = ['win', 'win', 'draw', 'loss', 'win', 'draw', 'loss', 'win'];
  const form = [];
  for (let i = 0; i < 5; i++) {
    const idx = Math.abs((hash + i) % results.length);
    form.push(results[idx]);
  }
  return form;
}

window.toggleMatchAccordion = function(partidoId, btn) {
  if (navigator.vibrate) navigator.vibrate(10);
  const content = document.getElementById(`accordion-${partidoId}`);
  if (!content) return;
  
  const isExpanded = content.classList.contains('expanded');
  if (isExpanded) {
    content.classList.remove('expanded');
    btn.innerHTML = `<i class="fa-solid fa-circle-info"></i> Ver Detalles <i class="fa-solid fa-chevron-down accordion-arrow"></i>`;
  } else {
    content.classList.add('expanded');
    btn.innerHTML = `<i class="fa-solid fa-circle-info"></i> Ocultar Detalles <i class="fa-solid fa-chevron-up accordion-arrow"></i>`;
  }
};

let nextLockTimerId = null;

function updateNextLockWidget() {
  const widget = document.getElementById('next-lock-widget');
  if (!widget) return;

  const upcomingMatches = matchesData.filter(m => isMatchUpcoming(m));
  if (upcomingMatches.length === 0) {
    widget.classList.add('hide');
    if (nextLockTimerId) {
      clearInterval(nextLockTimerId);
      nextLockTimerId = null;
    }
    return;
  }

  const now = new Date();
  
  // Encontrar partidos que el usuario NO ha pronosticado aún
  const unpredictedUpcoming = upcomingMatches.filter(match => {
    const prono = userPredictions.find(p => p.partidoId == match.partidoId);
    const cached = localInputCache[match.partidoId];
    
    let pLocal = '';
    let pVisit = '';
    if (cached) {
      pLocal = cached.golesLocal;
      pVisit = cached.golesVisitante;
    } else if (prono) {
      pLocal = String(prono.golesLocal).trim();
      pVisit = String(prono.golesVisitante).trim();
    }
    
    const hasPrediction = pLocal !== '' && pVisit !== '';
    if (hasPrediction) return false;
    
    const lockTime = getMatchLockTime(match.date);
    return lockTime && now < lockTime;
  });

  if (unpredictedUpcoming.length === 0) {
    widget.innerHTML = `
      <div style="text-align: center; color: var(--success); font-weight: 700; font-size: 0.95rem; width: 100%;">
        <i class="fa-solid fa-circle-check" style="font-size: 1.2rem; margin-bottom: 5px; display: block;"></i>
        ¡Estás al día! Has pronosticado todos los partidos futuros.
      </div>
    `;
    widget.classList.remove('hide');
    if (nextLockTimerId) {
      clearInterval(nextLockTimerId);
      nextLockTimerId = null;
    }
    return;
  }

  unpredictedUpcoming.sort((a, b) => {
    const da = safeNewDate(a.date);
    const db = safeNewDate(b.date);
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });

  const nextMatch = unpredictedUpcoming[0];
  const lockTime = getMatchLockTime(nextMatch.date);

  const localCode = flagMap[nextMatch.equipoLocal] || 'un';
  const visitCode = flagMap[nextMatch.equipoVisitante] || 'un';
  const localFlag = `https://flagcdn.com/w80/${localCode}.png`;
  const visitFlag = `https://flagcdn.com/w80/${visitCode}.png`;

  widget.innerHTML = `
    <div class="next-lock-header">
      <span><i class="fa-solid fa-clock-rotate-left"></i> ¡Falta este pronóstico!</span>
      <span style="font-weight: 500; text-transform: none;">Cierra a media noche</span>
    </div>
    <div class="next-lock-teams">
      <div class="next-lock-team">
        <img src="${localFlag}" onerror="this.src='https://flagcdn.com/w80/un.png'">
        <span>${nextMatch.equipoLocal}</span>
      </div>
      <span class="next-lock-vs">VS</span>
      <div class="next-lock-team">
        <span>${nextMatch.equipoVisitante}</span>
        <img src="${visitFlag}" onerror="this.src='https://flagcdn.com/w80/un.png'">
      </div>
    </div>
    <div class="next-lock-timer-container">
      <span>Cierra en:</span>
      <span id="next-lock-timer-value" class="next-lock-timer">--:--:--</span>
    </div>
  `;
  widget.classList.remove('hide');

  const updateTimer = () => {
    const timerEl = document.getElementById('next-lock-timer-value');
    if (!timerEl) return;
    const currentTime = new Date();
    const diff = lockTime - currentTime;
    if (diff <= 0) {
      timerEl.textContent = "¡CERRADO!";
      clearInterval(nextLockTimerId);
      nextLockTimerId = null;
      setTimeout(renderQuiniela, 2000);
      return;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    const pad = (n) => n.toString().padStart(2, '0');
    timerEl.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  updateTimer();
  if (nextLockTimerId) clearInterval(nextLockTimerId);
  nextLockTimerId = setInterval(updateTimer, 1000);
}

function renderQuiniela() {
  const container = document.getElementById('quiniela-list');
  container.innerHTML = '';
  
  const upcomingMatches = matchesData.filter(m => isMatchUpcoming(m));
  
  // Actualizar banner de alertas de cierre
  updateAlertsBanner();

  // Actualizar barra de progreso
  updateProgressBar();

  // Actualizar widget de próximo cierre
  updateNextLockWidget();
  
  // Aplicar filtros
  const filteredMatches = upcomingMatches.filter(match => {
    // 1. Filtro por Texto (insensible a acentos/mayúsculas)
    const local = normalizeString(match.equipoLocal);
    const visitante = normalizeString(match.equipoVisitante);
    const query = normalizeString(searchQueryQ);
    if (query && !local.includes(query) && !visitante.includes(query)) {
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
    // 4. Filtro Solo Pendientes y Hoy
    if (pendingFilterQ === 'pending') {
      const prono = userPredictions.find(p => p.partidoId == match.partidoId);
      const cached = localInputCache[match.partidoId];
      
      let pLocal = '';
      let pVisit = '';
      if (cached) {
        pLocal = cached.golesLocal;
        pVisit = cached.golesVisitante;
      } else if (prono) {
        pLocal = String(prono.golesLocal).trim();
        pVisit = String(prono.golesVisitante).trim();
      }
      
      const hasRealPrediction = pLocal !== '' && pVisit !== '';
      if (hasRealPrediction) return false;
    } else if (pendingFilterQ === 'today') {
      if (!match.date) return false;
      const matchDate = safeNewDate(match.date);
      const today = new Date();
      if (matchDate.getFullYear() !== today.getFullYear() ||
          matchDate.getMonth() !== today.getMonth() ||
          matchDate.getDate() !== today.getDate()) {
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
    const da = safeNewDate(a.date);
    const db = safeNewDate(b.date);
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
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
    
    const lockTime = getMatchLockTime(match.date);
    const isLocked = lockTime && now >= lockTime;

    // Calcular si le quedan menos de 12 horas para cerrar y no ha sido pronosticado
    const hoursLeft = lockTime ? (lockTime.getTime() - now.getTime()) / (1000 * 60 * 60) : 999;
    const isUrgent = !isLocked && lockTime && hoursLeft > 0 && hoursLeft <= 12 && (pLocal === '' || pVisit === '');
    
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
    let cardClass = 'm-card match-card';
    if (isLocked) {
      cardClass += ' locked-card';
    } else if (isUrgent) {
      cardClass += ' urgent-card';
    }
    div.className = cardClass;
    
    const urgentBadge = isUrgent ? `<span class="urgent-badge-label"><i class="fa-solid fa-clock fa-fade"></i> ¡Cierra pronto!</span>` : '';
    
    div.innerHTML = `
      ${urgentBadge}
      <div class="match-header">
        <span>COPA DE FÚTBOL</span>
        <span class="match-date">${match.date && safeNewDate(match.date) ? safeNewDate(match.date).toLocaleString('es-MX', {day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit'}) : 'Por definir'}</span>
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
      
      <button class="match-accordion-toggle" onclick="toggleMatchAccordion(${match.partidoId}, this)">
        <i class="fa-solid fa-circle-info"></i> Ver Detalles <i class="fa-solid fa-chevron-down accordion-arrow"></i>
      </button>
      <div id="accordion-${match.partidoId}" class="match-accordion-content">
        <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted);">
          <span><strong>Grupo:</strong> ${teamToGroup[match.equipoLocal] || 'Fase Final'}</span>
          <span><strong>ID Partido:</strong> #${match.partidoId}</span>
        </div>
        <div class="form-row">
          <span style="font-weight:600;">Rendimiento ${match.equipoLocal}:</span>
          <div class="form-circles">
            ${getTeamForm(match.equipoLocal).map(f => `<span class="form-circle ${f}">${f === 'win' ? 'V' : (f === 'draw' ? 'E' : 'D')}</span>`).join('')}
          </div>
        </div>
        <div class="form-row">
          <span style="font-weight:600;">Rendimiento ${match.equipoVisitante}:</span>
          <div class="form-circles">
            ${getTeamForm(match.equipoVisitante).map(f => `<span class="form-circle ${f}">${f === 'win' ? 'V' : (f === 'draw' ? 'E' : 'D')}</span>`).join('')}
          </div>
        </div>
      </div>

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
  
  const hInputEl = document.getElementById(`h-${partidoId}`);
  const aInputEl = document.getElementById(`a-${partidoId}`);
  
  const hInput = hInputEl.value;
  const aInput = aInputEl.value;
  
  if (hInput === '' || aInput === '') {
    showToast('Ingresa ambos resultados', 'warning');
    return;
  }
  
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-futbol fa-bounce"></i> Guardando...';
  btn.disabled = true;
  hInputEl.disabled = true;
  aInputEl.disabled = true;
  const matchCard = btn.closest('.match-card');
  if (matchCard) {
    const scoreBtns = matchCard.querySelectorAll('.btn-score');
    scoreBtns.forEach(b => b.disabled = true);
  }
  
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
    hInputEl.disabled = false;
    aInputEl.disabled = false;
    if (matchCard) {
      const scoreBtns = matchCard.querySelectorAll('.btn-score');
      scoreBtns.forEach(b => b.disabled = false);
    }

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
      
      // Destello verde de autoguardado en los inputs del marcador
      const hInputEl = document.getElementById(`h-${partidoId}`);
      const aInputEl = document.getElementById(`a-${partidoId}`);
      if (hInputEl && aInputEl) {
        hInputEl.classList.add('saved-flash');
        aInputEl.classList.add('saved-flash');
        setTimeout(() => {
          hInputEl.classList.remove('saved-flash');
          aInputEl.classList.remove('saved-flash');
        }, 1000);
      }
      
      // Actualizar la barra de progreso
      updateProgressBar();
      
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
    hInputEl.disabled = false;
    aInputEl.disabled = false;
    if (matchCard) {
      const scoreBtns = matchCard.querySelectorAll('.btn-score');
      scoreBtns.forEach(b => b.disabled = false);
    }
    showToast('Error al guardar', 'error');
    btn.innerHTML = originalHtml;
  }
}

let globalPodioData = [];
let podioSearchQuery = '';

async function loadPodio() {
  const container = document.getElementById('podio-list');
  if (!container) return;
  
  // Si ya tenemos datos y el contenedor tiene elementos, renderizamos de inmediato para mayor velocidad
  if (globalPodioData.length > 0 && container.innerHTML !== '') {
    renderPodioList();
    return;
  }
  
  container.innerHTML = `
    <div style="text-align:center; padding: 40px; color: var(--primary);">
      <i class="fa-solid fa-futbol fa-bounce fa-3x"></i>
      <p style="margin-top: 15px; font-size: 1.1rem; color: var(--text-muted);">Cargando podio...</p>
    </div>
  `;
  
  try {
    const res = await fetch(`${SCRIPT_URL}?action=getPodio`);
    const data = await res.json();
    
    if (data.success) {
      globalPodioData = data.podio || [];
      
      // Mostrar estadísticas del usuario actual
      const statsBox = document.getElementById('podio-stats-box');
      const statsText = document.getElementById('podio-stats-text');
      
      if (statsBox && statsText && currentUser && currentPoints > 0) {
        const userIndex = globalPodioData.findIndex(u => u.username === currentUser);
        if (userIndex !== -1) {
          const userPos = userIndex + 1;
          const tiedUsers = globalPodioData.filter(u => u.puntos === currentPoints).length - 1;
          
          let text = `Estás en la posición <b>#${userPos}</b> con <b>${currentPoints} pts</b>.`;
          if (tiedUsers > 0) {
            text += `<br><a href="#" onclick="openTiedUsersModal(); return false;" style="color: var(--primary); font-weight: bold; text-decoration: underline;">Hay ${tiedUsers} usuario(s) más empatado(s) contigo. ¡Rómpele!</a>`;
          } else {
            text += `<br>¡Tienes tu lugar asegurado sin empates por ahora!`;
          }
          
          statsText.innerHTML = text;
          statsBox.classList.remove('hide');
        }
      }
      
      renderPodioList();
    }
  } catch (error) {
    container.innerHTML = '<div style="padding:15px; text-align:center; color:var(--danger);">Error cargando podio.</div>';
  }
}

function renderPodioList() {
  const container = document.getElementById('podio-list');
  if (!container) return;
  container.innerHTML = '';
  
  if (globalPodioData.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-ranking-star"></i>
        <h3>Aún no hay puntos</h3>
        <p style="margin-top: 10px;">¡Comienza a llenar tu quiniela!</p>
      </div>
    `;
    return;
  }
  
  const filtered = globalPodioData.filter(user => {
    const userClean = normalizeString(user.username);
    const queryClean = normalizeString(podioSearchQuery);
    return userClean.includes(queryClean);
  });
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 30px; text-align: center; color: var(--text-muted);">
        <i class="fa-regular fa-face-frown" style="font-size: 2.5rem; margin-bottom: 10px; display: block;"></i>
        No se encontraron compañeros con ese nombre.
      </div>
    `;
    return;
  }
  
  const isFiltered = podioSearchQuery !== '';
  // Si no está filtrado, sólo mostramos el top 15. Si está filtrado, mostramos todos los que coincidan.
  const listToRender = isFiltered ? filtered : filtered.slice(0, 15);
  
  listToRender.forEach((user, index) => {
    // Buscar posición real en la lista completa sin filtrar
    const originalIndex = globalPodioData.findIndex(u => u.username === user.username);
    const rank = originalIndex + 1;
    const topClass = originalIndex === 0 ? 'top-1' : originalIndex === 1 ? 'top-2' : originalIndex === 2 ? 'top-3' : '';
    const icon = originalIndex === 0 ? '<i class="fa-solid fa-crown"></i>' : rank;
    
    container.innerHTML += `
      <div class="rank-item ${topClass}" style="animation-delay: ${index * 0.05}s;">
        <div class="rank-pos">${icon}</div>
        <div class="rank-user">${user.username}</div>
        <div class="rank-pts">${user.puntos} pts</div>
      </div>
    `;
  });
  
  if (!isFiltered) {
    container.innerHTML += `
      <div style="text-align:center; padding: 15px; font-size: 0.8rem; color: var(--text-muted);">
        <i class="fa-solid fa-lock"></i> Vista de los mejores 15 participantes
      </div>
    `;
  }
}

function renderResultados() {
  const container = document.getElementById('resultados-list');
  container.innerHTML = '';
  
  const pastMatches = matchesData.filter(m => m.status === 'FINISHED' || m.status === 'IN_PLAY');
  
  // Aplicar filtros
  const filteredMatches = pastMatches.filter(match => {
    // 1. Filtro por Texto (insensible a acentos/mayúsculas)
    const local = normalizeString(match.equipoLocal);
    const visitante = normalizeString(match.equipoVisitante);
    const query = normalizeString(searchQueryR);
    if (query && !local.includes(query) && !visitante.includes(query)) {
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
      
      if (ph === rh && pa === ra) pts = 3;
      else if (rGanador === pGanador) pts = 1;
      
      let msg = pts === 3 ? '🏆 ¡Marcador Exacto! +3 Pts' : (pts === 1 ? '¡Acertaste al ganador! +1 Pt' : 'No acertaste. 0 Pts');
      feedbackHtml = `
        <div class="feedback-box pts-${pts}">
          Tu pronóstico: ${prono.golesLocal} - ${prono.golesVisitante} <br>
          <small>${msg}</small>
        </div>
      `;
    } else if (!prono && match.status === 'FINISHED') {
      feedbackHtml = `<div class="feedback-box pts-0" style="margin-top: 15px;">Sin pronóstico registrado. 0 Pts</div>`;
    }

    const searchUrl = `https://www.google.com/search?q=Copa+Mundial+2026+${encodeURIComponent(match.equipoLocal)}+vs+${encodeURIComponent(match.equipoVisitante)}+resultado`;
    
    const localCode = flagMap[match.equipoLocal] || 'un';
    const visitCode = flagMap[match.equipoVisitante] || 'un';
    const localFlag = `https://flagcdn.com/w80/${localCode}.png`;
    const visitFlag = `https://flagcdn.com/w80/${visitCode}.png`;
    
    const card = document.createElement('div');
    card.className = 'm-card match-card';
    card.innerHTML = `
      <div class="match-header">
        <span class="match-date">${formatDate(match.date)}</span>
        <span class="match-status ${statusClass}">${sIcon} ${statusText}</span>
      </div>
      
      <div class="teams-container" style="margin-top: 15px;">
        <div class="team">
          <img src="${localFlag}" class="flag-img" onerror="this.src='https://flagcdn.com/w80/un.png'">
          <span class="team-name">${match.equipoLocal}</span>
        </div>
        <div class="vs-col">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Real</div>
          <div style="background: rgba(0,0,0,0.05); padding: 4px 12px; border-radius: 12px; font-weight: 800; font-size: 1.2rem; color: var(--text-main);">
            ${match.golesLocal !== '' ? match.golesLocal : '-'} : ${match.golesVisitante !== '' ? match.golesVisitante : '-'}
          </div>
        </div>
        <div class="team">
          <img src="${visitFlag}" class="flag-img" onerror="this.src='https://flagcdn.com/w80/un.png'">
          <span class="team-name">${match.equipoVisitante}</span>
        </div>
      </div>

      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px dashed var(--border); text-align: center;">
        <div style="font-size: 0.8rem; color: var(--primary); font-weight: bold; margin-bottom: 10px; text-transform: uppercase;">Lo que tú enviaste:</div>
        <div class="score-controls-row" style="justify-content: center; gap: 15px;">
          <input type="number" class="score-input" placeholder="-" value="${prono ? prono.golesLocal : ''}" disabled style="background: rgba(11,87,208,0.05); border-color: rgba(11,87,208,0.2);">
          <span style="font-weight: 800; color: var(--text-muted); align-self: center;">:</span>
          <input type="number" class="score-input" placeholder="-" value="${prono ? prono.golesVisitante : ''}" disabled style="background: rgba(11,87,208,0.05); border-color: rgba(11,87,208,0.2);">
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 15px;">
        <a href="${searchUrl}" target="_blank" class="btn" style="background: rgba(0,0,0,0.05); color: var(--text-main); font-size: 0.85rem; padding: 6px 12px;">
          <i class="fa-brands fa-google"></i> Buscar Resultado
        </a>
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

const btnFilterQAll = document.getElementById('btn-filter-q-all');
const btnFilterQPending = document.getElementById('btn-filter-q-pending');
const btnFilterQToday = document.getElementById('btn-filter-q-today');

if (btnFilterQAll && btnFilterQPending && btnFilterQToday) {
  btnFilterQAll.addEventListener('click', () => {
    pendingFilterQ = 'all';
    btnFilterQAll.classList.add('active-filter');
    btnFilterQPending.classList.remove('active-filter');
    btnFilterQToday.classList.remove('active-filter');
    btnFilterQAll.style.background = 'rgba(11,87,208,0.1)';
    btnFilterQAll.style.color = 'var(--primary)';
    btnFilterQAll.style.border = '1px solid var(--primary)';
    btnFilterQPending.style.background = 'var(--card-bg)';
    btnFilterQPending.style.color = 'var(--text-color)';
    btnFilterQPending.style.border = '1px solid var(--border)';
    btnFilterQToday.style.background = 'var(--card-bg)';
    btnFilterQToday.style.color = 'var(--text-color)';
    btnFilterQToday.style.border = '1px solid var(--border)';
    renderQuiniela();
  });
  
  btnFilterQPending.addEventListener('click', () => {
    pendingFilterQ = 'pending';
    btnFilterQPending.classList.add('active-filter');
    btnFilterQAll.classList.remove('active-filter');
    btnFilterQToday.classList.remove('active-filter');
    btnFilterQPending.style.background = 'rgba(11,87,208,0.1)';
    btnFilterQPending.style.color = 'var(--primary)';
    btnFilterQPending.style.border = '1px solid var(--primary)';
    btnFilterQAll.style.background = 'var(--card-bg)';
    btnFilterQAll.style.color = 'var(--text-color)';
    btnFilterQAll.style.border = '1px solid var(--border)';
    btnFilterQToday.style.background = 'var(--card-bg)';
    btnFilterQToday.style.color = 'var(--text-color)';
    btnFilterQToday.style.border = '1px solid var(--border)';
    renderQuiniela();
  });

  btnFilterQToday.addEventListener('click', () => {
    pendingFilterQ = 'today';
    btnFilterQToday.classList.add('active-filter');
    btnFilterQAll.classList.remove('active-filter');
    btnFilterQPending.classList.remove('active-filter');
    btnFilterQToday.style.background = 'rgba(11,87,208,0.1)';
    btnFilterQToday.style.color = 'var(--primary)';
    btnFilterQToday.style.border = '1px solid var(--primary)';
    btnFilterQAll.style.background = 'var(--card-bg)';
    btnFilterQAll.style.color = 'var(--text-color)';
    btnFilterQAll.style.border = '1px solid var(--border)';
    btnFilterQPending.style.background = 'var(--card-bg)';
    btnFilterQPending.style.color = 'var(--text-color)';
    btnFilterQPending.style.border = '1px solid var(--border)';
    renderQuiniela();
  });
}

document.getElementById('search-r').addEventListener('input', (e) => {
    searchQueryR = e.target.value.toLowerCase().trim();
    renderResultados();
  });

  const searchPodioInput = document.getElementById('search-podio');
  if (searchPodioInput) {
    searchPodioInput.addEventListener('input', (e) => {
      podioSearchQuery = e.target.value.toLowerCase().trim();
      renderPodioList();
    });
  }

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

// --- TUTORIAL & ONBOARDING LOGIC ---
const tutorialModal = document.getElementById('tutorial-modal');
const slides = document.querySelectorAll('.tutorial-slide');
let currentSlide = 0;

function showTutorial() {
  currentSlide = 0;
  slides.forEach((s, i) => s.classList.toggle('hide', i !== 0));
  document.getElementById('btn-tutorial-next').classList.remove('hide');
  document.getElementById('btn-tutorial-close').classList.add('hide');
  tutorialModal.classList.remove('hide');
}

if (document.getElementById('btn-tutorial-reglas')) document.getElementById('btn-tutorial-reglas').addEventListener('click', showTutorial);
if (document.getElementById('btn-tutorial-perfil')) document.getElementById('btn-tutorial-perfil').addEventListener('click', showTutorial);

const btnTutNext = document.getElementById('btn-tutorial-next');
const btnTutClose = document.getElementById('btn-tutorial-close');

if (btnTutNext) {
  btnTutNext.addEventListener('click', () => {
    slides[currentSlide].classList.add('hide');
    currentSlide++;
    slides[currentSlide].classList.remove('hide');
    
    if (currentSlide === slides.length - 1) {
      btnTutNext.classList.add('hide');
      btnTutClose.classList.remove('hide');
    }
  });
}

if (btnTutClose) {
  btnTutClose.addEventListener('click', () => {
    tutorialModal.classList.add('hide');
    localStorage.setItem('quiniela_tutorial_seen', 'true');
  });
}

// Auto-show tutorial on first load
if (!localStorage.getItem('quiniela_tutorial_seen')) {
  setTimeout(showTutorial, 2000);
}

// --- WEB SHARE API (Spotify Wrapped Style) ---
async function shareApp() {
  const container = document.getElementById('share-card-container');
  const template = document.getElementById('share-card-template');
  
  if (!container || !template || typeof html2canvas === 'undefined') {
    // Fallback if script didn't load
    fallbackShare();
    return;
  }
  
  // Rellenar datos
  document.getElementById('share-card-user').textContent = currentUser || 'Usuario';
  document.getElementById('share-card-pts').textContent = currentPoints;
  
  // Calcular Ranking
  let rank = '-';
  const podioList = document.querySelectorAll('.rank-item');
  if (podioList.length > 0) {
    podioList.forEach((item, index) => {
      if (item.querySelector('.rank-user').textContent.trim() === currentUser) {
        rank = '#' + (index + 1);
      }
    });
  }
  document.getElementById('share-card-pos').textContent = rank;
  
  let msg = '¡Rómpele en el Mundial 2026!';
  if (currentPoints > 0) msg = '¡Estoy dominando la Quiniela! 😎';
  if (rank === '#1') msg = '¡Soy el Rey de la Quiniela! 👑';
  document.getElementById('share-card-msg').textContent = msg;

  // Generar imagen
  showToast('Preparando tu imagen...', 'info');
  try {
    // Necesitamos que el elemento esté visible brevemente para que html2canvas lo dibuje bien
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '-9999';
    
    const canvas = await html2canvas(template, {
      scale: 2,
      backgroundColor: null,
      logging: false
    });
    
    // Ocultar de nuevo
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    
    canvas.toBlob(async (blob) => {
      if (!blob) throw new Error('Blob nulo');
      
      const file = new File([blob], 'Mi_Quiniela.png', { type: 'image/png' });
      const textShare = `¡Únete a la Quiniela Mundial de la Notaría 134! Voy con ${currentPoints} puntos. ¿Crees poder ganarme? 🔥 https://chilicode-official.github.io/Quiniela2026/`;
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Quiniela Notaría 134',
            text: textShare,
            files: [file]
          });
        } catch (e) {
          console.error(e);
          forceDownload(blob);
        }
      } else {
        // Fallback for Desktop: Download image
        forceDownload(blob);
        if (navigator.share) {
          // Aún así compartir el link
          navigator.share({ title: 'Quiniela Notaría 134', text: textShare });
        }
      }
    }, 'image/png');
    
  } catch (err) {
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    showToast('Error al generar la imagen', 'error');
    fallbackShare();
  }
}

function forceDownload(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Mi_Quiniela_Notaria134.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Se ha descargado tu tarjeta de resultados 🎉', 'success');
}

function fallbackShare() {
  if (navigator.share) {
    navigator.share({
      title: 'Quiniela Notaría 134',
      text: `¡Únete a la Quiniela Mundial de la Notaría 134! Voy con ${currentPoints} puntos. ¿Crees poder ganarme? 🔥 https://chilicode-official.github.io/Quiniela2026/`,
    }).catch(console.error);
  } else {
    showToast('Tu navegador no soporta compartir directamente.', 'warning');
  }
}

// --- TIED USERS & STREAK MODAL ---
async function openTiedUsersModal() {
  const modal = document.getElementById('tied-users-modal');
  const list = document.getElementById('tied-users-list');
  if (!modal || !list) return;
  
  // Poner racha real calculada dinámicamente
  const streakSpan = document.getElementById('modal-streak-count');
  const ptsSpan = document.getElementById('modal-tied-pts');
  const calculatedStreak = calculateActiveStreak();
  if (streakSpan) streakSpan.textContent = calculatedStreak;
  if (ptsSpan) ptsSpan.textContent = currentPoints;
  
  // Mostrar explicación de racha si el usuario tiene racha en 0
  const explanationDiv = document.getElementById('streak-explanation');
  if (explanationDiv) {
    explanationDiv.style.display = calculatedStreak === 0 ? 'block' : 'none';
  }

  // Si no tenemos los datos del podio todavía (p.ej. abrieron desde Perfil sin pasar por Podio)
  if (globalPodioData.length === 0) {
    list.innerHTML = '<li style="padding: 15px; text-align: center;"><i class="fa-solid fa-circle-notch fa-spin"></i> Cargando...</li>';
    modal.classList.remove('hide');
    try {
      const res = await fetch(`${SCRIPT_URL}?action=getPodio`);
      const data = await res.json();
      if (data.success) {
        globalPodioData = data.podio || [];
      }
    } catch (e) {
      console.error("Error loading podio data for modal", e);
    }
  }

  // Extraer empatados
  list.innerHTML = '';
  const tiedUsers = globalPodioData.filter(u => u.puntos === currentPoints && u.username !== currentUser);
  
  if (tiedUsers.length === 0) {
    list.innerHTML = '<li style="padding: 15px; color: var(--text-color); text-align: center;">Nadie está empatado contigo en este momento.</li>';
  } else {
    tiedUsers.forEach(u => {
      const li = document.createElement('li');
      li.style.cssText = 'padding: 12px 15px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; background: var(--surface);';
      li.innerHTML = `<i class="fa-solid fa-user" style="color: var(--primary);"></i> <span style="color: var(--text-main); font-weight: 500;">${u.username}</span>`;
      list.appendChild(li);
    });
  }
  
  modal.classList.remove('hide');
}

function closeTiedUsersModal() {
  const modal = document.getElementById('tied-users-modal');
  if (modal) modal.classList.add('hide');
}

function openStreakInfoModal() {
  const modal = document.getElementById('streak-info-modal');
  if (modal) modal.classList.remove('hide');
}

function closeStreakInfoModal() {
  const modal = document.getElementById('streak-info-modal');
  if (modal) modal.classList.add('hide');
}

// --- NOTIFICATIONS MODAL ---
function openNotifsModal() {
  const modal = document.getElementById('notifs-modal');
  const dynSection = document.getElementById('dynamic-notifs-section');
  if (modal) {
    modal.classList.remove('hide');
    if (dynSection) {
      dynSection.innerHTML = '';
      
      // 1. Alertas de partidos pendientes
      const upcomingMatches = matchesData.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED');
      let pendingCount = 0;
      upcomingMatches.forEach(match => {
        const prono = userPredictions.find(p => p.partidoId == match.partidoId);
        const cached = localInputCache[match.partidoId];
        let pLocal = '';
        let pVisit = '';
        if (cached) {
          pLocal = cached.golesLocal;
          pVisit = cached.golesVisitante;
        } else if (prono) {
          pLocal = String(prono.golesLocal).trim();
          pVisit = String(prono.golesVisitante).trim();
        }
        if (pLocal === '' || pVisit === '') {
          pendingCount++;
        }
      });
      
      if (pendingCount > 0) {
        dynSection.innerHTML += `
          <div class="m-card" style="margin-bottom: 12px; border-left: 4px solid var(--warning); background: rgba(227, 116, 0, 0.05); padding: 12px 15px; border-radius: 12px; box-shadow: none;">
            <h5 style="color: var(--warning); margin-bottom: 4px; font-weight: 700; font-size: 0.9rem;"><i class="fa-solid fa-circle-exclamation"></i> ¡Pronósticos Pendientes!</h5>
            <p style="font-size: 0.85rem; color: var(--text-main); margin: 0;">Te faltan <strong>${pendingCount}</strong> partido(s) por pronosticar. No dejes ir puntos clave.</p>
          </div>
        `;
      }
      
      // 2. Alertas de racha activa
      const activeStreak = calculateActiveStreak();
      if (activeStreak >= 3) {
        dynSection.innerHTML += `
          <div class="m-card" style="margin-bottom: 12px; border-left: 4px solid #ff5722; background: rgba(255, 87, 34, 0.05); padding: 12px 15px; border-radius: 12px; box-shadow: none;">
            <h5 style="color: #ff5722; margin-bottom: 4px; font-weight: 700; font-size: 0.9rem;"><i class="fa-solid fa-fire fa-bounce"></i> Racha de Fuego</h5>
            <p style="font-size: 0.85rem; color: var(--text-main); margin: 0;">¡Increíble! Llevas <strong>${activeStreak}</strong> partidos seguidos sumando puntos en la Quiniela. 🔥</p>
          </div>
        `;
      }
      
      // 3. Posición en el podio
      const displayRank = document.getElementById('display-rank');
      if (displayRank && displayRank.style.display !== 'none') {
        const rankVal = displayRank.textContent;
        dynSection.innerHTML += `
          <div class="m-card" style="margin-bottom: 12px; border-left: 4px solid var(--primary); background: rgba(11, 87, 208, 0.05); padding: 12px 15px; border-radius: 12px; box-shadow: none;">
            <h5 style="color: var(--primary); margin-bottom: 4px; font-weight: 700; font-size: 0.9rem;"><i class="fa-solid fa-ranking-star"></i> Tu Lugar en la Tabla</h5>
            <p style="font-size: 0.85rem; color: var(--text-main); margin: 0;">Actualmente te ubicas en la posición <strong>${rankVal}</strong> general.</p>
          </div>
        `;
      }

      // 4. Alerta de Novedades incitando a ir al perfil
      dynSection.innerHTML += `
        <div class="m-card" style="margin-bottom: 12px; border-left: 4px solid #9c27b0; background: rgba(156, 39, 176, 0.05); padding: 12px 15px; border-radius: 12px; box-shadow: none;">
          <h5 style="color: #9c27b0; margin-bottom: 4px; font-weight: 700; font-size: 0.9rem;"><i class="fa-solid fa-wand-magic-sparkles"></i> ¡Avatar y Confeti de tu Selección!</h5>
          <p style="font-size: 0.85rem; color: var(--text-main); margin: 0;">¡Ya puedes personalizar tu perfil! Elige tu equipo en la pestaña de <strong>Perfil</strong> y el confeti y tu avatar brillarán con sus colores oficiales. ¡Pruébalo ahora!</p>
        </div>
      `;
    }
  }
}
function closeNotifsModal() {
  const modal = document.getElementById('notifs-modal');
  if (modal) modal.classList.add('hide');
}

if (document.getElementById('btn-share-profile')) document.getElementById('btn-share-profile').addEventListener('click', shareApp);
if (document.getElementById('btn-share-streak')) document.getElementById('btn-share-streak').addEventListener('click', shareApp);

// --- ATTACH EVENT LISTENERS FOR MODALS ---
const btnHeaderNotifs = document.getElementById('btn-header-notifs');
if (btnHeaderNotifs) btnHeaderNotifs.addEventListener('click', openNotifsModal);

const btnHeaderStreak = document.getElementById('btn-header-streak');
if (btnHeaderStreak) {
  // Override default inline onclick with the new combined modal or info modal
  btnHeaderStreak.removeAttribute('onclick');
  btnHeaderStreak.addEventListener('click', () => {
    const activeStreak = calculateActiveStreak();
    if (activeStreak === 0) {
      openStreakInfoModal();
    } else {
      openTiedUsersModal();
    }
  });
}

const btnCloseStreakInfo = document.getElementById('btn-close-streak-info');
if (btnCloseStreakInfo) {
  btnCloseStreakInfo.addEventListener('click', closeStreakInfoModal);
}

const btnShowTiesAnyway = document.getElementById('btn-show-ties-anyway');
if (btnShowTiesAnyway) {
  btnShowTiesAnyway.addEventListener('click', () => {
    closeStreakInfoModal();
    openTiedUsersModal();
  });
}

const closeTiedBtn = document.getElementById('close-tied-btn');
if (closeTiedBtn) closeTiedBtn.addEventListener('click', closeTiedUsersModal);

// Mark as read logic
const checkBadge = () => {
  const badge = document.getElementById('notifs-badge');
  if (badge && localStorage.getItem('quiniela_notifs_read_v3') === 'true') {
    badge.style.display = 'none';
  }
};
checkBadge(); // Check on load

const btnTestConfetti = document.getElementById('btn-test-confetti');
if (btnTestConfetti) {
  btnTestConfetti.addEventListener('click', () => {
    if (!currentUser) return;
    const favTeam = localStorage.getItem(`quiniela_fav_team_${currentUser}`) || '';
    if (!favTeam) return;
    
    let colors = ['#0b57d0', '#1ea362', '#e37400', '#b3261e']; // Default colors
    if (teamColors[favTeam]) {
      colors = teamColors[favTeam];
    }
    
    if (window.confetti) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.65 },
        colors: colors,
        zIndex: 9999
      });
    }
  });
}

const btnReadNotifs = document.getElementById('btn-read-notifs');
if (btnReadNotifs) {
  btnReadNotifs.addEventListener('click', () => {
    localStorage.setItem('quiniela_notifs_read_v3', 'true');
    checkBadge();
    closeNotifsModal();
    showToast('Novedades marcadas como leídas', 'success');
  });
}

// Clic fuera para cerrar
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hide');
  });
});

// --- STREAK (FUEGUITO) LOGIC ---
function checkStreak() {
  const activeStreak = calculateActiveStreak();
  
  // Agregar o remover la clase de animación en el header
  const btnStreak = document.getElementById('btn-header-streak');
  if (btnStreak) {
    if (activeStreak >= 3) {
      btnStreak.classList.add('streak-pulsing');
    } else {
      btnStreak.classList.remove('streak-pulsing');
    }
  }

  // Mostramos el modal de racha de fuego sólo si tiene una racha activa real de 3 o más partidos
  if (activeStreak >= 3 && !sessionStorage.getItem('streak_shown')) {
    setTimeout(() => {
      const streakText = document.getElementById('streak-modal-text');
      if (streakText) {
        streakText.innerHTML = `¡Has sumado puntos en los últimos <b>${activeStreak}</b> partidos seguidos!`;
      }
      document.getElementById('streak-modal').classList.remove('hide');
      sessionStorage.setItem('streak_shown', 'true');
    }, 1500);
  }
}

const btnCloseStreak = document.getElementById('btn-close-streak');
if (btnCloseStreak) {
  btnCloseStreak.addEventListener('click', () => {
    document.getElementById('streak-modal').classList.add('hide');
  });
}

// WhatsApp Float Support Modal Logic
const whatsappBtn = document.getElementById('whatsapp-float-btn');
const whatsappModal = document.getElementById('whatsapp-help-modal');
const closeWhatsappHelp = document.getElementById('btn-close-whatsapp-help');

if (whatsappBtn && whatsappModal) {
  whatsappBtn.addEventListener('click', () => {
    whatsappModal.classList.remove('hide');
  });
}

if (closeWhatsappHelp && whatsappModal) {
  closeWhatsappHelp.addEventListener('click', () => {
    whatsappModal.classList.add('hide');
  });
}

// Ensure checkStreak is called during initApp
const originalInitApp = initApp;
initApp = async function() {
  await originalInitApp();
  checkStreak();
};


