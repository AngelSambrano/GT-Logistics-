/**
 * Calcula dinámicamente el nombre de la pestaña del lunes de la semana actual.
 * Ejemplo: Si hoy es viernes 5 de junio, devolverá "GT Jun 01".
 */
function obtenerNombrePestañaLunes() {
  const hoy = new Date();
  const diaSemana = hoy.getDay();
  const diferencia = hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
  const fechaLunes = new Date(hoy.setDate(diferencia));

  const meses = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mes = meses[fechaLunes.getMonth()];
  const dia = String(fechaLunes.getDate()).padStart(2, '0');

  return "GT " + mes + " " + dia;
}

function generarSnapshotLogistica() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nombreCalculado = obtenerNombrePestañaLunes();
  const sourceSheet = ss.getSheetByName(nombreCalculado);

  if (!sourceSheet) {
    SpreadsheetApp.getUi().alert("⚠️ No se encontró la pestaña de la semana: '" + nombreCalculado + "'");
    return;
  }

  // --- 1. MOTOR DE BÚSQUEDA DINÁMICO (BASE DE DATOS) ---
  const bdSheet = ss.getSheetByName("Base de Datos");
  const dicCorreos = {};
  const dicImagenes = {};

  if (bdSheet) {
    const bdData = bdSheet.getDataRange().getValues();

    // BUSQUEDA DINÁMICA DE ENCABEZADOS EN BASE DE DATOS (Por si hay filas vacías arriba)
    let bdHeaderRowIdx = -1;
    for (let i = 0; i < Math.min(bdData.length, 5); i++) {
      const rowString = bdData[i].map(cell => cell.toString().trim().toLowerCase());
      if (rowString.includes("cliente") || rowString.includes("ref_image") || rowString.includes("ref image")) {
        bdHeaderRowIdx = i;
        break;
      }
    }

    // Si no encuentra la fila de títulos, por defecto usa la fila 0
    if (bdHeaderRowIdx === -1) bdHeaderRowIdx = 0;

    const bdHeaders = bdData[bdHeaderRowIdx].map(h => h.toString().trim().toLowerCase());

    // Asignación inteligente de columnas
    const bdNameIdx = bdHeaders.indexOf("cliente") !== -1 ? bdHeaders.indexOf("cliente") : 1;
    const bdEmailIdx = bdHeaders.indexOf("correo") !== -1 ? bdHeaders.indexOf("correo") : 4;

    let bdImgIdx = bdHeaders.indexOf("ref_image");
    if (bdImgIdx === -1) bdImgIdx = bdHeaders.indexOf("ref image");
    if (bdImgIdx === -1) bdImgIdx = 9; // Fuerza la Columna J (Índice 9) si no encuentra el texto

    // Procesamiento seguro desde la fila siguiente a los encabezados
    for (let i = bdHeaderRowIdx + 1; i < bdData.length; i++) {
      const row = bdData[i];

      const nombreBD = (bdNameIdx < row.length && row[bdNameIdx]) ? row[bdNameIdx].toString().trim().toLowerCase() : "";
      const correoBD = (bdEmailIdx < row.length && row[bdEmailIdx]) ? row[bdEmailIdx].toString().trim() : "";
      const imagenBD = (bdImgIdx < row.length && row[bdImgIdx]) ? row[bdImgIdx].toString().trim() : "";

      if (nombreBD !== "") {
        dicCorreos[nombreBD] = correoBD;
        if (imagenBD !== "") {
          dicImagenes[nombreBD] = imagenBD; // Guarda la ruta de la imagen
        }
      }
    }
  } else {
    SpreadsheetApp.getUi().alert("⚠️ No se encontró la pestaña 'Base de Datos'. Los correos e imágenes se generarán en blanco.");
  }

  // --- 1.5 MOTOR DE BÚSQUEDA DE NOTAS (DRIVER NOTES) ---
  const notesSheet = ss.getSheetByName("Driver Notes");
  const dicNotas = {};

  if (notesSheet) {
    const notesData = notesSheet.getDataRange().getValues();
    for (let i = 0; i < notesData.length; i++) {
      const nombreNota = notesData[i][0] ? notesData[i][0].toString().trim().toLowerCase() : "";
      const notaTexto = notesData[i][1] ? notesData[i][1].toString().trim() : "";
      if (nombreNota !== "") {
        dicNotas[nombreNota] = notaTexto;
      }
    }
  }

  // --- 2. CONFIGURACIÓN Y REESTRUCTURACIÓN DE LA TABLA DESTINO ---
  const targetSheetName = "OPERATIONS";
  let targetSheet = ss.getSheetByName(targetSheetName);

  if (!targetSheet) {
    targetSheet = ss.insertSheet(targetSheetName);
    targetSheet.appendRow(["ID_Pedido", "Semana_Origen", "Cliente", "Correo", "Telefono", "Direccion", "Zona", "Dia_Entrega", "Estado", "Timestamp_Entrega", "Foto_Referencia", "Recogio_Bolsas", "Notas", "Foto_Entrega", "Ubicacion_Entrega"]);
    targetSheet.getRange("A1:O1").setBackground("#10b981").setFontColor("white").setFontWeight("bold");
  }

  // --- 3. PROCESAMIENTO DE LAS COLUMNAS DE LA PESTAÑA ORIGEN ---
  const allData = sourceSheet.getDataRange().getValues();

  let headerRowIndex = -1;
  for (let i = 0; i < allData.length; i++) {
    const rowString = allData[i].map(cell => cell.toString().trim().toLowerCase());
    if (rowString.includes("customer name") || rowString.includes("customer") || rowString.includes("cliente")) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    SpreadsheetApp.getUi().alert("❌ Error: No se encontró la columna de Encabezados en la pestaña de origen.");
    return;
  }

  const headers = allData[headerRowIndex].map(h => h.toString().trim().toLowerCase());
  const rows = allData.slice(headerRowIndex + 1);

  const nameIdx = headers.indexOf("customer name") !== -1 ? headers.indexOf("customer name") : headers.indexOf("customer");
  const streetIdx = headers.indexOf("shipping street");
  const cityIdx = headers.indexOf("shipping city");
  const ZipIdx = headers.indexOf("shipping zip");
  const tagIdx = headers.indexOf("tag");
  const dayIdx = headers.indexOf("day") !== -1 ? headers.indexOf("day") : headers.indexOf("día");
  const phoneIdx = headers.indexOf("phone number");

  // --- 4. EXTRACCIÓN Y LIMPIEZA DE PEDIDOS ---
  const newOrders = [];
  let emptyRowCount = 0;

  // Creamos un conjunto para registrar los clientes que ya procesamos en esta ejecución
  const clientesProcesados = new Set();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const clienteStr = (nameIdx !== -1 && row[nameIdx]) ? row[nameIdx].toString().trim() : "";

    if (clienteStr === "") {
      emptyRowCount++;
      if (emptyRowCount >= 2) { break; }
      continue;
    } else {
      emptyRowCount = 0;
    }

    const clienteLower = clienteStr.toLowerCase();
    if (clienteLower.includes("total") || clienteLower.includes("subtotal") || clienteLower.includes("nota") || clienteLower === "customer name") {
      continue;
    }

    // Si el cliente ya está en el Set, ignoramos esta fila (evita duplicados)
    if (clientesProcesados.has(clienteLower)) {
      continue;
    }
    clientesProcesados.add(clienteLower);

    // Generación de identificador único y formato de direcciones
    const uniqueId = "GT-" + Utilities.getUuid().substring(0, 8).toUpperCase();
    const street = (streetIdx !== -1 && row[streetIdx]) ? row[streetIdx].toString().trim() : "";
    const zip = (ZipIdx !== -1 && row[ZipIdx]) ? row[ZipIdx].toString().trim() : "";
    const city = (cityIdx !== -1 && row[cityIdx]) ? row[cityIdx].toString().trim() : "";
    const address = street + (city ? ", " + city : "") + (zip ? ", " + zip : "");
    const tag = (tagIdx !== -1 && row[tagIdx]) ? row[tagIdx].toString().trim() : "";
    const deliveryDay = (dayIdx !== -1 && row[dayIdx]) ? row[dayIdx].toString().trim() : "No Asignado";
    const telefono = (phoneIdx !== -1 && row[phoneIdx]) ? row[phoneIdx].toString().trim() : "";

    // Cruce de información en memoria
    const correoCliente = dicCorreos[clienteLower] || "";
    const notaConductor = dicNotas[clienteLower] || "";
    const fotoReferencia = dicImagenes[clienteLower] || ""; 
    const fotoEntrega = "";

    newOrders.push([
      uniqueId,           // Columna A
      nombreCalculado,    // Columna B
      clienteStr,         // Columna C
      correoCliente,      // Columna D
      telefono,           // Columna E
      address,            // Columna F
      tag,                // Columna G
      deliveryDay,        // Columna H
      "Pendiente",        // Columna I
      "",                 // Columna J (Timestamp)
      fotoReferencia,     // Columna K
      "",                 // Columna L (Recogio_Bolsas)
      notaConductor,      // Columna M
      fotoEntrega,        // Columna N
      ""                  // Columna O (Ubicacion_Entrega)
    ]);
  }

  // --- 5. INSERCIÓN DE DATOS EN LA HOJA OPERATIONS ---
  if (newOrders.length > 0) {
    targetSheet.getRange(targetSheet.getLastRow() + 1, 1, newOrders.length, newOrders[0].length).setValues(newOrders);
    SpreadsheetApp.getUi().alert("✅ Éxito: Se importaron " + newOrders.length + " ordenes únicas con sus datos logísticos completos.");
  }
}