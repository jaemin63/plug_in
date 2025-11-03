const KAREL_PROGRAM_NAME = "IPL_DN_SimTen_Cfg";
let currentStep = 1;
let currentModel = null;

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

function ihmiSet(kvar, value) {
  try {
    top.ihmi_setVar(KAREL_PROGRAM_NAME, kvar, value);
  } catch (e) {
    console.error("ihmi_setVar error " + kvar + ": " + e);
  }
}

// Step Navigation
function showStep(step) {
  if (step < 1 || step > 5) return;
  if (step > 1 && currentModel === null) {
    alert("Please select a model first.");
    return;
  }

  currentStep = step;

  // Update step buttons
  const stepBtns = document.querySelectorAll(".step-btn");
  stepBtns.forEach((btn, idx) => {
    if (idx + 1 === step) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Update step content
  const stepContents = document.querySelectorAll(".step-content");
  stepContents.forEach((content, idx) => {
    if (idx + 1 === step) {
      content.classList.add("active");
    } else {
      content.classList.remove("active");
    }
  });

  // Update navigation buttons
  document.getElementById("btnPrev").disabled = step === 1;
  document.getElementById("btnNext").disabled = step === 5;

  // Load data for step 5
  if (step === 5) {
    updateConfirmation();
  }
}

function nextStep() {
  if (currentStep < 5) {
    showStep(currentStep + 1);
  }
}

function prevStep() {
  if (currentStep > 1) {
    showStep(currentStep - 1);
  }
}

// Model Selection
function loadModels() {
  const grid = document.getElementById("modelGrid");
  grid.innerHTML = "";

  for (let i = 1; i <= 15; i++) {
    (function (index) {
      const btn = document.createElement("button");
      btn.className = "model-btn";
      btn.id = "model" + index;
      btn.textContent = "No. " + index;
      btn.onclick = function () {
        selectModel(index);
      };

      // Load model name
      ihmiGet("MODEL_NAME[" + index + "]", function (prog, kv, type, val) {
        if (val && val.trim() !== "") {
          btn.innerHTML = "No. " + index + "<br><small>(" + val + ")</small>";
        }
      });

      grid.appendChild(btn);
    })(i);
  }
}

function selectModel(index) {
  currentModel = index;

  // Update UI
  const modelBtns = document.querySelectorAll(".model-btn");
  modelBtns.forEach((btn, idx) => {
    if (idx + 1 === index) {
      btn.classList.add("selected");
    } else {
      btn.classList.remove("selected");
    }
  });

  document.getElementById("selectedInfo").style.display = "block";
  document.getElementById("selectedModelText").textContent = "No. " + index;

  // Load model data
  loadModelData(index);
}

function loadModelData(index) {
  // Load name
  ihmiGet("MODEL_NAME[" + index + "]", function (prog, kv, type, val) {
    document.getElementById("modelName").value = val || "";
  });

  // Load clamp
  ihmiGet("MODEL_CLAMP[" + index + "]", function (prog, kv, type, val) {
    document.getElementById("clampSize").value = parseInt(val) || 0;
  });

  // Load hand type
  ihmiGet("MODEL_HAND_TYPE[" + index + "]", function (prog, kv, type, val) {
    const handVal = parseInt(val) || 0;
    updateHandTypeUI(handVal);
  });

  // Load object type
  ihmiGet("MODEL_OBJECT[" + index + "]", function (prog, kv, type, val) {
    const objVal = parseInt(val) || 0;
    updateObjectTypeUI(objVal);
  });

  // Load coordinates
  const coordMap = {
    workX: "MODEL_WORK_X",
    workZ: "MODEL_WORK_Z",
    handX: "MODEL_HAND_X",
    handY: "MODEL_HAND_Y",
    handZ: "MODEL_HAND_Z",
    handW: "MODEL_HAND_W",
    handP: "MODEL_HAND_P",
    handR: "MODEL_HAND_R",
  };

  Object.keys(coordMap).forEach(function (field) {
    const varName = coordMap[field];
    ihmiGet(varName + "[" + index + "]", function (prog, kv, type, val) {
      document.getElementById(field).value = parseFloat(val) || 0;
    });
  });

  // Load pallet
  ihmiGet("MODEL_PALLET[" + index + "]", function (prog, kv, type, val) {
    const palletVal = parseInt(val) || 0;
    updatePalletUI(palletVal);
  });
}

function updateHandTypeUI(val) {
  const btns = document.querySelectorAll("#step2 .btn-group:nth-of-type(1) .btn-option");
  btns.forEach((btn, idx) => {
    if (idx === val) {
      btn.classList.add("selected");
    } else {
      btn.classList.remove("selected");
    }
  });
}

function updateObjectTypeUI(val) {
  const allBtnGroups = document.querySelectorAll("#step2 .btn-group");
  const objectBtnGroup = allBtnGroups[1]; // Second btn-group is for Object Type
  if (objectBtnGroup) {
    const btns = objectBtnGroup.querySelectorAll(".btn-option");
    btns.forEach((btn, idx) => {
      if (idx === val) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    });
  }
}

function updatePalletUI(val) {
  const palletValues = [13, 25, 41, 61, 85];
  const btns = document.querySelectorAll("#step4 .btn-option");
  btns.forEach((btn, idx) => {
    if (palletValues[idx] === val) {
      btn.classList.add("selected");
    } else {
      btn.classList.remove("selected");
    }
  });
}

// Save Functions
function saveModelName() {
  if (!currentModel) return;
  const val = document.getElementById("modelName").value;
  ihmiSet("MODEL_NAME[" + currentModel + "]", val);
}

function saveClamp() {
  if (!currentModel) return;
  const val = parseInt(document.getElementById("clampSize").value) || 0;
  ihmiSet("MODEL_CLAMP[" + currentModel + "]", val);
}

function selectHandType(val) {
  if (!currentModel) return;
  ihmiSet("MODEL_HAND_TYPE[" + currentModel + "]", val);
  updateHandTypeUI(val);
}

function selectObjectType(val) {
  if (!currentModel) return;
  ihmiSet("MODEL_OBJECT[" + currentModel + "]", val);
  updateObjectTypeUI(val);
}

function saveCoordinate(field) {
  if (!currentModel) return;
  const val = parseFloat(document.getElementById(field).value) || 0;

  const coordMap = {
    workX: "MODEL_WORK_X",
    workZ: "MODEL_WORK_Z",
    handX: "MODEL_HAND_X",
    handY: "MODEL_HAND_Y",
    handZ: "MODEL_HAND_Z",
    handW: "MODEL_HAND_W",
    handP: "MODEL_HAND_P",
    handR: "MODEL_HAND_R",
  };

  const varName = coordMap[field];
  ihmiSet(varName + "[" + currentModel + "]", val);
}

function selectPallet(slots) {
  if (!currentModel) return;
  ihmiSet("MODEL_PALLET[" + currentModel + "]", slots);
  updatePalletUI(slots);
}

// Confirmation
function updateConfirmation() {
  if (!currentModel) return;

  document.getElementById("confirmModel").textContent = "No. " + currentModel;
  document.getElementById("confirmName").textContent = document.getElementById("modelName").value || "-";
  document.getElementById("confirmClamp").textContent = document.getElementById("clampSize").value + " mm";

  // Get Hand Type from first btn-group
  const allBtnGroups = document.querySelectorAll("#step2 .btn-group");
  const handBtnGroup = allBtnGroups[0];
  const handType = handBtnGroup ? handBtnGroup.querySelector(".btn-option.selected") : null;
  document.getElementById("confirmHand").textContent = handType ? handType.textContent : "-";

  // Get Object Type from second btn-group
  const objectBtnGroup = allBtnGroups[1];
  const objType = objectBtnGroup ? objectBtnGroup.querySelector(".btn-option.selected") : null;
  document.getElementById("confirmObject").textContent = objType ? objType.textContent : "-";

  const pallet = document.querySelector("#step4 .btn-option.selected");
  document.getElementById("confirmPallet").textContent = pallet ? pallet.textContent : "-";
}

function confirmSelection() {
  if (!currentModel) return;

  ihmiSet("MODEL_SELECTED", currentModel);
  alert("Model " + currentModel + " has been selected as the current model.");
}

// Event Listeners
window.onload = function () {
  loadModels();

  document.getElementById("modelName").addEventListener("change", saveModelName);
  document.getElementById("clampSize").addEventListener("change", saveClamp);

  ["workX", "workZ", "handX", "handY", "handZ", "handW", "handP", "handR"].forEach(function (field) {
    document.getElementById(field).addEventListener("change", function () {
      saveCoordinate(field);
    });
  });
};
