define(['order!enchant', 'order!nineleap.enchant', 'order!ui.enchant', 'd3m'], function () {

enchant();
var STAGE_SIZE = 640, WIDTH = 320, HEIGHT = 320, bitMap, ILLEGAL_BEST_TIME = 999999999,
    game = new Game(WIDTH, HEIGHT), CAMERA_DIST = 80, startTime, bestTime = ILLEGAL_BEST_TIME,
    MAP_SIZE = 100, MAP_ORIGIN = {x:WIDTH-MAP_SIZE/2, y:MAP_SIZE/2}, car = {
        x: 0, y: 300, z:1, a:Math.PI, v:0, quadrant: 2
    }, camera = {
        x:car.x-CAMERA_DIST*Math.cos(car.a), y:car.y-CAMERA_DIST*Math.sin(car.a), z:20
    }, d3m, pad, speedLabel, lapTimeLabel, bestTimeLabel, smokes = [], lapTimeList = [], STAGE_QUALITY = 18, PAD_SIZE = 96,
    MAP_OUTER = [[-320,320],[320,320],[280,0],[320,-320],[-80,-320],[-180,-160],[-200,0],[-320,180]],
    MAP_INNER = [[-200,240],[240,240],[200,0],[240,-240],[  0,-240],[ -80,-160],[-120,0],[-200,180]],
    giveupLabel;

function onload(e) {
    function createBitMap() {
        function fill(ctx, style, map) {
            var i;
            ctx.fillStyle = style;
            ctx.beginPath();
            ctx.moveTo(
                map[map.length-1][0] + STAGE_SIZE/2,
                map[map.length-1][1] + STAGE_SIZE/2);
            for (i = 0; i < map.length; ++i) {
                ctx.lineTo(
                    map[i][0] + STAGE_SIZE/2,
                    map[i][1] + STAGE_SIZE/2);
            }
            ctx.closePath();
            ctx.fill();
        }
        function compress(data) {
            var i, result = new Array(data.length / 4);
            for (i = 0; i < result.length; ++i) {
                result[i] = data[i*4];
            }
            return result;
        }
        var mapSurface = new Surface(STAGE_SIZE,STAGE_SIZE);
        mapSurface.context.fillStyle='#fff';
        mapSurface.context.fillRect(0,0,STAGE_SIZE,STAGE_SIZE);
        fill(mapSurface.context, '#000', MAP_OUTER);
        fill(mapSurface.context, '#fff', MAP_INNER);
        return compress(mapSurface.context.getImageData(0,0,STAGE_SIZE,STAGE_SIZE).data);
    }
    var surface = new Surface(WIDTH, HEIGHT);
    var screen = new Sprite(WIDTH, HEIGHT);
    screen.image = surface;
    game.rootScene.addChild(screen);
    d3m = new D3M(surface.context, WIDTH, HEIGHT);

    pad = new APad();
    pad.x = (WIDTH - PAD_SIZE) / 2;
    pad.y = HEIGHT - PAD_SIZE;
    game.rootScene.addChild(pad);

    speedLabel = new Label('loading...');
    game.rootScene.addChild(speedLabel);

    lapTimeLabel = new Label('');
    lapTimeLabel.y = 15;
    game.rootScene.addChild(lapTimeLabel);

    bestTimeLabel = new Label('');
    bestTimeLabel.y = 30;
    game.rootScene.addChild(bestTimeLabel);

    giveupLabel = new Label('tap here to give up');
    giveupLabel.y = 50;
    giveupLabel.color = '#fff';
    giveupLabel.addEventListener(enchant.Event.TOUCH_END, function (){
        if (bestTime !== ILLEGAL_BEST_TIME) {
            game.end(60*60*1000-bestTime, 'Best time:' + (bestTime / 1000) + '[s]');
	}
    });
    game.rootScene.addChild(giveupLabel);

    bitMap = createBitMap();
    startTime = +new Date();
}

function frame(e) {
    killSmokes();
    move(e);
    measureTime();
}

function killSmokes() {
    var smoke, i;
    for (i = 0; i < smokes.length; ++i) {
        smoke = smokes[i];
        smoke.r -= 0.6;
    }
    smokes = smokes.filter(function(smoke){return smoke.r>0;}); 
}

function move(e) {
    moveCar();
    moveCamera();
}

function measureTime() {
    var lapTime;
    switch (car.quadrant) {
        case 1:
            if (car.x<0 && 0<car.y) {
                car.quadrant = 2;
                lapTime = new Date() - startTime;
                bestTime = Math.min(bestTime, lapTime);
                lapTimeList.push(lapTime);
                startTime = +new Date();
                lapTimeLabel.text = 'lap time:' + (lapTime / 1000) + '[s]';
                bestTimeLabel.text = 'best time:' + (bestTime / 1000) + '[s]';
            }
            break;
        case 2:
            if (car.x<0 && car.y<0) {car.quadrant = 3;}
            break;
        case 3:
            if (0<car.x && car.y<0) {car.quadrant = 4;}
            break;
        case 4:
            if (0<car.x && 0<car.y) {car.quadrant = 1;}
            break;
        default:
            throw 'illegal quadrant';
    }
}


function moveCar() {
    function outOfStage(x, y) {
        var index = Math.round(x + STAGE_SIZE/2) + Math.round(y + STAGE_SIZE/2) * STAGE_SIZE;
        return bitMap[index];
    }
    function sign(v) {
        return v >= 0 ? 1 : -1;
    }
    function floorTowardZero(v) {
        return sign(v) * Math.floor(Math.abs(v));
    }
    var prev = {x:car.x, y:car.y};

    car.a -= Math.PI * pad.vx / 50;
    car.v -= sign(pad.vy) * d3m.d3dist(pad.vx, pad.vy) * 2;
    car.v = floorTowardZero(car.v * 8) / 10;
    car.x += car.v * Math.cos(car.a);
    car.y += car.v * Math.sin(car.a);
    if (car.x > STAGE_SIZE/2) { car.x = STAGE_SIZE/2; }
    if (car.x <-STAGE_SIZE/2) { car.x =-STAGE_SIZE/2; }
    if (car.y > STAGE_SIZE/2) { car.y = STAGE_SIZE/2; }
    if (car.y <-STAGE_SIZE/2) { car.y =-STAGE_SIZE/2; }

    if (outOfStage(car.x, car.y)) {
        car.x = prev.x;
        car.y = prev.y;
        car.v = -car.v;
    }

    if (car.v) {
        createSmoke();
        giveupLabel.color = '#fff';
    } else if (bestTime !== ILLEGAL_BEST_TIME) {
        giveupLabel.color = '#000';
    }
    speedLabel.text = 'speed:' + car.v + '';
}

function createSmoke() {
    var cx = car.x - 30 * Math.cos(car.a),
        cy = car.y - 30 * Math.sin(car.a),
        r = 1 - Math.random() * 2;
    smokes.push({
        x: cx + 10 * r * Math.sin(car.a),
        y: cy - 10 * r * Math.cos(car.a),
        z: 0,
        r: 3 - Math.abs(r) * 2
    });
}

function moveCamera() {
    camera.x = (camera.x * 3 + car.x-CAMERA_DIST*Math.cos(car.a)) / 4;
    camera.y = (camera.y * 3 + car.y-CAMERA_DIST*Math.sin(car.a)) / 4;
    d3m.d3setcam(
        camera.x, camera.y, 20,
        car.x+100*Math.cos(car.a), car.y+100*Math.sin(car.a),0
    );
}

function draw(e) {
    d3m.context.fillStyle = '#fff';
    d3m.context.strokeStyle = '#000';
    d3m.context.fillRect(0, 0, 320, 320);

    drawStage();
    drawMap();
    drawSmokes();
    drawCar();
}

function drawStage() {
    function drawTrack(map) {
        var i, a, x, y, prev = {x:map[map.length-1][0], y:map[map.length-1][1], z:0};
        d3m.context.strokeStyle='#000';
        d3m.context.beginPath();
        for (i = 0; i < map.length; ++i) {
            x = map[i][0];
            y = map[i][1];
            d3m.d3line(prev.x,prev.y,prev.z, x, y, 0);
            prev.x = x; prev.y = y;
        }
        d3m.context.stroke();
    }
    function drawStartLine() {
        d3m.context.strokeStyle='#f00';
        d3m.context.beginPath();
        d3m.d3line(0,320,0, 0,240,0);
        d3m.context.stroke();
    }
    d3m.d3setlocal();
    drawStartLine();
    drawTrack(MAP_OUTER);
    drawTrack(MAP_INNER);
}

function drawMap() {
    function drawStartLine() {
        d3m.context.strokeStyle='#f00';
        d3m.context.beginPath();
        d3m.context.moveTo(MAP_ORIGIN.x,MAP_ORIGIN.y-320*MAP_SIZE/STAGE_SIZE);
        d3m.context.lineTo(MAP_ORIGIN.x,MAP_ORIGIN.y-240*MAP_SIZE/STAGE_SIZE);
        d3m.context.stroke();
    }
    function drawTrack(map) {
        var i;
        d3m.context.strokeStyle='#000';
        d3m.context.beginPath();
        d3m.context.moveTo(
            MAP_ORIGIN.x+map[map.length-1][0]/STAGE_SIZE*MAP_SIZE,
            MAP_ORIGIN.y-map[map.length-1][1]/STAGE_SIZE*MAP_SIZE);
        for (i = 0; i < map.length; ++i) {
            d3m.context.lineTo(
                MAP_ORIGIN.x+map[i][0]/STAGE_SIZE*MAP_SIZE,
                MAP_ORIGIN.y-map[i][1]/STAGE_SIZE*MAP_SIZE);
        }
        d3m.context.stroke();
    }
    function drawCarPosition() {
        d3m.context.strokeStyle='#0f0';
        d3m.context.beginPath();
        d3m.context.moveTo(
            MAP_ORIGIN.x+car.x*MAP_SIZE/STAGE_SIZE,
            MAP_ORIGIN.y-car.y*MAP_SIZE/STAGE_SIZE);
        d3m.context.lineTo(
            MAP_ORIGIN.x+car.x*MAP_SIZE/STAGE_SIZE + 5 * Math.cos(car.a),
            MAP_ORIGIN.y-car.y*MAP_SIZE/STAGE_SIZE - 5 * Math.sin(car.a));
        
        d3m.context.stroke();
    }
    drawStartLine();
    drawTrack(MAP_OUTER);
    drawTrack(MAP_INNER);
    drawCarPosition();
}

function drawSmokes() {
    var smoke, i;
    d3m.d3setlocal();
    d3m.context.strokeStyle = '#ccc';
    d3m.context.beginPath();
    for (i = 0; i < smokes.length; ++i) {
        smoke = smokes[i];
        d3m.d3circle(smoke.x, smoke.y, smoke.z, smoke.r);
    }
    d3m.context.stroke();
}

function drawCar() {
    d3m.context.strokeStyle = '#3f3';
    d3m.d3setlocal(
        car.x,car.y,car.z,
        Math.cos(car.a), -Math.sin(car.a), 0,
        Math.sin(car.a), Math.cos(car.a), 0
    );
    d3m.context.beginPath();
    d3m.d3initlineto();
    d3m.d3pos(0, 0, 0);
    d3m.d3lineto(-20,  10, 0);
    d3m.d3lineto(-30,  10, 0);
    d3m.d3lineto(-30, -10, 0);
    d3m.d3lineto(-20, -10, 0);
    d3m.d3lineto(  0,   0, 0);
    d3m.context.closePath();
    d3m.context.stroke();
}

game.onload = onload;
game.addEventListener('enterframe', frame);
game.addEventListener('enterdrawframe', draw);
game.start();

});
