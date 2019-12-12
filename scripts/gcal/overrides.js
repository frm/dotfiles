function addDraggableArea() {
  const dragArea = document.createElement("div");
  dragArea.style.position = "absolute";
  dragArea.style.top = 0;
  dragArea.style.left = 0;
  dragArea.style.right = 0;
  dragArea.style.height = "25px";
  dragArea.style.webkitAppRegion = "drag";
  dragArea.id = "dragArea";

  window.document.body.appendChild(dragArea);
  window.document.body.style.paddingTop = "25px";
}

window.addEventListener("DOMContentLoaded", addDraggableArea, false);
