const KAREL_PROGRAM_NAME = "IPL_DN_SimTen_Cfg";
const NAME_MIN = "1",
  NAME_MAX = "32";
const ADDR_MIN = "0",
  ADDR_MAX = "9999";
const BIT_MIN = "0",
  BIT_MAX = "7";

function log(msg) {
  const box = document.getElementById("log");
  const t = new Date(),
    ts = [t.getHours(), t.getMinutes(), t.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
  box.textContent += "[" + ts + "] " + msg + "\n";
  box.scrollTop = box.scrollHeight;
}

function ihmiGet(kvar, cb) {
  try {
    top.ihmi_getVar(KAREL_PROGRAM_NAME, kvar, cb);
  } catch (e) {
    log("ihmi_getVar error " + kvar + ": " + e);
  }
}

function ihmiSet(kvar, val) {
  try {
    top.ihmi_setVar(KAREL_PROGRAM_NAME, kvar, val);
    log("SET " + kvar + " = " + val);
  } catch (e) {
    log("ihmi_setVar error " + kvar + ": " + e);
  }
}

function calculateOffset(startAddr, addr, bit) {
  // Calculate offset in bits from START_ADDR.0
  // Example: START=3000, ADDR=3001, BIT=7 => offset = (3001-3000)*8 + 7 = 15
  const startAddrNum = parseInt(startAddr, 10) || 0;
  const addrNum = parseInt(addr, 10) || 0;
  const bitNum = parseInt(bit, 10) || 0;

  const offset = (addrNum - startAddrNum) * 8 + bitNum;
  return offset;
}

function updateOffset(prefix, index) {
  // Update offset for DI or DO
  const startEl = document.getElementById(prefix + "_START");
  const baseEl = document.getElementById(prefix + "_BASE");
  const addrEl = document.getElementById(prefix + "_ADDR_" + index);
  const bitEl = document.getElementById(prefix + "_BIT_" + index);
  const offsetEl = document.getElementById(prefix + "_OFFSET_" + index);

  if (!startEl || !baseEl || !addrEl || !bitEl || !offsetEl) return;

  const offset = calculateOffset(startEl.value, addrEl.value, bitEl.value);
  const baseAddress = parseInt(baseEl.value) || 0;

  // Display as "DI[base+offset]" or "DO[base+offset]"
  const displayValue = prefix + "[" + (baseAddress + offset) + "]";
  offsetEl.value = displayValue;

  // Write offset to KAREL
  ihmiSet(prefix + "_OFFSET[" + index + "]", offset);
}

function bindVariable(domId, kvar) {
  const el = document.getElementById(domId);
  if (!el) {
    log("Missing element: " + domId);
    return;
  }

  // Read initial value from KAREL
  ihmiGet(kvar, (kprog, kv, type, val) => {
    el.value = val ?? "";
    log("BOUND " + domId + " <=> " + kvar + " | READ=" + val);

    // If this is ADDR or BIT, calculate offset
    const match = domId.match(/(DI|DO)_(ADDR|BIT)_(\d+)/);
    if (match) {
      const prefix = match[1];
      const index = match[3];
      updateOffset(prefix, index);
    }
  });

  // Set up change listener to write back to KAREL
  el.addEventListener("change", function () {
    let newVal = el.value;

    // Special validation for NAME fields
    if (domId.includes("_NAME_")) {
      // Convert to uppercase
      newVal = newVal.toUpperCase();
      el.value = newVal;

      // Check if only uppercase letters (A-Z)
      if (!/^[A-Z]*$/.test(newVal) && newVal !== "") {
        alert("Error: Name must contain only uppercase letters (A-Z)");
        el.value = "";
        return;
      }

      // Check for duplicates
      if (newVal !== "") {
        const isDuplicate = checkDuplicateName(domId, newVal);
        if (isDuplicate) {
          alert("Error: Name '" + newVal + "' is already used");
          el.value = "";
          return;
        }
      }
    }

    ihmiSet(kvar, newVal);

    // If this is START, ADDR, or BIT, recalculate all offsets
    if (domId.includes("_START")) {
      const prefix = domId.replace("_START", "");
      for (let i = 1; i <= 10; i++) {
        updateOffset(prefix, i);
      }
    } else {
      const match = domId.match(/(DI|DO)_(ADDR|BIT)_(\d+)/);
      if (match) {
        const prefix = match[1];
        const index = match[3];
        updateOffset(prefix, index);
      }
    }
  });
}

function checkDuplicateName(currentId, name) {
  // Check all DI names
  for (let i = 1; i <= 10; i++) {
    const diId = "DI_NAME_" + i;
    if (diId !== currentId) {
      const diInput = document.getElementById(diId);
      if (diInput && diInput.value.toUpperCase() === name.toUpperCase()) {
        return true;
      }
    }
  }

  // Check all DO names
  for (let i = 1; i <= 10; i++) {
    const doId = "DO_NAME_" + i;
    if (doId !== currentId) {
      const doInput = document.getElementById(doId);
      if (doInput && doInput.value.toUpperCase() === name.toUpperCase()) {
        return true;
      }
    }
  }

  return false;
}

function switchTab(tabName) {
  // Remove active class from all tabs
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => tab.classList.remove("active"));

  // Remove active class from all tab contents
  const tabContents = document.querySelectorAll(".tab-content");
  tabContents.forEach((content) => content.classList.remove("active"));

  // Add active class to selected tab
  event.target.classList.add("active");

  // Show selected tab content
  document.getElementById("tab-" + tabName).classList.add("active");

  log("Switched to " + tabName + " tab");
}

function bindAll() {
  // Bind DI START
  bindVariable("DI_START", "DI_START");

  // Bind DI_OFFSET_START with default value
  ihmiGet("DI_OFFSET_START", (_, kv, t, v) => {
    const val = parseInt(v, 10) || 0;
    const diBase = document.getElementById("DI_BASE");
    if (diBase) {
      if (val === 0) {
        // No value, set default to 10000
        diBase.value = 10000;
        ihmiSet("DI_OFFSET_START", 10000);
      } else {
        diBase.value = val;
      }
      // Update all DI offsets
      for (let i = 1; i <= 10; i++) {
        updateOffset("DI", i);
      }
    }
  });

  // Bind DI[1~10]
  for (let i = 1; i <= 10; i++) {
    bindVariable("DI_NAME_" + i, "DI_NAME[" + i + "]");
    bindVariable("DI_ADDR_" + i, "DI_ADDR[" + i + "]");
    bindVariable("DI_BIT_" + i, "DI_BIT[" + i + "]");
    // OFFSET is calculated, not bound
  }

  // Bind DO START
  bindVariable("DO_START", "DO_START");

  // Bind DO_OFFSET_START with default value
  ihmiGet("DO_OFFSET_START", (_, kv, t, v) => {
    const val = parseInt(v, 10) || 0;
    const doBase = document.getElementById("DO_BASE");
    if (doBase) {
      if (val === 0) {
        // No value, set default to 20000
        doBase.value = 20000;
        ihmiSet("DO_OFFSET_START", 20000);
      } else {
        doBase.value = val;
      }
      // Update all DO offsets
      for (let i = 1; i <= 10; i++) {
        updateOffset("DO", i);
      }
    }
  });

  // Bind DO[1~10]
  for (let i = 1; i <= 10; i++) {
    bindVariable("DO_NAME_" + i, "DO_NAME[" + i + "]");
    bindVariable("DO_ADDR_" + i, "DO_ADDR[" + i + "]");
    bindVariable("DO_BIT_" + i, "DO_BIT[" + i + "]");
    // OFFSET is calculated, not bound
  }
}

function updateToggleUI(enabled) {
  const toggleSwitch = document.getElementById("toggleSwitch");
  const toggleStatus = document.getElementById("toggleStatus");

  if (enabled) {
    toggleSwitch.classList.add("active");
    toggleStatus.textContent = "ON";
    toggleStatus.className = "toggle-status on";
  } else {
    toggleSwitch.classList.remove("active");
    toggleStatus.textContent = "OFF";
    toggleStatus.className = "toggle-status off";
  }
}

function updateInputsState(enabled) {
  // Update DI START and BASE
  const diStart = document.getElementById("DI_START");
  const diBase = document.getElementById("DI_BASE");
  if (diStart) diStart.disabled = !enabled;
  if (diBase) diBase.disabled = !enabled;

  // Update DI input fields based on EDIT_ENABLE state
  for (let i = 1; i <= 10; i++) {
    const nameInput = document.getElementById("DI_NAME_" + i);
    const addrInput = document.getElementById("DI_ADDR_" + i);
    const bitInput = document.getElementById("DI_BIT_" + i);

    if (nameInput) nameInput.disabled = !enabled;
    if (addrInput) addrInput.disabled = !enabled;
    if (bitInput) bitInput.disabled = !enabled;
  }

  // Update DO START and BASE
  const doStart = document.getElementById("DO_START");
  const doBase = document.getElementById("DO_BASE");
  if (doStart) doStart.disabled = !enabled;
  if (doBase) doBase.disabled = !enabled;

  // Update DO input fields based on EDIT_ENABLE state
  for (let i = 1; i <= 10; i++) {
    const nameInput = document.getElementById("DO_NAME_" + i);
    const addrInput = document.getElementById("DO_ADDR_" + i);
    const bitInput = document.getElementById("DO_BIT_" + i);

    if (nameInput) nameInput.disabled = !enabled;
    if (addrInput) addrInput.disabled = !enabled;
    if (bitInput) bitInput.disabled = !enabled;
  }

  // Update toggle UI
  updateToggleUI(enabled);
}

function readEdit() {
  ihmiGet("EDIT_ENABLE", (_, kv, t, v) => {
    const n = parseInt(v, 10) || 0;
    document.getElementById("editVal").innerText = n;
    updateInputsState(n === 1);
    log("READ EDIT_ENABLE = " + n);
  });
}

function toggleEdit() {
  ihmiGet("EDIT_ENABLE", (_, kv, t, v) => {
    const cur = parseInt(v, 10) || 0;
    const next = cur ? 0 : 1;
    ihmiSet("EDIT_ENABLE", next);
    updateInputsState(next === 1);
    log("Edit Mode: " + (next === 1 ? "ENABLED" : "DISABLED"));
  });
}

function toggleLog() {
  const logPanel = document.getElementById("logPanel");
  const buttons = document.querySelectorAll(".btn-toggle-log");

  if (logPanel.classList.contains("hidden")) {
    logPanel.classList.remove("hidden");
    buttons.forEach((btn) => (btn.textContent = btn.textContent.includes("Show") ? "Hide Log" : "Hide"));
  } else {
    logPanel.classList.add("hidden");
    buttons.forEach((btn) => (btn.textContent = btn.textContent.includes("Hide") ? "Show Log" : "Show"));
  }
}

window.onload = () => {
  log("System Loaded. Auto-bind DI[1~10] and DO[1~10].");
  readEdit();
  bindAll();

  // Add change event listeners for BASE addresses
  const diBase = document.getElementById("DI_BASE");
  const doBase = document.getElementById("DO_BASE");

  if (diBase) {
    diBase.addEventListener("change", () => {
      const val = parseInt(diBase.value, 10) || 10000;
      ihmiSet("DI_OFFSET_START", val);
      for (let i = 1; i <= 10; i++) {
        updateOffset("DI", i);
      }
    });
  }

  if (doBase) {
    doBase.addEventListener("change", () => {
      const val = parseInt(doBase.value, 10) || 20000;
      ihmiSet("DO_OFFSET_START", val);
      for (let i = 1; i <= 10; i++) {
        updateOffset("DO", i);
      }
    });
  }
};
