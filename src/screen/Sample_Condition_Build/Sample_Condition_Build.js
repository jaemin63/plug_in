// ========================================
// Karel 프로그램 설정
// ========================================
var KAREL_PROGRAM_NAME = "IPL_DN_SimTen_Cfg";
var conditionItems = [];
var currentEditIndex = -1; // -1 means new, 0-9 means edit
var draggedOutside = false;
var conditions = []; // Global array to store all conditions

// ========================================
// ihmi init 함수 (필수)
// ========================================
function init() {
  // ihmi 초기화 - 필수 함수
}

// ========================================
// ihmi_getVar 헬퍼 함수
// ========================================
function ihmiGet(kvar, cb) {
  try {
    top.ihmi_getVar(KAREL_PROGRAM_NAME, kvar, cb);
  } catch (e) {
    console.error("ihmi_getVar error " + kvar + ": " + e);
  }
}

// ========================================
// ihmi_setVar 헬퍼 함수
// ========================================
function ihmiSet(kvar, value) {
  try {
    top.ihmi_setVar(KAREL_PROGRAM_NAME, kvar, value);
  } catch (e) {
    console.error("ihmi_setVar error " + kvar + ": " + e);
  }
}

// ========================================
// 탭 전환
// ========================================
function switchTab(tabName) {
  var tabs = document.querySelectorAll(".tab");
  tabs.forEach(function (tab) {
    tab.classList.remove("active");
  });

  var tabContents = document.querySelectorAll(".tab-content");
  tabContents.forEach(function (content) {
    content.classList.remove("active");
  });

  event.target.classList.add("active");
  document.getElementById("tab-" + tabName).classList.add("active");
}

// ========================================
// Condition Zone 업데이트
// ========================================
function updateConditionZone() {
  var zone = document.getElementById("conditionZone");
  zone.innerHTML = "";

  if (conditionItems.length === 0) {
    zone.classList.add("empty");
  } else {
    zone.classList.remove("empty");

    conditionItems.forEach(function (item, index) {
      var div = document.createElement("div");
      div.className = "condition-item " + item.type;
      div.draggable = true;
      div.setAttribute("data-index", index);
      div.textContent = item.text;

      div.addEventListener("dragstart", function (e) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("source-index", String(index));
        e.dataTransfer.setData("is-reorder", "true");
        div.classList.add("dragging");
        draggedOutside = false;
      });

      div.addEventListener("dragend", function (e) {
        div.classList.remove("dragging");

        if (draggedOutside) {
          var rect = zone.getBoundingClientRect();
          if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
            conditionItems.splice(index, 1);
            updateConditionZone();
          }
        }
      });

      zone.appendChild(div);
    });
  }
}

// ========================================
// Modal 열기/닫기
// ========================================
function openAddModal() {
  currentEditIndex = -1;
  document.getElementById("modalTitle").textContent = "Add Condition";
  document.getElementById("conditionName").value = "";
  conditionItems = [];
  updateConditionZone();
  document.getElementById("conditionModal").classList.add("active");
}

function openEditModal(index) {
  currentEditIndex = index;
  document.getElementById("modalTitle").textContent = "Edit Condition";

  ihmiGet("COND_NAME[" + (index + 1) + "]", function (kprog, kv, type, val) {
    document.getElementById("conditionName").value = val || "";
  });

  ihmiGet("COND_EXPR[" + (index + 1) + "]", function (kprog, kv, type, val) {
    parseConditionString(val || "");
  });

  document.getElementById("conditionModal").classList.add("active");
}

function closeModal() {
  document.getElementById("conditionModal").classList.remove("active");
  conditionItems = [];
  currentEditIndex = -1;
}

// ========================================
// 조건 저장
// ========================================
function saveCondition() {
  var name = document.getElementById("conditionName").value.trim();
  var expr = conditionItems
    .map(function (item) {
      return item.text;
    })
    .join(" ");

  if (!name) {
    alert("Please enter a condition name.");
    return;
  }

  if (conditionItems.length === 0) {
    alert("Please create a condition expression.");
    return;
  }

  // Check for duplicate condition names (except when editing current condition)
  var isDuplicate = false;
  for (var i = 0; i < conditions.length; i++) {
    if (conditions[i].name === name && i !== currentEditIndex) {
      isDuplicate = true;
      break;
    }
  }

  if (isDuplicate) {
    alert("Error: Condition name '" + name + "' already exists. Please use a different name.");
    return;
  }

  if (currentEditIndex === -1) {
    // 새로 추가: 빈 슬롯 찾기
    findEmptySlot(function (targetIndex) {
      if (targetIndex === -1) {
        alert("All condition slots are full (max 10).");
        return;
      }

      ihmiSet("COND_NAME[" + (targetIndex + 1) + "]", name);
      ihmiSet("COND_EXPR[" + (targetIndex + 1) + "]", expr);

      closeModal();
      setTimeout(function () {
        loadConditions();
      }, 200);
    });
  } else {
    // 기존 편집
    ihmiSet("COND_NAME[" + (currentEditIndex + 1) + "]", name);
    ihmiSet("COND_EXPR[" + (currentEditIndex + 1) + "]", expr);

    closeModal();
    setTimeout(function () {
      loadConditions();
    }, 200);
  }
}

// ========================================
// 빈 슬롯 찾기 (비동기)
// ========================================
function findEmptySlot(callback) {
  var loadedCount = 0;
  var slots = [];

  for (var i = 0; i < 10; i++) {
    (function (index) {
      ihmiGet("COND_NAME[" + (index + 1) + "]", function (kprog, kv, type, val) {
        slots[index] = val && val.trim() !== "" ? "occupied" : "empty";
        loadedCount++;

        if (loadedCount === 10) {
          // 모든 슬롯 로드 완료
          for (var j = 0; j < 10; j++) {
            if (slots[j] === "empty") {
              callback(j);
              return;
            }
          }
          callback(-1); // 빈 슬롯 없음
        }
      });
    })(i);
  }
}

// ========================================
// 조건 삭제
// ========================================
function deleteCondition(index) {
  if (confirm("Are you sure you want to delete this condition?")) {
    ihmiSet("COND_NAME[" + (index + 1) + "]", "");
    ihmiSet("COND_EXPR[" + (index + 1) + "]", "");
    loadConditions();
  }
}

// ========================================
// 조건 목록 로드
// ========================================
function loadConditions() {
  var tbody = document.getElementById("conditionTableBody");
  tbody.innerHTML = "";

  var loadedCount = 0;
  conditions = []; // Reset global array

  for (var i = 0; i < 10; i++) {
    (function (index) {
      ihmiGet("COND_NAME[" + (index + 1) + "]", function (kprog, kv, type, name) {
        ihmiGet("COND_EXPR[" + (index + 1) + "]", function (kprog2, kv2, type2, expr) {
          conditions[index] = { name: name || "", expr: expr || "" };
          loadedCount++;

          if (loadedCount === 10) {
            renderConditions(conditions);
          }
        });
      });
    })(i);
  }
}

function renderConditions(conditions) {
  var tbody = document.getElementById("conditionTableBody");
  tbody.innerHTML = "";

  conditions.forEach(function (cond, index) {
    if (cond.name && cond.name.trim() !== "") {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        (index + 1) +
        "</td>" +
        "<td>" +
        cond.name +
        "</td>" +
        "<td>" +
        cond.expr +
        "</td>" +
        "<td>" +
        '<button class="btn-edit" onclick="openEditModal(' +
        index +
        ')">Edit</button>' +
        '<button class="btn-delete" onclick="deleteCondition(' +
        index +
        ')">Delete</button>' +
        "</td>";
      tbody.appendChild(tr);
    }
  });

  if (tbody.children.length === 0) {
    var tr = document.createElement("tr");
    tr.innerHTML = '<td colspan="4" style="text-align: center; color: #aaa;">No conditions defined</td>';
    tbody.appendChild(tr);
  }
}

// ========================================
// Condition 문자열 파싱
// ========================================
function parseConditionString(str) {
  conditionItems = [];

  if (!str) {
    updateConditionZone();
    return;
  }

  var tokens = str.split(" ");

  tokens.forEach(function (token) {
    token = token.trim();
    if (token === "") return;

    var type = "signal-di";

    if (token === "(" || token === ")" || token === "AND" || token === "OR" || token === "NOT") {
      type = "operator";
    } else {
      if (token.indexOf("DO") === 0) {
        type = "signal-do";
      } else {
        type = "signal-di";
      }
    }

    conditionItems.push({
      text: token,
      type: type,
    });
  });

  updateConditionZone();
}

// ========================================
// DI/DO 이름 로드
// ========================================
function loadSignalNames() {
  var diList = document.getElementById("diSignalList");
  var doList = document.getElementById("doSignalList");
  var diItems = [];
  var doItems = [];
  var diLoadCount = 0;
  var doLoadCount = 0;

  for (var i = 1; i <= 10; i++) {
    (function (index) {
      ihmiGet("DI_NAME[" + index + "]", function (kprog, kv, type, val) {
        diLoadCount++;
        if (val && val.trim() !== "") {
          diItems.push({ index: index, value: val });
        }

        if (diLoadCount === 10) {
          diItems.sort(function (a, b) {
            return a.index - b.index;
          });
          diItems.forEach(function (item) {
            var div = document.createElement("div");
            div.className = "draggable-item signal-di";
            div.draggable = true;
            div.setAttribute("data-value", item.value);
            div.setAttribute("data-type", "signal-di");
            div.textContent = item.value;
            diList.appendChild(div);
            setupDragEvents(div);
          });
        }
      });
    })(i);
  }

  for (var i = 1; i <= 10; i++) {
    (function (index) {
      ihmiGet("DO_NAME[" + index + "]", function (kprog, kv, type, val) {
        doLoadCount++;
        if (val && val.trim() !== "") {
          doItems.push({ index: index, value: val });
        }

        if (doLoadCount === 10) {
          doItems.sort(function (a, b) {
            return a.index - b.index;
          });
          doItems.forEach(function (item) {
            var div = document.createElement("div");
            div.className = "draggable-item signal-do";
            div.draggable = true;
            div.setAttribute("data-value", item.value);
            div.setAttribute("data-type", "signal-do");
            div.textContent = item.value;
            doList.appendChild(div);
            setupDragEvents(div);
          });
        }
      });
    })(i);
  }
}

// ========================================
// 드래그 이벤트 설정
// ========================================
function setupDragEvents(element) {
  element.addEventListener("dragstart", function (e) {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", element.getAttribute("data-value"));
    e.dataTransfer.setData("item-type", element.getAttribute("data-type"));
  });
}

// ========================================
// 초기화
// ========================================
window.onload = function () {
  loadSignalNames();
  loadConditions();

  var operators = document.querySelectorAll(".draggable-item.operator");
  operators.forEach(function (op) {
    setupDragEvents(op);
  });

  var zone = document.getElementById("conditionZone");
  var dropTargetIndex = -1;

  zone.addEventListener("dragover", function (e) {
    e.preventDefault();
    var isReorder = e.dataTransfer.types.indexOf("is-reorder") !== -1;
    e.dataTransfer.dropEffect = isReorder ? "move" : "copy";
    zone.classList.add("drag-over");
    draggedOutside = false;

    var afterElement = getDragAfterElement(zone, e.clientX);
    if (afterElement == null) {
      dropTargetIndex = -1;
    } else {
      dropTargetIndex = parseInt(afterElement.getAttribute("data-index"));
    }
  });

  zone.addEventListener("dragleave", function (e) {
    var rect = zone.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      draggedOutside = true;
    }
    zone.classList.remove("drag-over");
  });

  zone.addEventListener("drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove("drag-over");
    draggedOutside = false;

    var isReorder = e.dataTransfer.getData("is-reorder") === "true";
    var sourceIndex = e.dataTransfer.getData("source-index");

    if (isReorder && sourceIndex !== "") {
      var srcIdx = parseInt(sourceIndex);

      if (dropTargetIndex === -1) {
        if (srcIdx !== conditionItems.length - 1) {
          var movedItem = conditionItems.splice(srcIdx, 1)[0];
          conditionItems.push(movedItem);
          updateConditionZone();
        }
      } else if (srcIdx !== dropTargetIndex) {
        var movedItem = conditionItems.splice(srcIdx, 1)[0];

        var insertIdx = dropTargetIndex;
        if (srcIdx < dropTargetIndex) {
          insertIdx = dropTargetIndex - 1;
        }

        conditionItems.splice(insertIdx, 0, movedItem);
        updateConditionZone();
      }
    } else {
      var value = e.dataTransfer.getData("text/plain");
      var type = e.dataTransfer.getData("item-type");

      if (!type) {
        type = "operator";
      }

      if (dropTargetIndex === -1 || dropTargetIndex >= conditionItems.length) {
        conditionItems.push({
          text: value,
          type: type,
        });
      } else {
        conditionItems.splice(dropTargetIndex, 0, {
          text: value,
          type: type,
        });
      }

      updateConditionZone();
    }
  });

  function getDragAfterElement(container, x) {
    var draggableElements = Array.from(container.querySelectorAll(".condition-item:not(.dragging)"));

    return draggableElements.reduce(
      function (closest, child) {
        var box = child.getBoundingClientRect();
        var offset = x - box.left - box.width / 2;

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }
};
