function waitForLogoLoad(callback) {
  const logo = window.document.querySelector("c-wiz").querySelector("img");

  if (!logo) {
    setTimeout(function() {
      waitForLogoLoad(callback);
    }, 1000);
  } else {
    callback(logo);
  }
}

function fixBodyPosition() {
  window.document.body.style.position = "absolute";
}

function addDraggableArea() {
  const dragArea = document.createElement("div");
  dragArea.style.position = "relative";
  dragArea.style.top = 0;
  dragArea.style.left = 0;
  dragArea.style.right = 0;
  dragArea.style.height = "25px";
  dragArea.style.webkitAppRegion = "drag";
  dragArea.id = "dragArea";

  window.document.body.appendChild(dragArea);
}

function repositionNavbar() {
  // I'm really sorry about this but it truly was the only way to reposition
  // the navbar consistently across all pages. Google keeps changing the class
  // names but not the component layout. This assumes a certain layout for
  // their navbar component.
  // Basically you find the logo image and walk up on the nav until you reached
  // the top element.
  // The problem is that this image is loaded asynchronously and sometimes
  // (especially in the call page, it's not loaded. Consequently, we retry
  // until it is present)
  waitForLogoLoad(function(logo) {
    const navbar = logo.parentElement.parentElement.parentElement;
    navbar.style.paddingTop = "25px";
  });
}

// Once you've entered a meeting, you can't go back
// Now you can if you click the logo.
function addBackLink() {
  waitForLogoLoad(function(logo) {
    const back = window.document.createElement("a");
    back.setAttribute("href", "#");

    logo.parentNode.insertBefore(back, logo);
    back.append(logo);

    // omg again, sorry, but this is the only way I found to trick angular into
    // doing a full-page refresh. Otherwise it would diff and it wouldn't
    // trigger the DOMContentLoaded event again and consequently our changes.
    //I just know this will somehow endup on r/programminghorror
    back.addEventListener("click", function(e) {
      e.preventDefault();
      window.location = "https://meet.google.com";
    });
  });
}

function initMeetFix() {
  fixBodyPosition();
  repositionNavbar();
  addDraggableArea();
  addBackLink();
}

window.addEventListener("DOMContentLoaded", initMeetFix);
