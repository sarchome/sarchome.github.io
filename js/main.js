
function renderPattern() {
  var imgNum = 48;
  // var mainElem = document.getElementById("front-pattern");

  var elems = document.getElementsByClassName("pattern");

  for (var x = 0; x < elems.length; x++) {
    for (var i = 1; i <= imgNum; i++) {
    var divElem = document.createElement("div");
    elems[x].appendChild(divElem);
    divElem.classList
      .add("indiv"+"-"+0+(x+1));

    var imgElem = {
      elem: document.createElement("img"),
      attrib: document.createAttribute("src"),
    };

    if (i.toString().length < 2) {
      imgElem.attrib.value = "img/pattern/"+ "0" + i.toString() + ".svg";
    } else {
      imgElem.attrib.value = "img/pattern/"+ i.toString() + ".svg";
    };

    imgElem.elem.setAttributeNode(imgElem.attrib)

    divElem.appendChild(imgElem.elem);
    divElem.style.animationDelay = (150 + (Math.floor(Math.random() * imgNum) *10)) + 'ms';
    divElem.style.webkitAnimationDelay = (150 + (Math.floor(Math.random() * imgNum) *10)) + 'ms';
    }
  };

}

function addOverlayEvent(e) {
  e.target.style.opacity = 1;
  e.target.addEventListener("mouseout", removeOverlayEvent);
  e.target.parentNode.childNodes[0].style.opacity = .4;
  e.target.parentNode.parentNode.style.backgroundColor = "#859398";
}

function removeOverlayEvent(e) {
  e.target.style.opacity = 0;
  e.target.parentNode.childNodes[0].style.opacity = 1;
  e.target.parentNode.parentNode.style.backgroundColor = "transparent";
}


function addEventListeners(elems, func) {
  for (var x=0; x<elems.length; x++) {
    elems[x].addEventListener("mouseover", func)
  }

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

};


window.onload = function() {
  addEventListeners(document.getElementsByClassName("overlay"), addOverlayEvent);
  renderPattern();
  createImgGraphic();

// Smooth scroll for in page links
$(function(){
    var target, scroll;

    $("a[href*=#]:not([href=#])").on("click", function(e) {
        if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
            target = $(this.hash);
            target = target.length ? target : $("[id=" + this.hash.slice(1) + "]");

            if (target.length) {
                if (typeof document.body.style.transitionProperty === 'string') {
                    e.preventDefault();
                  
                    var avail = $(document).height() - $(window).height();
                    console.log($(document).height(), $(window).height(), avail, target.offset().top, $(window).scrollTop());
                    scroll = target.offset().top;
                  
                    if (scroll > avail) {
                        scroll = avail;
                    }

                    $("html").css({
                        "margin-top" : ( $(window).scrollTop() - scroll ) + "px",
                        "transition" : "1s ease-in-out"
                    }).data("transitioning", true);
                }
            }
        }
    });

    $("html").on("transitionend webkitTransitionEnd msTransitionEnd oTransitionEnd", function (e) {
        if (e.target == e.currentTarget && $(this).data("transitioning") === true) {
            $(this).removeAttr("style").data("transitioning", false);
            $("html, body").scrollTop(scroll);
            return;
        }
    });
});

};