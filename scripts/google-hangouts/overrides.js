function addDraggableArea() {
  const dragArea = document.createElement("div");
  dragArea.style.position = "relative";
  dragArea.style.top = 0;
  dragArea.style.left = 0;
  dragArea.style.right = 0;
  dragArea.style.height = "25px";
  dragArea.style.webkitAppRegion = "drag";
  dragArea.id = "dragArea";

  window.document.body.insertBefore(dragArea, window.document.body.firstChild);
}

function repositionNavbar() {
  const navbar = window.document.body.querySelector("div");
  navbar.style.top = "25px";

  const chatList = window.document.getElementById("hangout-landing-chat-moles");
  chatList.style.top = "70px";

  const sideMenu = window.document.querySelector(
    "body > div:nth-child(4) > div"
  );
  sideMenu.style.top = "29px";
}

function initHangoutsFix() {
  repositionNavbar();
  addDraggableArea();
}

window.addEventListener("DOMContentLoaded", initHangoutsFix);
