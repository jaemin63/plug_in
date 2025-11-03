const KAREL_PROGRAM_NAME = "IPL_DN_SimTen_Cfg";
let currentSelectedModel = null;

// Initialize
function init() {
  // Required for ihmi
}

// Helper functions
function ihmiGet(kvar, cb) {
  try {
    top.ihmi_getVar(KAREL_PROGRAM_NAME, kvar, cb);
  } catch (e) {
    console.error("ihmi_getVar error " + kvar + ": " + e);
  }
}

// Format coordinate value
function formatCoord(val) {
  const num = parseFloat(val);
  if (isNaN(num) || num === 0) {
    return '<span class="empty-cell">-</span>';
  }
  return num.toFixed(2);
}

// Format hand type
function formatHandType(val) {
  const num = parseInt(val);
  if (num === 0) {
    return '<span class="badge badge-outside">Outside</span>';
  } else if (num === 1) {
    return '<span class="badge badge-inside">Inside</span>';
  }
  return '<span class="empty-cell">-</span>';
}

// Format object type
function formatObjectType(val) {
  const num = parseInt(val);
  if (num === 0) {
    return '<span class="badge badge-cylinder">Cylinder</span>';
  } else if (num === 1) {
    return '<span class="badge badge-square">Square</span>';
  }
  return '<span class="empty-cell">-</span>';
}

// Format pallet slots
function formatPallet(val) {
  const num = parseInt(val);
  const palletMap = {
    13: "PT 100 (13)",
    25: "PT 75 (25)",
    41: "PT 50 (41)",
    61: "PT 40 (61)",
    85: "PT 30 (85)",
  };
  return palletMap[num] || '<span class="empty-cell">-</span>';
}

// Load current selected model
function loadCurrentModel() {
  ihmiGet("MODEL_SELECTED", function (prog, kv, type, val) {
    const modelNum = parseInt(val) || 0;
    currentSelectedModel = modelNum;
    if (modelNum > 0) {
      document.getElementById("currentModelDisplay").textContent = "Model No. " + modelNum;
    } else {
      document.getElementById("currentModelDisplay").textContent = "None";
    }
  });
}

// Load all models
function loadAllModels() {
  loadCurrentModel();

  const tbody = document.getElementById("modelTableBody");
  tbody.innerHTML = "";

  for (let i = 1; i <= 15; i++) {
    loadModelRow(i);
  }
}

function loadModelRow(index) {
  const row = document.createElement("tr");
  row.id = "modelRow" + index;

  // Check if this is the current model
  if (index === currentSelectedModel) {
    row.classList.add("current-row");
  }

  // Create cells
  const cellNo = document.createElement("td");
  cellNo.className = "col-no";
  cellNo.textContent = index;

  const cellName = document.createElement("td");
  cellName.className = "col-name";
  cellName.innerHTML = '<span class="empty-cell">-</span>';

  const cellClamp = document.createElement("td");
  cellClamp.className = "col-clamp";
  cellClamp.innerHTML = '<span class="empty-cell">-</span>';

  const cellHandType = document.createElement("td");
  cellHandType.className = "col-type";
  cellHandType.innerHTML = '<span class="empty-cell">-</span>';

  const cellObjectType = document.createElement("td");
  cellObjectType.className = "col-type";
  cellObjectType.innerHTML = '<span class="empty-cell">-</span>';

  const cellWorkX = document.createElement("td");
  cellWorkX.className = "col-coord";
  cellWorkX.innerHTML = '<span class="empty-cell">-</span>';

  const cellWorkZ = document.createElement("td");
  cellWorkZ.className = "col-coord";
  cellWorkZ.innerHTML = '<span class="empty-cell">-</span>';

  const cellHandX = document.createElement("td");
  cellHandX.className = "col-coord";
  cellHandX.innerHTML = '<span class="empty-cell">-</span>';

  const cellHandY = document.createElement("td");
  cellHandY.className = "col-coord";
  cellHandY.innerHTML = '<span class="empty-cell">-</span>';

  const cellHandZ = document.createElement("td");
  cellHandZ.className = "col-coord";
  cellHandZ.innerHTML = '<span class="empty-cell">-</span>';

  const cellHandW = document.createElement("td");
  cellHandW.className = "col-coord";
  cellHandW.innerHTML = '<span class="empty-cell">-</span>';

  const cellHandP = document.createElement("td");
  cellHandP.className = "col-coord";
  cellHandP.innerHTML = '<span class="empty-cell">-</span>';

  const cellHandR = document.createElement("td");
  cellHandR.className = "col-coord";
  cellHandR.innerHTML = '<span class="empty-cell">-</span>';

  const cellPallet = document.createElement("td");
  cellPallet.className = "col-pallet";
  cellPallet.innerHTML = '<span class="empty-cell">-</span>';

  // Append cells to row
  row.appendChild(cellNo);
  row.appendChild(cellName);
  row.appendChild(cellClamp);
  row.appendChild(cellHandType);
  row.appendChild(cellObjectType);
  row.appendChild(cellWorkX);
  row.appendChild(cellWorkZ);
  row.appendChild(cellHandX);
  row.appendChild(cellHandY);
  row.appendChild(cellHandZ);
  row.appendChild(cellHandW);
  row.appendChild(cellHandP);
  row.appendChild(cellHandR);
  row.appendChild(cellPallet);

  document.getElementById("modelTableBody").appendChild(row);

  // Load data asynchronously
  ihmiGet("MODEL_NAME[" + index + "]", function (prog, kv, type, val) {
    if (val && val.trim() !== "") {
      cellName.textContent = val;
    }
  });

  ihmiGet("MODEL_CLAMP[" + index + "]", function (prog, kv, type, val) {
    const num = parseInt(val);
    if (!isNaN(num) && num > 0) {
      cellClamp.textContent = num;
    }
  });

  ihmiGet("MODEL_HAND_TYPE[" + index + "]", function (prog, kv, type, val) {
    cellHandType.innerHTML = formatHandType(val);
  });

  ihmiGet("MODEL_OBJECT[" + index + "]", function (prog, kv, type, val) {
    cellObjectType.innerHTML = formatObjectType(val);
  });

  ihmiGet("MODEL_WORK_X[" + index + "]", function (prog, kv, type, val) {
    cellWorkX.innerHTML = formatCoord(val);
  });

  ihmiGet("MODEL_WORK_Z[" + index + "]", function (prog, kv, type, val) {
    cellWorkZ.innerHTML = formatCoord(val);
  });

  ihmiGet("MODEL_HAND_X[" + index + "]", function (prog, kv, type, val) {
    cellHandX.innerHTML = formatCoord(val);
  });

  ihmiGet("MODEL_HAND_Y[" + index + "]", function (prog, kv, type, val) {
    cellHandY.innerHTML = formatCoord(val);
  });

  ihmiGet("MODEL_HAND_Z[" + index + "]", function (prog, kv, type, val) {
    cellHandZ.innerHTML = formatCoord(val);
  });

  ihmiGet("MODEL_HAND_W[" + index + "]", function (prog, kv, type, val) {
    cellHandW.innerHTML = formatCoord(val);
  });

  ihmiGet("MODEL_HAND_P[" + index + "]", function (prog, kv, type, val) {
    cellHandP.innerHTML = formatCoord(val);
  });

  ihmiGet("MODEL_HAND_R[" + index + "]", function (prog, kv, type, val) {
    cellHandR.innerHTML = formatCoord(val);
  });

  ihmiGet("MODEL_PALLET[" + index + "]", function (prog, kv, type, val) {
    cellPallet.innerHTML = formatPallet(val);
  });
}

// Event Listeners
window.onload = function () {
  loadAllModels();
};
