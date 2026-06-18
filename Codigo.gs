function safeNewDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  var str = dateStr.toString().trim();
  if (str.indexOf(' ') !== -1 && str.indexOf('T') === -1) {
    str = str.replace(' ', 'T');
  }
  return new Date(str);
}

function getApiKey() {
  return PropertiesService.getScriptProperties().getProperty('API_KEY_FOOTBALL') || "";
}

function configurarApiKey() {
  PropertiesService.getScriptProperties().setProperty('API_KEY_FOOTBALL', 'b49f90c2f278946fa93176ae1d283ffd');
}

function doGet(e) {
  // Ejecutar migración de pronósticos de un solo uso si es necesario
  try {
    migrarPronosticos();
  } catch (err) {
    Logger.log("Error en migración: " + err.toString());
  }

  const action = e.parameter.action;
  
  if (action === 'register') {
    const sheetUsuarios = SpreadsheetApp.getActive().getSheetByName('Usuarios');
    const users = sheetUsuarios.getDataRange().getValues();
    const email = (e.parameter.email || "").trim().toLowerCase();
    const username = (e.parameter.username || "").trim();
    const password = (e.parameter.password || "").trim();
    
    if (!email || !username || !password) {
      return jsonResponse({ success: false, message: 'Faltan campos obligatorios' });
    }
    
    // Verificar si el correo o usuario ya existe de forma insensible a mayúsculas
    const exists = users.some((row, i) => i > 0 && (
      row[0].toString().toLowerCase() === email || 
      row[1].toString().toLowerCase() === username.toLowerCase()
    ));
    
    if (exists) {
      return jsonResponse({ success: false, message: 'El correo o usuario ya existe' });
    }
    
    sheetUsuarios.appendRow([email, username, password, 0]);
    return jsonResponse({ success: true, message: 'Registrado con éxito' });
  }
  
  if (action === 'login') {
    const sheetUsuarios = SpreadsheetApp.getActive().getSheetByName('Usuarios');
    const users = sheetUsuarios.getDataRange().getValues();
    const email = (e.parameter.email || "").trim().toLowerCase();
    const password = (e.parameter.password || "").trim();
    
    // Búsqueda insensible a mayúsculas en el email, exacta en password
    const user = users.find((row, i) => i > 0 && 
      row[0].toString().toLowerCase() === email && 
      row[2].toString() === password
    );
    
    if (user) {
      return jsonResponse({ success: true, username: user[1], puntos: parseInt(user[3]) || 0 });
    }
    return jsonResponse({ success: false, message: 'Credenciales inválidas' });
  }
  
  if (action === 'predict') {
    const sheetResultados = SpreadsheetApp.getActive().getSheetByName('ResultadosReales');
    const sheetPronosticos = SpreadsheetApp.getActive().getSheetByName('Pronosticos');
    
    const partidoId = e.parameter.partidoId;
    const username = (e.parameter.username || "").trim();
    const usernameLower = username.toLowerCase();
    const golesLocal = e.parameter.golesLocal;
    const golesVisitante = e.parameter.golesVisitante;
    
    const partidoData = sheetResultados.getDataRange().getValues().find(row => row[0] == partidoId);
    
    // Verificación de límite de 24 horas antes del partido
    if (partidoData) {
      const status = partidoData[5];
      const matchDateStr = partidoData[7]; // Columna H: Fecha
      if (matchDateStr) {
        const matchDate = safeNewDate(matchDateStr);
        const now = new Date();
        const lockTime = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate(), 0, 0, 0);
        
        if (status === 'FINISHED' || status === 'IN_PLAY' || now >= lockTime) {
           return jsonResponse({ success: false, message: 'El tiempo límite para enviar este pronóstico ha expirado (Cierra a media noche)' });
        }
      }
    }
    
    const pronosData = sheetPronosticos.getDataRange().getValues();
    let updated = false;
    for (let i = 1; i < pronosData.length; i++) {
      if (pronosData[i][0].toString().trim().toLowerCase() === usernameLower && pronosData[i][1] == partidoId) {
        sheetPronosticos.getRange(i + 1, 3).setValue(golesLocal);
        sheetPronosticos.getRange(i + 1, 4).setValue(golesVisitante);
        updated = true; break;
      }
    }
    if (!updated) {
      sheetPronosticos.appendRow([username, partidoId, golesLocal, golesVisitante]);
    }
    return jsonResponse({ success: true, message: 'Pronóstico guardado' });
  }
  
  if (action === 'getPartidos') {
    const data = SpreadsheetApp.getActive().getSheetByName('ResultadosReales').getDataRange().getValues();
    const matches = data.slice(1).map(row => ({
      partidoId: row[0], equipoLocal: row[1], equipoVisitante: row[2], 
      golesLocal: row[3], golesVisitante: row[4], status: row[5], date: row[7]
    }));
    return jsonResponse({ success: true, matches });
  }
  
  if (action === 'getPodio') {
    const sheetUsuarios = SpreadsheetApp.getActive().getSheetByName('Usuarios');
    const data = sheetUsuarios.getDataRange().getValues();
    
    // Mapeo seguro: sólo devolvemos username (columna 1) y puntos (columna 3) para evitar leaks
    const podio = data.slice(1)
      .filter(row => row[1]) // Asegurar que tenga nombre de usuario
      .map(row => ({
        username: row[1].toString(),
        puntos: parseInt(row[3]) || 0
      }))
      .sort((a, b) => b.puntos - a.puntos);
      
    return jsonResponse({ success: true, podio });
  }

  if (action === 'getMisPronosticos') {
    const data = SpreadsheetApp.getActive().getSheetByName('Pronosticos').getDataRange().getValues();
    const reqUser = (e.parameter.username || "").trim().toLowerCase();
    const reqEmail = (e.parameter.email || "").trim().toLowerCase();
    const pronosticos = data.slice(1)
                            .filter(row => {
                              const r0 = row[0].toString().trim().toLowerCase();
                              return r0 === reqUser || (reqEmail !== "" && r0 === reqEmail);
                            })
                            .map(row => ({ partidoId: row[1], golesLocal: row[2], golesVisitante: row[3] }));
    return jsonResponse({ success: true, pronosticos });
  }
  return jsonResponse({ success: false, message: 'Ruta no encontrada' });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================= AUTOMATIZACIÓN ZERO-TOUCH =================
function normalizeName(name) {
  if (!name) return "";
  let n = name.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const translations = {
    "inglaterra": "england", "paises bajos": "netherlands", "holanda": "netherlands",
    "estados unidos": "usa", "gales": "wales", "polonia": "poland", "francia": "france",
    "dinamarca": "denmark", "tunez": "tunisia", "espana": "spain", "alemania": "germany",
    "japon": "japan", "belgica": "belgium", "canada": "canada", "marruecos": "morocco",
    "croacia": "croatia", "brasil": "brazil", "suiza": "switzerland", "camerun": "cameroon",
    "corea del sur": "south korea", "arabia saudita": "saudi arabia", "mexico": "mexico",
    "sudafrica": "south africa", "republica checa": "czech republic", "bosnia y herzegovina": "bosnia & herzegovina",
    "catar": "qatar", "haiti": "haiti", "escocia": "scotland", "australia": "australia",
    "turquia": "turkey", "costa de marfil": "ivory coast", "ecuador": "ecuador", "curazao": "curacao",
    "suecia": "sweden", "uruguay": "uruguay", "cabo verde": "cape verde", "iran": "iran",
    "nueva zelanda": "new zealand", "egipto": "egypt", "senegal": "senegal", "irak": "iraq",
    "noruega": "norway", "argentina": "argentina", "argelia": "algeria", "austria": "austria",
    "jordania": "jordan", "portugal": "portugal", "rd congo": "dr congo", "ghana": "ghana",
    "panama": "panama", "uzbekistan": "uzbekistan", "colombia": "colombia"
  };
  return translations[n] || n;
}

function fetchResultadosMundial() {
  const url = 'https://v3.football.api-sports.io/fixtures?league=1&season=2026';
  const apiKey = getApiKey();
  try {
    const res = UrlFetchApp.fetch(url, { headers: { 'x-apisports-key': apiKey }, muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return;
    
    const data = JSON.parse(res.getContentText());
    if (!data.response) return;
    const apiMatches = data.response;
    
    const sheetResultados = SpreadsheetApp.getActive().getSheetByName('ResultadosReales');
    const resData = sheetResultados.getDataRange().getValues();
    
    let needRecalc = false;
    for (let i = 1; i < resData.length; i++) {
      const matchId = resData[i][0];
      const sheetHome = normalizeName(resData[i][1]);
      const sheetAway = normalizeName(resData[i][2]);
      
      // Buscar coincidencia exacta
      let apiMatch = apiMatches.find(m => 
        normalizeName(m.teams.home.name) === sheetHome && 
        normalizeName(m.teams.away.name) === sheetAway
      );
      
      // Fallback: búsqueda difusa/parcial si no se encuentra exacta
      if (!apiMatch) {
        apiMatch = apiMatches.find(m => {
          const apiHome = normalizeName(m.teams.home.name);
          const apiAway = normalizeName(m.teams.away.name);
          return (apiHome.includes(sheetHome) || sheetHome.includes(apiHome)) &&
                 (apiAway.includes(sheetAway) || sheetAway.includes(apiAway));
        });
      }
      
      if (apiMatch) {
        const statusShort = apiMatch.fixture.status.short;
        let status = 'SCHEDULED';
        if (['1H', 'HT', '2H', 'ET', 'P', 'LIVE'].includes(statusShort)) status = 'IN_PLAY';
        if (['FT', 'AET', 'PEN'].includes(statusShort)) status = 'FINISHED';
        if (['PST', 'CANC', 'ABD'].includes(statusShort)) status = 'POSTPONED';
        
        const hScore = apiMatch.goals.home !== null ? apiMatch.goals.home : "";
        const aScore = apiMatch.goals.away !== null ? apiMatch.goals.away : "";
        const matchDate = apiMatch.fixture.date;
        
        sheetResultados.getRange(i + 1, 4).setValue(hScore);
        sheetResultados.getRange(i + 1, 5).setValue(aScore);
        sheetResultados.getRange(i + 1, 6).setValue(status);
        sheetResultados.getRange(i + 1, 8).setValue(matchDate);
        
        if (status === 'FINISHED' && resData[i][6] !== 'SI') {
          sheetResultados.getRange(i + 1, 7).setValue('SI');
          needRecalc = true;
        }
      }
    }
    if (needRecalc) {
      recalcularTodosLosPuntos();
    }
  } catch (error) {}
}

function recalcularTodosLosPuntos() {
  const ss = SpreadsheetApp.getActive();
  const sheetResultados = ss.getSheetByName('ResultadosReales');
  const sheetPronosticos = ss.getSheetByName('Pronosticos');
  const sheetUsuarios = ss.getSheetByName('Usuarios');
  
  // --- RESPALDO AUTOMÁTICO DE SEGURIDAD ---
  // Antes de tocar cualquier punto, respaldamos en una ÚNICA hoja para evitar llenar la cuota de Google
  const backupName = 'Usuarios_Backup';
  let backupSheet = ss.getSheetByName(backupName);
  if (!backupSheet) {
    backupSheet = ss.insertSheet(backupName);
  } else {
    backupSheet.clear();
  }
  const dataBackup = sheetUsuarios.getDataRange().getValues();
  if (dataBackup.length > 0) {
    backupSheet.getRange(1, 1, dataBackup.length, dataBackup[0].length).setValues(dataBackup);
  }
  // ----------------------------------------

  
  // 1. Obtener todos los resultados reales terminados
  const resData = sheetResultados.getDataRange().getValues();
  const resultadosTerminados = {};
  for (let i = 1; i < resData.length; i++) {
    const matchId = resData[i][0];
    const hScore = parseInt(resData[i][3]);
    const aScore = parseInt(resData[i][4]);
    const status = resData[i][5];
    
    if ((status === 'FINISHED' || status === 'TERMINADO') && !isNaN(hScore) && !isNaN(aScore)) {
      resultadosTerminados[matchId] = {
        hScore: hScore,
        aScore: aScore,
        ganadorReal: hScore > aScore ? 1 : (hScore < aScore ? -1 : 0)
      };
      // Asegurar que quede marcado como SI procesado
      sheetResultados.getRange(i + 1, 7).setValue('SI');
    }
  }
  
  // 2. Calcular puntos totales por usuario basándonos en todos los pronósticos y todos los partidos
  const pronosData = sheetPronosticos.getDataRange().getValues();
  const userPoints = {};
  
  for (let i = 1; i < pronosData.length; i++) {
    const username = (pronosData[i][0] || "").toString().trim().toLowerCase();
    const matchId = pronosData[i][1];
    const pHome = parseInt(pronosData[i][2]);
    const pAway = parseInt(pronosData[i][3]);
    
    if (!userPoints[username]) {
      userPoints[username] = 0;
    }
    
    if (resultadosTerminados[matchId] && !isNaN(pHome) && !isNaN(pAway)) {
      const real = resultadosTerminados[matchId];
      let pts = 0;
      
      if (pHome === real.hScore && pAway === real.aScore) {
        pts = 3; // Marcador exacto
      } else {
        const ganadorProno = pHome > pAway ? 1 : (pHome < pAway ? -1 : 0);
        if (ganadorProno === real.ganadorReal) {
          pts = 1; // Ganador/Empate acertado
        }
      }
      userPoints[username] += pts;
    }
  }
  
  // 3. Sobrescribir los puntos finales a los usuarios
  const usersData = sheetUsuarios.getDataRange().getValues();
  for (let i = 1; i < usersData.length; i++) {
    const uNameB = (usersData[i][1] || "").toString().trim().toLowerCase();
    const uNameA = (usersData[i][0] || "").toString().trim().toLowerCase();
    
    const ptsB = userPoints[uNameB] || 0;
    const ptsA = (uNameA && uNameA !== uNameB) ? (userPoints[uNameA] || 0) : 0;
    
    const finalPts = ptsB + ptsA;
    sheetUsuarios.getRange(i + 1, 4).setValue(finalPts);
  }
}

function instalarAutomatizacion() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("fetchResultadosMundial").timeBased().everyHours(2).create();
  fetchResultadosMundial();
}

function migrarPronosticos() {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty('MIGRATION_DONE') === 'true') {
    return; // Ya se migró
  }
  
  const ss = SpreadsheetApp.getActive();
  const sheetPronos = ss.getSheetByName('Pronosticos');
  if (!sheetPronos) return;
  
  const range = sheetPronos.getDataRange();
  const data = range.getValues();
  if (data.length <= 1) {
    properties.setProperty('MIGRATION_DONE', 'true');
    return; // No hay pronósticos para migrar
  }
  
  // Tabla de mapeo de ID viejo (1-16) al nuevo ID oficial (1-104)
  const idMap = {
    "1": 1,   // México vs Sudáfrica
    "2": 2,   // Corea del Sur vs República Checa
    "3": 3,   // Canadá vs Bosnia y Herzegovina
    "4": 4,   // Estados Unidos vs Paraguay
    "5": 8,   // Catar vs Suiza (Era 5, ahora es 8)
    "6": 7,   // Brasil vs Marruecos (Era 6, ahora es 7)
    "7": 5,   // Haití vs Escocia (Era 7, ahora es 5)
    "8": 6,   // Australia vs Turquía (Era 8, ahora es 6)
    "9": 10,  // Alemania vs Curazao (Era 9, ahora es 10)
    "10": 11, // Países Bajos vs Japón (Era 10, ahora es 11)
    "11": 9,  // Costa de Marfil vs Ecuador (Era 11, ahora es 9)
    "12": 12, // Suecia vs Túnez (Era 12, ahora es 12)
    "13": 14, // España vs Cabo Verde (Era 13, ahora es 14)
    "14": 16, // Bélgica vs Egipto (Era 14, ahora es 16)
    "15": 13, // Arabia Saudita vs Uruguay (Era 15, ahora es 13)
    "16": 15  // Irán vs Nueva Zelanda (Era 16, ahora es 15)
  };
  
  let updatedCount = 0;
  for (let i = 1; i < data.length; i++) {
    const oldId = data[i][1].toString();
    if (idMap[oldId]) {
      sheetPronos.getRange(i + 1, 2).setValue(idMap[oldId]);
      updatedCount++;
    }
  }
  
  Logger.log('Migración de pronósticos finalizada: ' + updatedCount + ' registros migrados.');
  properties.setProperty('MIGRATION_DONE', 'true');
}

function cargarPartidosOficiales() {
  const matches = [
    { partidoId: 1, equipoLocal: 'México', equipoVisitante: 'Sudáfrica', date: '2026-06-11 13:00:00-06:00' },
    { partidoId: 2, equipoLocal: 'Corea del Sur', equipoVisitante: 'República Checa', date: '2026-06-11 20:00:00-06:00' },
    { partidoId: 3, equipoLocal: 'Canadá', equipoVisitante: 'Bosnia y Herzegovina', date: '2026-06-12 13:00:00-06:00' },
    { partidoId: 4, equipoLocal: 'Estados Unidos', equipoVisitante: 'Paraguay', date: '2026-06-12 19:00:00-06:00' },
    { partidoId: 5, equipoLocal: 'Haití', equipoVisitante: 'Escocia', date: '2026-06-13 19:00:00-06:00' },
    { partidoId: 6, equipoLocal: 'Australia', equipoVisitante: 'Turquía', date: '2026-06-13 22:00:00-06:00' },
    { partidoId: 7, equipoLocal: 'Brasil', equipoVisitante: 'Marruecos', date: '2026-06-13 16:00:00-06:00' },
    { partidoId: 8, equipoLocal: 'Catar', equipoVisitante: 'Suiza', date: '2026-06-13 13:00:00-06:00' },
    { partidoId: 9, equipoLocal: 'Costa de Marfil', equipoVisitante: 'Ecuador', date: '2026-06-14 17:00:00-06:00' },
    { partidoId: 10, equipoLocal: 'Alemania', equipoVisitante: 'Curazao', date: '2026-06-14 11:00:00-06:00' },
    { partidoId: 11, equipoLocal: 'Países Bajos', equipoVisitante: 'Japón', date: '2026-06-14 14:00:00-06:00' },
    { partidoId: 12, equipoLocal: 'Suecia', equipoVisitante: 'Túnez', date: '2026-06-14 20:00:00-06:00' },
    { partidoId: 13, equipoLocal: 'Arabia Saudita', equipoVisitante: 'Uruguay', date: '2026-06-15 16:00:00-06:00' },
    { partidoId: 14, equipoLocal: 'España', equipoVisitante: 'Cabo Verde', date: '2026-06-15 10:00:00-06:00' },
    { partidoId: 15, equipoLocal: 'Irán', equipoVisitante: 'Nueva Zelanda', date: '2026-06-15 19:00:00-06:00' },
    { partidoId: 16, equipoLocal: 'Bélgica', equipoVisitante: 'Egipto', date: '2026-06-15 13:00:00-06:00' },
    { partidoId: 17, equipoLocal: 'Francia', equipoVisitante: 'Senegal', date: '2026-06-16 13:00:00-06:00' },
    { partidoId: 18, equipoLocal: 'Irak', equipoVisitante: 'Noruega', date: '2026-06-16 16:00:00-06:00' },
    { partidoId: 19, equipoLocal: 'Argentina', equipoVisitante: 'Argelia', date: '2026-06-16 19:00:00-06:00' },
    { partidoId: 20, equipoLocal: 'Austria', equipoVisitante: 'Jordania', date: '2026-06-16 22:00:00-06:00' },
    { partidoId: 21, equipoLocal: 'Ghana', equipoVisitante: 'Panamá', date: '2026-06-17 17:00:00-06:00' },
    { partidoId: 22, equipoLocal: 'Inglaterra', equipoVisitante: 'Croacia', date: '2026-06-17 14:00:00-06:00' },
    { partidoId: 23, equipoLocal: 'Portugal', equipoVisitante: 'RD Congo', date: '2026-06-17 11:00:00-06:00' },
    { partidoId: 24, equipoLocal: 'Uzbekistán', equipoVisitante: 'Colombia', date: '2026-06-17 20:00:00-06:00' },
    { partidoId: 25, equipoLocal: 'República Checa', equipoVisitante: 'Sudáfrica', date: '2026-06-18 10:00:00-06:00' },
    { partidoId: 26, equipoLocal: 'Suiza', equipoVisitante: 'Bosnia y Herzegovina', date: '2026-06-18 13:00:00-06:00' },
    { partidoId: 27, equipoLocal: 'Canadá', equipoVisitante: 'Catar', date: '2026-06-18 16:00:00-06:00' },
    { partidoId: 28, equipoLocal: 'México', equipoVisitante: 'Corea del Sur', date: '2026-06-18 19:00:00-06:00' },
    { partidoId: 29, equipoLocal: 'Brasil', equipoVisitante: 'Haití', date: '2026-06-19 18:30:00-06:00' },
    { partidoId: 30, equipoLocal: 'Escocia', equipoVisitante: 'Marruecos', date: '2026-06-19 16:00:00-06:00' },
    { partidoId: 31, equipoLocal: 'Turquía', equipoVisitante: 'Paraguay', date: '2026-06-19 21:00:00-06:00' },
    { partidoId: 32, equipoLocal: 'Estados Unidos', equipoVisitante: 'Australia', date: '2026-06-19 13:00:00-06:00' },
    { partidoId: 33, equipoLocal: 'Alemania', equipoVisitante: 'Costa de Marfil', date: '2026-06-20 14:00:00-06:00' },
    { partidoId: 34, equipoLocal: 'Ecuador', equipoVisitante: 'Curazao', date: '2026-06-20 18:00:00-06:00' },
    { partidoId: 35, equipoLocal: 'Países Bajos', equipoVisitante: 'Suecia', date: '2026-06-20 11:00:00-06:00' },
    { partidoId: 36, equipoLocal: 'Túnez', equipoVisitante: 'Japón', date: '2026-06-20 22:00:00-06:00' },
    { partidoId: 37, equipoLocal: 'Uruguay', equipoVisitante: 'Cabo Verde', date: '2026-06-21 16:00:00-06:00' },
    { partidoId: 38, equipoLocal: 'España', equipoVisitante: 'Arabia Saudita', date: '2026-06-21 10:00:00-06:00' },
    { partidoId: 39, equipoLocal: 'Bélgica', equipoVisitante: 'Irán', date: '2026-06-21 13:00:00-06:00' },
    { partidoId: 40, equipoLocal: 'Nueva Zelanda', equipoVisitante: 'Egipto', date: '2026-06-21 19:00:00-06:00' },
    { partidoId: 41, equipoLocal: 'Noruega', equipoVisitante: 'Senegal', date: '2026-06-22 18:00:00-06:00' },
    { partidoId: 42, equipoLocal: 'Francia', equipoVisitante: 'Irak', date: '2026-06-22 15:00:00-06:00' },
    { partidoId: 43, equipoLocal: 'Argentina', equipoVisitante: 'Austria', date: '2026-06-22 11:00:00-06:00' },
    { partidoId: 44, equipoLocal: 'Jordania', equipoVisitante: 'Argelia', date: '2026-06-22 21:00:00-06:00' },
    { partidoId: 45, equipoLocal: 'Inglaterra', equipoVisitante: 'Ghana', date: '2026-06-23 14:00:00-06:00' },
    { partidoId: 46, equipoLocal: 'Panamá', equipoVisitante: 'Croacia', date: '2026-06-23 17:00:00-06:00' },
    { partidoId: 47, equipoLocal: 'Portugal', equipoVisitante: 'Uzbekistán', date: '2026-06-23 11:00:00-06:00' },
    { partidoId: 48, equipoLocal: 'Colombia', equipoVisitante: 'RD Congo', date: '2026-06-23 20:00:00-06:00' },
    { partidoId: 49, equipoLocal: 'Escocia', equipoVisitante: 'Brasil', date: '2026-06-24 16:00:00-06:00' },
    { partidoId: 50, equipoLocal: 'Marruecos', equipoVisitante: 'Haití', date: '2026-06-24 16:00:00-06:00' },
    { partidoId: 51, equipoLocal: 'Suiza', equipoVisitante: 'Canadá', date: '2026-06-24 13:00:00-06:00' },
    { partidoId: 52, equipoLocal: 'Bosnia y Herzegovina', equipoVisitante: 'Catar', date: '2026-06-24 13:00:00-06:00' },
    { partidoId: 53, equipoLocal: 'República Checa', equipoVisitante: 'México', date: '2026-06-24 19:00:00-06:00' },
    { partidoId: 54, equipoLocal: 'Sudáfrica', equipoVisitante: 'Corea del Sur', date: '2026-06-24 19:00:00-06:00' },
    { partidoId: 55, equipoLocal: 'Curazao', equipoVisitante: 'Costa de Marfil', date: '2026-06-25 14:00:00-06:00' },
    { partidoId: 56, equipoLocal: 'Ecuador', equipoVisitante: 'Alemania', date: '2026-06-25 14:00:00-06:00' },
    { partidoId: 57, equipoLocal: 'Japón', equipoVisitante: 'Suecia', date: '2026-06-25 17:00:00-06:00' },
    { partidoId: 58, equipoLocal: 'Túnez', equipoVisitante: 'Países Bajos', date: '2026-06-25 17:00:00-06:00' },
    { partidoId: 59, equipoLocal: 'Turquía', equipoVisitante: 'Estados Unidos', date: '2026-06-25 20:00:00-06:00' },
    { partidoId: 60, equipoLocal: 'Paraguay', equipoVisitante: 'Australia', date: '2026-06-25 20:00:00-06:00' },
    { partidoId: 61, equipoLocal: 'Noruega', equipoVisitante: 'Francia', date: '2026-06-26 13:00:00-06:00' },
    { partidoId: 62, equipoLocal: 'Senegal', equipoVisitante: 'Irak', date: '2026-06-26 13:00:00-06:00' },
    { partidoId: 63, equipoLocal: 'Egipto', equipoVisitante: 'Irán', date: '2026-06-26 21:00:00-06:00' },
    { partidoId: 64, equipoLocal: 'Nueva Zelanda', equipoVisitante: 'Bélgica', date: '2026-06-26 21:00:00-06:00' },
    { partidoId: 65, equipoLocal: 'Cabo Verde', equipoVisitante: 'Arabia Saudita', date: '2026-06-26 18:00:00-06:00' },
    { partidoId: 66, equipoLocal: 'Uruguay', equipoVisitante: 'España', date: '2026-06-26 18:00:00-06:00' },
    { partidoId: 67, equipoLocal: 'Panamá', equipoVisitante: 'Inglaterra', date: '2026-06-27 15:00:00-06:00' },
    { partidoId: 68, equipoLocal: 'Croacia', equipoVisitante: 'Ghana', date: '2026-06-27 15:00:00-06:00' },
    { partidoId: 69, equipoLocal: 'Argelia', equipoVisitante: 'Austria', date: '2026-06-27 20:00:00-06:00' },
    { partidoId: 70, equipoLocal: 'Jordania', equipoVisitante: 'Argentina', date: '2026-06-27 20:00:00-06:00' },
    { partidoId: 71, equipoLocal: 'Colombia', equipoVisitante: 'Portugal', date: '2026-06-27 17:30:00-06:00' },
    { partidoId: 72, equipoLocal: 'RD Congo', equipoVisitante: 'Uzbekistán', date: '2026-06-27 17:30:00-06:00' },
    { partidoId: 73, equipoLocal: '2A', equipoVisitante: '2B', date: '2026-06-28 13:00:00-06:00' },
    { partidoId: 74, equipoLocal: '1E', equipoVisitante: '3ABCDF', date: '2026-06-29 14:30:00-06:00' },
    { partidoId: 75, equipoLocal: '1F', equipoVisitante: '2C', date: '2026-06-29 19:00:00-06:00' },
    { partidoId: 76, equipoLocal: '1C', equipoVisitante: '2F', date: '2026-06-29 11:00:00-06:00' },
    { partidoId: 77, equipoLocal: '1I', equipoVisitante: '3CDFGH', date: '2026-06-30 15:00:00-06:00' },
    { partidoId: 78, equipoLocal: '2E', equipoVisitante: '2I', date: '2026-06-30 11:00:00-06:00' },
    { partidoId: 79, equipoLocal: '1A', equipoVisitante: '3CEFHI', date: '2026-06-30 19:00:00-06:00' },
    { partidoId: 80, equipoLocal: '1L', equipoVisitante: '3EHIJK', date: '2026-07-01 10:00:00-06:00' },
    { partidoId: 81, equipoLocal: '1D', equipoVisitante: '3BEFIJ', date: '2026-07-01 18:00:00-06:00' },
    { partidoId: 82, equipoLocal: '1G', equipoVisitante: '3AEHIJ', date: '2026-07-01 14:00:00-06:00' },
    { partidoId: 83, equipoLocal: '2K', equipoVisitante: '2L', date: '2026-07-02 17:00:00-06:00' },
    { partidoId: 84, equipoLocal: '1H', equipoVisitante: '2J', date: '2026-07-02 13:00:00-06:00' },
    { partidoId: 85, equipoLocal: '1B', equipoVisitante: '3EFGIJ', date: '2026-07-02 21:00:00-06:00' },
    { partidoId: 86, equipoLocal: '1J', equipoVisitante: '2H', date: '2026-07-03 16:00:00-06:00' },
    { partidoId: 87, equipoLocal: '1K', equipoVisitante: '3DEIJL', date: '2026-07-03 19:30:00-06:00' },
    { partidoId: 88, equipoLocal: '2D', equipoVisitante: '2G', date: '2026-07-03 12:00:00-06:00' },
    { partidoId: 89, equipoLocal: 'W74', equipoVisitante: 'W77', date: '2026-07-04 15:00:00-06:00' },
    { partidoId: 90, equipoLocal: 'W73', equipoVisitante: 'W75', date: '2026-07-04 11:00:00-06:00' },
    { partidoId: 91, equipoLocal: 'W76', equipoVisitante: 'W78', date: '2026-07-05 14:00:00-06:00' },
    { partidoId: 92, equipoLocal: 'W79', equipoVisitante: 'W80', date: '2026-07-05 18:00:00-06:00' },
    { partidoId: 93, equipoLocal: 'W83', equipoVisitante: 'W84', date: '2026-07-06 13:00:00-06:00' },
    { partidoId: 94, equipoLocal: 'W81', equipoVisitante: 'W82', date: '2026-07-06 18:00:00-06:00' },
    { partidoId: 95, equipoLocal: 'W86', equipoVisitante: 'W88', date: '2026-07-07 10:00:00-06:00' },
    { partidoId: 96, equipoLocal: 'W85', equipoVisitante: 'W87', date: '2026-07-07 14:00:00-06:00' },
    { partidoId: 97, equipoLocal: 'W89', equipoVisitante: 'W90', date: '2026-07-09 14:00:00-06:00' },
    { partidoId: 98, equipoLocal: 'W93', equipoVisitante: 'W94', date: '2026-07-10 13:00:00-06:00' },
    { partidoId: 99, equipoLocal: 'W91', equipoVisitante: 'W92', date: '2026-07-11 15:00:00-06:00' },
    { partidoId: 100, equipoLocal: 'W95', equipoVisitante: 'W96', date: '2026-07-11 19:00:00-06:00' },
    { partidoId: 101, equipoLocal: 'W97', equipoVisitante: 'W98', date: '2026-07-14 13:00:00-06:00' },
    { partidoId: 102, equipoLocal: 'W99', equipoVisitante: 'W100', date: '2026-07-15 13:00:00-06:00' },
    { partidoId: 103, equipoLocal: 'L101', equipoVisitante: 'L102', date: '2026-07-18 15:00:00-06:00' },
    { partidoId: 104, equipoLocal: 'W101', equipoVisitante: 'W102', date: '2026-07-19 13:00:00-06:00' }
  ];

  const sheet = SpreadsheetApp.getActive().getSheetByName('ResultadosReales');
  const lastRow = sheet.getLastRow();
  
  // Obtener los datos existentes en la hoja para no sobreescribir marcadores ya guardados
  const existingData = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 8).getValues() : [];
  const existingMap = {};
  existingData.forEach((row, index) => {
    const id = parseInt(row[0]);
    if (!isNaN(id)) {
      existingMap[id] = {
        rowNum: index + 2, // 1-indexed y saltar la cabecera
        local: row[1],
        visitante: row[2],
        golesL: row[3],
        golesV: row[4],
        status: row[5],
        procesado: row[6],
        fecha: row[7]
      };
    }
  });

  matches.forEach(m => {
    const matchId = m.partidoId;
    const home = m.equipoLocal;
    const away = m.equipoVisitante;
    const dateStr = m.date;

    if (existingMap[matchId]) {
      // El partido ya existe, actualizamos equipos y fecha, manteniendo goles y estado si ya fueron procesados
      const ext = existingMap[matchId];
      const rNum = ext.rowNum;
      
      sheet.getRange(rNum, 2).setValue(home);
      sheet.getRange(rNum, 3).setValue(away);
      sheet.getRange(rNum, 8).setValue(dateStr);
      
      // Aseguramos valores por defecto si estaban vacíos
      if (ext.status === "") {
        sheet.getRange(rNum, 6).setValue("SCHEDULED");
      }
      if (ext.procesado === "") {
        sheet.getRange(rNum, 7).setValue("NO");
      }
    } else {
      // El partido no existe, se añade la fila nueva
      sheet.appendRow([matchId, home, away, "", "", "SCHEDULED", "NO", dateStr]);
    }
  });
}

// ================= MENÚ MANUAL PARA GOOGLE SHEETS =================
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('⚽ Quiniela Mundial')
      .addItem('Recalcular Todos Los Puntos', 'menuRecalcular')
      .addToUi();
}

function menuRecalcular() {
  recalcularTodosLosPuntos();
  SpreadsheetApp.getUi().alert('Éxito', 'Los puntos de los usuarios han sido sumados y actualizados correctamente según los resultados actuales de la hoja ResultadosReales. Ya no hay riesgo de puntos perdidos o duplicados.', SpreadsheetApp.getUi().ButtonSet.OK);
}
