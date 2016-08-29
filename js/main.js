document.getElementsByClassName = function(className, context) {

  var getElems;

  if (typeof document.evaluate == 'function') {
    getElems = function(className, context) {
      var els = [];
      var xpath = document.evaluate(
          ".//*[contains(concat(' ', @class, ' '), ' "
            + className + " ')]", context, null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (var i=0; i<xpath.snapshotLength; i++){
        els.push(xpath.snapshotItem(i));
      }
      return els;
    }
  } else {
    getElems = function(className, content) {
      var nodeList = context.getElementsByTagName('*');
      var re = new RegExp('(^|\\s)' + className + '(\\s|$)');
      return Array.filter(nodeList, function(node) {
        return node.className.match(re) });
      }
    }

  document.getElementsByClassName = function(className, context) {
    context = context || document;
    return getElems(className, context);
  }

  return document.getElementsByClassName(className, context);
}


function renderPattern() {

    var imgNum = 48;
    // var mainElem = document.getElementById("front-pattern");
    var patternElem = document.getElementById("pattern");

    function titleImageAnimationDelays() {
      var anim = document.getElementsByClassName("anim");

      for (var i=anim.length-1; i>=0; i--) {

        var idName = anim[i].getAttribute("id");
        anim[i].classList.add(idName)
      }

      var imgs = patternElem.getElementsByClassName("indiv");

      for (var i=0; i<imgs.length; i++) {
        imgs[i].style.animationDelay = (250 + (Math.floor(Math.random() * i+1) *10)) + 'ms';
        imgs[i].style.webkitAnimationDelay = (250 + (Math.floor(Math.random() * i+1) *10)) + 'ms';
      }
    }

    function addPatternImages() {
      for (var i = 1; i <= imgNum; i++) {

        var divElem = document.createElement("div");
        var newImgElem = document.createElement("img");

        if (i < 10) {
          newImgElem.src = "img/pattern/"+ "0" + i.toString() + ".svg";
        } else {
          newImgElem.src = "img/pattern/"+ i.toString() + ".svg";
        };

        newImgElem.classList.add("indiv");
        patternElem.appendChild(newImgElem);
      }

      titleImageAnimationDelays();
    }

    addPatternImages();

}


function createImgGraphic() {

  var width,
      height = 20;
  var graphic = d3.select(".graphic");

  var collection = graphic.selectAll(".color-collection")
      .datum(function(d) {
        return {
          slug: this.getAttribute("data-slug"),
          size: this.getAttribute("data-size")
        };
      });

  var canvas = collection.append("canvas");


  var pixelRatio = 1,
      storeRatio = 1;

  canvas
      .attr("height", height)
      .style("height", height + "px");

  d3.select(window)
      .on("scroll", scroll)
      .on("resize", resize);

  resize();

  // Recompute bounding boxes ??
  function resize() {
    width = parseInt(graphic.style("width"));

    collection.select("canvas")
        .attr("width", width * storeRatio)
        .style("width", width + "px")
        .each(function(d) {
          var context = d.context = this.getContext("2d");
          context.scale(storeRatio, storeRatio);
          context.strokeStyle = "rgba(0,0,0,0.8)";
          if (d.enabled) d.resize();
        });

    scroll();
  }

  // Recompute which canvases are visible in the viewport. ??
  function scroll() {
    var dy = innerHeight;
    if (!canvas
        .filter(function() {
          var box = this.getBoundingClientRect();
          return box.bottom > 0 && box.top < dy;
        })
        .each(enableFisheye)
        .empty()) {
      canvas = canvas.filter(function(d) { return !d.enabled; });
    }
  }

  function enableFisheye(d) {
    d.enabled = true;

    var that = this,
        link = that.parentNode,
        div = link.parentNode,
        touchtime;

    var normalWidth = width / d.size,
        // image = new Image,
        image = new Image,
        // size of orig
        imageWidth = 105,
        imageHeight = 225,
        desiredDistortion = 0,
        desiredFocus,
        progress = 0,
        idle = true;

    var x = fisheye()
        .distortion(0)
        .extent([0, width]);

    image.src = "img/color_thumb.png";
    image.onload = initialize;

    d3.timer(function() {
      if (progress < 0) return true;
      var context = d.context;
      context.clearRect(0, 0, width, 2);
      // context.fillStyle = "#777";
      context.fillRect(0, 0, ++progress, 2);
    });

    d.resize = function() {
      var f = x.focus() / x.extent()[1],
          d1 = imageWidth / normalWidth - 1,
          d0 = x.distortion() / d1;
      normalWidth = width / d.size;
      x.distortion(d0 * d1).extent([0, width]).focus(f * width);
      render();
    };

    function initialize() {
      progress = -1;

      d3.select(that)
          .on("mouseover", mouseover)
          .on("mousemove", mousemove)
          .on("mouseout", mouseout)
          .on("touchstart", touchstart)
          .on("touchmove", mousemove)
          .on("touchend", mouseout);

      render();
    }

    function render() {

      var context = d.context;
      context.clearRect(0, 0, width, height);

      for (var i = 0, n = d.size; i < n; ++i) {
        var x0 = x(i * normalWidth),
            x1 = x((i + 1) * normalWidth),
            dx = Math.min(imageWidth, x1 - x0);
        context.drawImage(image, Math.round((i * imageWidth + (imageWidth - dx) / 2) * pixelRatio), 0, dx * pixelRatio, imageHeight * pixelRatio, x0, 0, dx, height);
        context.beginPath();
        context.moveTo(x0, 0);
        context.lineTo(x0, height);
        // context.stroke();
      }

      // context.strokeRect(0, 0, width, height);
    }

    function move() {
      if (idle) d3.timer(function() {
        var currentDistortion = x.distortion(),
            currentFocus = currentDistortion ? x.focus() : desiredFocus;
        idle = Math.abs(desiredDistortion - currentDistortion) < .01 && Math.abs(desiredFocus - currentFocus) < .5;
        x.distortion(idle ? desiredDistortion : currentDistortion + (desiredDistortion - currentDistortion) * .14);
        x.focus(idle ? desiredFocus : currentFocus + (desiredFocus - currentFocus) * .14);
        render();
        return idle;
      });
    }

    function mouseover() {
      desiredDistortion = imageWidth / normalWidth - 1;
      mousemove();
    }

    function mouseout() {
      desiredDistortion = 0;
      mousemove();
    }

    function mousemove() {
      desiredFocus = Math.max(0, Math.min(width - 1e-6, d3.mouse(that)[0]));
      move();
    }

    function touchstart() {
      d3.event.preventDefault();
      mouseover();
      if (d3.event.touches.length === 1) {
        var now = Date.now();
        if (now - touchtime < 500) mousedown(), link.click();
        touchtime = now;
      }
    }
  }

  function fisheye() {
    var min = 0,
        max = 1,
        distortion = 3,
        focus = 0;

    function G(x) {
      return (distortion + 1) * x / (distortion * x + 1);
    }

    function fisheye(x) {
      var Dmax_x = (x < focus ? min : max) - focus,
          Dnorm_x = x - focus;
      return G(Dnorm_x / Dmax_x) * Dmax_x + focus;
    }

    fisheye.extent = function(_) {
      if (!arguments.length) return [min, max];
      min = +_[0], max = +_[1];
      return fisheye;
    };

    fisheye.distortion = function(_) {
      if (!arguments.length) return distortion;
      distortion = +_;
      return fisheye;
    };

    fisheye.focus = function(_) {
      if (!arguments.length) return focus;
      focus = +_;
      return fisheye;
    };

    return fisheye;
  }
}


function currentYPosition() {
    // Firefox, Chrome, Opera, Safari
    if (self.pageYOffset) return self.pageYOffset;
    // Internet Explorer 6 - standards mode
    if (document.documentElement && document.documentElement.scrollTop)
        return document.documentElement.scrollTop;
    // Internet Explorer 6, 7 and 8
    if (document.body.scrollTop) return document.body.scrollTop;
    return 0;
}

function elemYPosition(elemId) {
    var elem = document.getElementById(elemId);
    var y = elem.offsetTop;
    var node = elem;
    while (node.offsetParent && node.offsetParent != document.body) {
        node = node.offsetParent;
        y += node.offsetTop;
    } return y;
}


function smoothScroll(elemId) {
    var startY = currentYPosition();
    var stopY = elemYPosition(elemId);
    var distance = stopY > startY ? stopY - startY : startY - stopY;
    if (distance < 100) {
        scrollTo(0, stopY); return;
    }
    var speed = Math.round(distance / 100);
    if (speed >= 20) speed = 20;
    if (speed < 10) speed = 10;

    var step = Math.round(distance / 25);
    var leapY = stopY > startY ? startY + step : startY - step;
    var timer = 0;
    if (stopY > startY) {
        for ( var i=startY; i<stopY; i+=step ) {
            setTimeout("window.scrollTo(0, "+leapY+")", timer * speed);
            leapY += step; if (leapY > stopY) leapY = stopY; timer++;
        } return;
    }
    for ( var i=startY; i>stopY; i-=step ) {
        setTimeout("window.scrollTo(0, "+leapY+")", timer * speed);
        leapY -= step; if (leapY < stopY) leapY = stopY; timer++;
    }
    return false;
}


function addEventListeners(elem, func, eventType) {
  if (Array.isArray(elem) == true) {
    for (var x=0; x<elem.length; x++) {
      elem[x].addEventListener(eventType, func)
    }
  } else {
    elem.addEventListener(eventType, func)
  }
}

function addOverlay(e) {
  e.stopPropagation();

  var parent = e.target.parentNode;
  var img = e.target.parentNode.childNodes[3];
  var overlay = e.target.parentNode.childNodes[5];

  overlay.style.opacity = 1;
  img.style.opacity = .25;
  parent.style.backgroundColor = "#607a83";
}

function removeOverlay(e) {
  e.stopPropagation();

  var parent = e.target.parentNode;
  var img = e.target.parentNode.childNodes[3];
  var overlay = e.target.parentNode.childNodes[5];

  overlay.style.opacity = 0;
  img.style.opacity = 1;
  parent.style.backgroundColor = "transparent";
}


function populateModalEvent(e){
  var modalBg = document.getElementById("modal-bg");
  var modal = document.getElementsByClassName("modal")[0];
  var objective = document.getElementById("objective");
  var process = document.getElementById("process");
  var details = document.getElementById("details");
  var project = document.getElementById("project");

  var dataObj = {
    objective: this.dataset.objective,
    process: this.dataset.process,
    details: this.dataset.details, 
    link: this.dataset.link,
  }

  objective.innerHTML = dataObj.objective;
  process.innerHTML = dataObj.process;
  details.innerHTML = dataObj.details;

  modalBg.style.opacity = "1";
  modalBg.style.zIndex = "5";

  var modalPosition = window.pageYOffset; //document.body.scrollTop;
  var windowHeight = document.documentElement.clientHeight; //window.innerHeight;
  var windowWidth = document.documentElement.clientWidth;
  var modalHeight = modal.offsetHeight;

  modal.style.top = ((windowHeight - modalHeight)/2 + modalPosition)+ "px";
}


function hideModalEvent(e) {
  var modalBg = document.getElementById("modal-bg");
  modalBg.style.opacity = "0";
  modalBg.style.zIndex = "-1";
}


window.onload = function() {

  renderPattern();
  createImgGraphic();

  (function() { 
    var body = document.getElementsByTagName("body")[0];
    body.classList.remove("preload") 
  })();

  addEventListeners(document.getElementById("fade04"), function(e){smoothScroll('projs')}, "click");
  addEventListeners(document.getElementsByClassName("overlay"), addOverlay, "mouseover");
  addEventListeners(document.getElementsByClassName("overlay"), removeOverlay, "mouseout");
  addEventListeners(document.getElementsByClassName("proj"), populateModalEvent, "click");
  addEventListeners(document.getElementsByClassName("minimize"), hideModalEvent, "click");

};
