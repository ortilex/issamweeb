$(function() {
  var context;

  // control some internal vars here
  var particleCount = 500;
  var hitBoxSize = 2;

  var fontSize = 96;
  var font = 'Reem Kufi';

  // init canvas and pixi
  if ($('#theCanvas').length) {
    context = $('#theCanvas').get(0).getContext('2d');
  } else {
    document.write('No canvas detected');
  }

  var cWidth = $('#theCanvas').get(0).width;
  var cHeight = $('#theCanvas').get(0).height;

  // the array that will contain the NxM rows/cols of data
  // representing the hit test data for the font/text
  var hitTest = [];

  var boxSize = hitBoxSize;
  var av = 0;
  var buildCollisionMatrix = function() {
    // build collision matrix
    var iData = context.getImageData(0, 0, cWidth, cHeight);
    var data = iData.data;
    for (var i = 0; i < cWidth / boxSize; i++) {
      hitTest[i] = [];
      for (var j = 0; j < cHeight / boxSize; j++) {
        //if above or below a specific row, safely assume there is no text here
        if (j > (cHeight / 2 + fontSize * 1.5) / boxSize || j < (cHeight / 2 - fontSize * 1.5) / boxSize) {
          hitTest[i][j] = 0;
          continue;
        }
        var pixel = 0;
        // get boxSize/2 pixels to the left, right, above and below this point
        for (var x = i * boxSize - boxSize; x < i * boxSize + boxSize; x++) {
          for (var y = j * boxSize - boxSize; y < j * boxSize + boxSize; y++) {
            if (x < 0 || y < 0 || x > cWidth || y > cHeight) {
              continue;
            }
            pixel += data[x * 4 + y * 4 * cWidth] + data[x * 4 + y * 4 * cWidth + 1] + data[x * 4 + y * 4 * cWidth + 2] + data[x * 4 + y * 4 * cWidth + 3];
          }
        }
        hitTest[i][j] = pixel;
      }
    }
  };

  buildCollisionMatrix();

  var renderer = PIXI.autoDetectRenderer(cWidth, cHeight);
  renderer.backgroundColor = 0x888888;
  renderer.view.style.position = "absolute";
  renderer.view.style.top = "0px";
  renderer.view.style.left = "0px";

  document.getElementById('pixi').appendChild(renderer.view);
  var stage = new PIXI.Container();
  // When using the highly optimised ParticleContainer, cannot apply tint operations
  //var particles = new PIXI.ParticleContainer(50000, [true, true, false, false, false]);
  var particles = new PIXI.DisplayObjectContainer();

  // create a texture from an image path
  stage.addChild(particles);
  var sprites = [];

  // Apply luminance to a sprite. Used to get the subtle colour variation effect when choosing an emitter colour
  function lum(hex, lum) {

    // validate hex string
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    lum = lum || 0;

    // convert to decimal and change luminosity
    var rgb = "#",
      c, i;
    for (i = 0; i < 3; i++) {
      c = parseInt(hex.substr(i * 2, 2), 16);
      c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
      rgb += ("00" + c).substr(c.length);
    }

    return rgb;
  }

  function initSprite(sprite) {
    sprite.anchor.set(0.5);
    var side = Math.random();
    if (side > 0.5) {
      sprite.direction = Math.PI + Math.random() * 0.75;
      sprite.x = cWidth;
      sprite.y = parseInt($('.right_pos').val()) + Math.random() * 10;
      sprite.vx = Math.random() * $('.right_strength').val() + $('.right_strength').val() / 2;
    } else {
      sprite.direction = Math.PI - Math.random() * 1;
      sprite.x = 0;
      sprite.y = parseInt($('.left_pos').val()) + Math.random() * 10;
      sprite.vx = Math.random() * $('.left_strength').val() + $('.left_strength').val() / 2;
    }
    sprite.vy = Math.random() * 4 + 1;
    sprite.inactive = 0;
    var specular = Math.random();
    var left_col = $('.color_left').val();
    var right_col = $('.color_right').val();

    if (right_col && side > 0.5) {
      var col = lum(right_col, -0.5 + Math.random() * 0.5).replace('#', '0x');
      sprite.tint = col;
    } else if (left_col && side <= 0.5) {
      var col = lum(left_col, -0.5 + Math.random() * 0.5).replace('#', '0x');
      sprite.tint = col;
    } else {
      sprite.tint = 0xFFFFFF * Math.random();
    }

    sprite.scale.set(0.2 + Math.random() * 0.5);

    sprite.bornAt = performance.now();
    sprite.stillFor = 0;
    sprite.lastPos = {
      x: 0,
      y: 0
    };
    sprite.dropOut = false;
  }

  function batchAdd() {
    for (var i = 0; i < particleCount; i++) {
      var sprite = PIXI.Sprite.fromImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAUklEQVR42mP4//8/PxDH//v3dz8yBomB5Bhg4P//f+uB+D8OvB5Z4X/8+H89UQqBzrhPpIn//hOr8D2pbvx7HrcikBw0iKDhmI/FpHyUcCQWAABhzSxEQoKU+gAAAABJRU5ErkJggg==');
      initSprite(sprite);
      sprite.delay = 1000 * Math.random(); //feed sprites slowly
      sprites.push(sprite);
      particles.addChild(sprite);
    }
  }

  batchAdd();

  var animate = function(t) {
    renderer.render(stage);
    for (var i in sprites) {
      var sprite = sprites[i];

      if (sprite.inactive || sprite.bornAt + sprite.delay > t) {
        continue;
      }

      sprite.position.x += Math.sin(sprite.direction) * (sprite.vx * sprite.scale.x);
      sprite.position.y += Math.cos(sprite.direction) * (sprite.vy * sprite.scale.y);

      // knock the sprites from the top of the letters once they've settled
      if (sprite.stillFor > 25) {
        sprite.dropOut = true;
      }

      sprite.vy += -0.3;

      var _x = Math.floor(sprite.position.x / boxSize);
      var _y = Math.floor(sprite.position.y / boxSize);

      if (_x >= 0 && _y >= 0 && _x < cWidth / boxSize && _y < cHeight / boxSize) {
        var hit = hitTest[_x][_y];
        if (hit > 0 && !sprite.dropOut) {
          sprite.vy = 0 - sprite.vy * (0.1 + 0.3 * Math.random());
          if (sprite.vy < 0.2 && sprite.vy > -0.2) {
            sprite.vy = 0; //stabilise
          }
          sprite.stillFor++; // assuming that the sprite lies still after settling on a surface
          sprite.vx *= -1 + 2 * Math.random();
        } else {
          sprite.stillFor = 0;
        }
      } else {
        // recycle the sprite if it falls off the edge
        initSprite(sprite);
      }

    }
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);

  function rebuild() {
    var text = $('input').val();
    context.font = fontSize + "px " + font;
    var metrics = context.measureText(text);
    context.clearRect(0, 0, cWidth, cHeight);
    var textWidth = context.measureText(text).width;
    //context.fillText(text, (cWidth - textWidth)/2, cHeight /2);
    context.fillText(text, (cWidth - textWidth) / 2, cHeight / 1.5);
    buildCollisionMatrix();
  }

  $('.font_size').on('change', function() {
    fontSize = $(this).val();
    rebuild();
  });
  $('.font').on('change', function() {
    font = $(this).val();
    rebuild();
  });
  $('.input').on('keyup', rebuild);
  $('.input').triggerHandler('keyup');
});
