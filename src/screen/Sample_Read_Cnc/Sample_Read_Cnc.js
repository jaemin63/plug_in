// Sample_Read_Cnc.js

// ========================================
// Karel 프로그램 설정
// ========================================
var KAREL_PROGRAM_NAME = "IPL_DN_SimTen_Cfg";
var conditions = [];
var conditionItems = [];

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
// Condition Zone 업데이트 (Display Only)
// ========================================
function updateConditionZone() {
  var zone = document.getElementById("conditionZone");
  zone.innerHTML = "";

  if (conditionItems.length === 0) {
    zone.classList.add("empty");
  } else {
    zone.classList.remove("empty");

    conditionItems.forEach(function (item) {
      var div = document.createElement("div");
      div.className = "condition-item " + item.type;
      div.textContent = item.text;
      zone.appendChild(div);
    });
  }
}

// ========================================
// 조건 선택 변경
// ========================================
function onConditionChange() {
  var select = document.getElementById("conditionSelect");
  var selectedIndex = select.value;

  if (selectedIndex === "") {
    conditionItems = [];
    updateConditionZone();
  } else {
    var index = parseInt(selectedIndex);
    var expr = conditions[index].expr;
    parseConditionString(expr);
  }

  updateParameter();
}

// ========================================
// 파라미터 업데이트
// ========================================
function updateParameter() {
  var conditionStr = conditionItems
    .map(function (item) {
      return item.text;
    })
    .join(" ");

  var waitVal = document.getElementById("chkWait").checked ? "1" : "0";
  var paramStr = "'" + conditionStr + "'," + waitVal;

  try {
    parent.setInstructionParam(paramStr);
  } catch (e) {
    // parent가 없는 경우 (테스트 환경)
    console.log("Parameter: " + paramStr);
  }
}

// ========================================
// 드롭 시 초기화 (새 명령어 추가 시)
// ========================================
function dropAdvInstData(argStr) {
  if (argStr.length === 0) {
    return false;
  }

  conditionItems = [];
  updateConditionZone();
  document.getElementById("conditionSelect").value = "";
  document.getElementById("chkWait").checked = false;

  var paramStr = "'',0";
  parent.setInstructionParam(paramStr);

  return true;
}

// ========================================
// 표시 (기존 명령어 편집 시)
// ========================================
function dispAdvInstData(argStr) {
  if (argStr.length === 0) {
    return false;
  }

  // 파라미터 파싱: "'Condition',Wait"
  var params = argStr.split(",");
  var conditionVal = params[0] ? params[0].replace(/'/g, "") : "";
  var waitVal = params[1] ? params[1] : "0";

  // Wait 체크박스 설정
  document.getElementById("chkWait").checked = waitVal === "1";

  // Condition 파싱 및 복원
  if (conditionVal) {
    parseConditionString(conditionVal);

    // Select box에서 일치하는 조건 찾기
    var select = document.getElementById("conditionSelect");
    var foundIndex = -1;

    for (var i = 0; i < conditions.length; i++) {
      if (conditions[i].expr === conditionVal) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex !== -1) {
      select.value = String(foundIndex);
    } else {
      select.value = "";
    }
  }

  return true;
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

  // 공백 기준으로 분리
  var tokens = str.split(" ");

  tokens.forEach(function (token) {
    token = token.trim();
    if (token === "") return;

    var type = "signal-di"; // 기본값

    if (token === "(" || token === ")" || token === "AND" || token === "OR") {
      type = "operator";
    } else {
      // DI/DO 신호 구분 (DO_NAME으로 시작하면 signal-do)
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
// 조건 목록 로드
// ========================================
function loadConditions() {
  var select = document.getElementById("conditionSelect");
  var loadedCount = 0;
  conditions = [];

  for (var i = 0; i < 10; i++) {
    (function (index) {
      ihmiGet("COND_NAME[" + (index + 1) + "]", function (kprog, kv, type, name) {
        ihmiGet("COND_EXPR[" + (index + 1) + "]", function (kprog2, kv2, type2, expr) {
          if (name && name.trim() !== "") {
            conditions.push({
              index: index,
              name: name,
              expr: expr || "",
            });
          }

          loadedCount++;

          if (loadedCount === 10) {
            // 모든 조건 로드 완료 - 인덱스 순서로 정렬
            conditions.sort(function (a, b) {
              return a.index - b.index;
            });

            // Select box 채우기
            conditions.forEach(function (cond, idx) {
              var option = document.createElement("option");
              option.value = String(idx);
              option.textContent = cond.name;
              select.appendChild(option);
            });
          }
        });
      });
    })(i);
  }
}

// ========================================
// 초기화 (페이지 로드 시)
// ========================================
window.onload = function () {
  loadConditions();
};
