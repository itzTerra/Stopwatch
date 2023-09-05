class LineArt {
  static SPAWN_AREAS = [
    {
      chance: 0.5,
      radius: 0.15,
    },
    {
      chance: 0.3,
      radius: 0.3,
    },
    {
      chance: 0.2,
      radius: 0.6,
    },
  ];

  static getImagesFromSources(srcList) {
    return new Promise((resolve, reject) => {
      const loadedImages = [];
      let imagesToLoad = srcList.length;

      for (let i = 0; i < srcList.length; i++) {
        const img = new Image();
        img.src = srcList[i];
        img.onload = () => {
          loadedImages.push({
            index: i,
            img: img,
          });
          imagesToLoad--;
          if (imagesToLoad === 0) {
            loadedImages.sort((a, b) => {
              return a.index - b.index;
            });
            resolve(loadedImages.map((item) => item.img));
          }
        };
        img.onerror = () => {
          imagesToLoad--;
          console.error(`Failed to load image from ${srcList[i]}`);
          if (imagesToLoad === 0) {
            loadedImages.sort((a, b) => {
              return a.index - b.index;
            });
            resolve(loadedImages.map((item) => item.img));
          }
        };
      }
    });
  }

  constructor(elementId, settings, images, autoplay = false) {
    this.settings = settings;
    // console.log(settings);

    this.rawImages = images;
    this.calculateImages();
    this.imageIndex = 0;

    this.agents = [];
    this.agentCount = 0;
    this.capped = false;

    const s = (p) => {
      p.preload = () => {
        var a = document.createElement("a");
        a.target = "_blank";

        this.images = [];
        for (let i = 0; i < images.length; i++) {
          this.images[i] = p.loadImage(images[i].src);
        }
      };
      p.setup = () => {
        this.settings.colorP5 = p.color(
          settings.color.r,
          settings.color.g,
          settings.color.b,
          settings.color.a
        );
        this.settings.bgP5 = p.color(
          settings.bg.r,
          settings.bg.g,
          settings.bg.b
        );

        p.createCanvas(settings.width, settings.height);
        p.frameRate(settings.fps);
        p.background(this.settings.bgP5);
        this.settings.bgP5.setAlpha(settings.bg.a);

        if (settings.showImage) {
          p.image(this.images[this.imageIndex], 0, 0);
        }

        if (!autoplay) {
          p.noLoop();
        }

        this.spawnStarterAgentsRandom(this.settings.startAgents);

        if (settings.imageDelay) {
          this.changeImageOnInterval();
        }
      };

      p.draw = () => {
        if (p.deltaTime > 200) {
          return;
        }
        if (this.settings.vanishRate) {
          p.background(
            this.settings.bg.r,
            this.settings.bg.g,
            this.settings.bg.b,
            this.settings.vanishRate
          );
        }

        for (let i = this.agents.length - 1; i >= 0; i--) {
          this.agents[i].update(p.deltaTime);
          this.agents[i].draw(p);
          if (this.agents[i].stopped) {
            this.agents.splice(i, 1);
            this.agentCount--;
          }
        }
      };
    };

    this.p5 = new p5(s, elementId);
  }

  calculateImages() {
    const width = this.settings.width;
    const height = this.settings.height;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    const dataImages = [];
    for (let i = 0; i < this.rawImages.length; i++) {
      context.drawImage(this.rawImages[i], 0, 0, width, height);
      dataImages[i] = context.getImageData(0, 0, width, height);
    }

    this.intensityMaps = [];
    for (let i = 0; i < dataImages.length; i++) {
      this.intensityMaps.push({
        width: width,
        height: height,
        data: ArtUtils.getImageIntensityMap(
          dataImages[i].data,
          dataImages[i].width,
          dataImages[i].height,
          this.settings.intensityMode
        ),
      });
    }

    this.integralImages = [];
    for (let i = 0; i < dataImages.length; i++) {
      this.integralImages.push({
        width: width,
        height: height,
        data: ArtUtils.calculateIntegralImageFromMap(
          this.intensityMaps[i].data,
          dataImages[i].width,
          dataImages[i].height,
          this.settings.intensityMode
        ),
      });
    }

    if (this.p5) {
      this.p5.resizeCanvas(width, height);
    }
  }

  getCurrentIntensityMap() {
    let curMap = this.intensityMaps[this.imageIndex];
    if (
      this.settings.width !== curMap.width ||
      this.settings.height !== curMap.height
    ) {
      this.calculateImages();
    }

    return this.intensityMaps[this.imageIndex].data;
  }

  getCurrentIntegralImage() {
    let curImage = this.integralImages[this.imageIndex];
    if (
      this.settings.width !== curImage.width ||
      this.settings.height !== curImage.height
    ) {
      this.calculateImages();
    }

    return this.integralImages[this.imageIndex].data;
  }

  playPause() {
    console.log("Agent Count: " + this.agentCount.toString());

    if (this.p5.isLooping()) {
      this.p5.noLoop();
      if (this.imageInterval) {
        clearInterval(this.imageInterval);
        this.imageInterval = null;
      }
    } else {
      this.p5.loop();
      if (this.settings.imageDelay) {
        this.changeImageOnInterval();
      }
    }
  }

  spawnStarterAgentsRandom(amount) {
    for (let i = 0; i < amount; i++) {
      this.spawnAgentRandom();
    }
  }

  spawnAgent(x, y, parent = null, angle = null) {
    if (parent === null) {
      parent = { x: x, y: y };
    }
    const newAgent = new Agent(x, y, parent, this, angle);
    this.agents.push(newAgent);
    this.agentCount++;

    if (!this.capped && this.agentCount > this.settings.maxAgents) {
      this.capped = true;
    }
  }

  spawnAgentRandom() {
    let random = Math.random();
    let pickedRadius = null;
    for (const spawnArea of LineArt.SPAWN_AREAS) {
      if (spawnArea.chance > random) {
        pickedRadius = spawnArea.radius;
        break;
      }
      random -= spawnArea.chance;
    }
    if (pickedRadius === null) {
      pickedRadius = LineArt.SPAWN_AREAS[0].radius;
    }

    const spawnWidth = this.settings.width * pickedRadius;
    const spawnHeight = this.settings.height * pickedRadius;

    const x = Math.floor(
      (this.settings.width - spawnWidth) / 2 + Math.random() * spawnWidth
    );
    const y = Math.floor(
      (this.settings.height - spawnHeight) / 2 + Math.random() * spawnHeight
    );
    this.spawnAgent(x, y);
  }

  intensityInRadius(x, y, draw = false) {
    x = Math.floor(x);
    y = Math.floor(y);
    let radius = this.settings.intensityRadius;
    let width = this.settings.width;
    let height = this.settings.height;
    let iimg = this.getCurrentIntegralImage();
    if (!iimg || !iimg.length) {
      return 0.1;
    }

    let topLeftX = Math.max(x - radius, 0);
    let topLeftY = Math.max(y - radius, 0);
    let bottomRightX = Math.min(x + radius, width - 1);
    let bottomRightY = Math.min(y + radius, height - 1);

    if (draw) {
      let color = this.settings.color;
      color[3] = 10;
      this.p5.stroke(...color);
      this.p5.rectMode(this.p5.CORNERS);
      this.p5.rect(topLeftX, topLeftY, bottomRightX, bottomRightY);
    }

    let sum = iimg[bottomRightX + bottomRightY * width];
    if (topLeftX > 0) sum -= iimg[topLeftX - 1 + bottomRightY * width];
    if (topLeftY > 0) sum -= iimg[bottomRightX + (topLeftY - 1) * width];
    if (topLeftX > 0 && topLeftY > 0)
      sum += iimg[topLeftX - 1 + (topLeftY - 1) * width];

    // console.log(sum);

    return (
      ArtUtils.inverseLerp(0, this.settings.maxIntensityInRadius, sum) **
      this.settings.contrast
    );
  }

  switchImage() {
    this.imageIndex = (this.imageIndex + 1) % this.images.length;
  }

  changeImageOnInterval() {
    this.imageInterval = setInterval(() => {
      this.switchImage();
    }, this.settings.imageDelay * 1000);
  }
}

class Agent {
  constructor(x, y, parent, artInstance, angle = null) {
    this.x = x;
    this.y = y;
    this.parent = parent;
    this.art = artInstance;
    this.lmin = this.art.settings.lineLengthRange[0];
    this.lmax = this.art.settings.lineLengthRange[1];

    this.angle = angle !== null ? angle : this.getAngleBasedOnColorInRadius();
  }

  draw() {
    const p5 = this.art.p5;
    const settings = this.art.settings;
    if (!p5 || !this.parent) return;

    const colorValue = this.art.intensityInRadius(this.x, this.y);

    // p5.stroke(
    //   settings.color[0],
    //   settings.color[1],
    //   settings.color[2],
    //   ArtUtils.lerp(1, settings.color[3], colorValue)
    // );

    p5.stroke(p5.lerpColor(settings.bgP5, settings.colorP5, colorValue));

    p5.strokeWeight(settings.lineWidth);
    p5.line(this.parent.x, this.parent.y, this.x, this.y);
    if (this.stopped) {
      p5.strokeWeight(settings.pointWidth);
      p5.point(this.x, this.y);
    }
  }

  update() {
    if (!this.art.p5) return;

    const settings = this.art.settings;
    const colorValue = this.art.intensityInRadius(this.x, this.y);

    const coef =
      settings.moveSpeed *
      ArtUtils.lerp(
        0.25,
        2,
        Math.pow(1 - colorValue, 1 + settings.moveSpeedContrast)
      ) *
      this.art.p5.deltaTime;

    this.x += Math.cos(this.angle) * coef;
    this.y += Math.sin(this.angle) * coef;

    let screenWidth = settings.width;
    let screenHeight = settings.height;
    if (
      this.x > screenWidth ||
      this.x < 0 ||
      this.y > screenHeight ||
      this.y < 0
    ) {
      this.stopped = true;
      this.art.spawnAgentRandom();
      return;
    }

    let distance = this.art.p5.dist(
      this.parent.x,
      this.parent.y,
      this.x,
      this.y
    );
    if (
      distance >
      ArtUtils.lerp(
        this.lmin,
        this.lmax,
        Math.pow(1 - colorValue, 1 + settings.lineLenContrast)
      )
    ) {
      this.stopped = true;
      this.branch(colorValue);
    }
  }

  branch(colorValue) {
    const newBranchCount = this.art.capped
      ? 1
      : Math.max(
          Math.floor(
            this.art.settings.branchiness * colorValue * Math.random() * 5
          ),
          1
        );

    for (let i = 0; i < newBranchCount; i++) {
      this.art.spawnAgent(this.x, this.y, this);
    }
  }

  getAngleBasedOnColorInRadius() {
    const currentImageIntMap = this.art.getCurrentIntensityMap();
    const sightRadius = this.art.settings.sightRadius;
    const width = this.art.settings.width;
    const height = this.art.settings.height;

    const { map: radiusIntMap, total: totalIntensity } =
      ArtUtils.getIntensityMapInRadius(
        currentImageIntMap,
        this.x,
        this.y,
        sightRadius,
        width,
        height
      );

    const weightedMapIndex = ArtUtils.getWeightedIndex(
      radiusIntMap,
      totalIntensity
    );
    const chosenY = Math.floor(weightedMapIndex / (2 * sightRadius + 1));
    const chosenX = weightedMapIndex % (2 * sightRadius + 1);

    // console.log(currentImageIntMap, radiusIntMap, weightedMapIndex, chosenX, chosenY)

    return Math.atan2(chosenY - sightRadius, chosenX - sightRadius);
  }
}

class ArtSettings {
  constructor(options = {}) {
    this.intensityMode = options.intensityMode || "light";
    this._width = options.width || 1000;
    this._height = options.height || 1000;
    this.showImage = options.showImage || false;
    this.fps = options.fps || 60;
    this.imageDelay = options.imageDelay || 0;

    const color = ArtUtils.hexToRgb(options.color || "#ff0000");
    this.color = { ...color, a: options.opacity || 30 };
    const bg = ArtUtils.hexToRgb(options.bg || "#000000");
    this.bg = { ...bg, a: options.bgOpacity || 100 };
    this.vanishRate = options.vanishRate !== null ? options.vanishRate : 0;

    this.startAgents = options.startAgents || 500;
    this.maxAgents = options.maxAgents || 1500;
    this.branchiness = options.branchiness || 0.5;
    this.moveSpeed = options.moveSpeed || 0.5;
    this.moveSpeedContrast = options.moveSpeedContrast || 0;

    this.lineLengthRange = [
      options.lineLenMin || 30,
      options.lineLenMax || 300,
    ];
    this.lineLenContrast = options.lineLenContrast || 2;
    this.intensityRadius = options.intensityRadius || 10;
    this.sightRadius = options.sightRadius || 30;
    this.contrast = options.contrast || 1;
    this.maxIntensityInRadius =
      (2 * this.intensityRadius) ** 2 * (options.brightness || 1);

    this.lineWidth = options.lineWidth || 1;
    this.pointWidth = options.pointWidth || 6;
  }

  get width() {
    return this._width === "full" ? window.innerWidth : this._width;
  }

  get height() {
    return this._height === "full" ? window.innerHeight : this._height;
  }
}

class ArtUtils {
  static clamp(a, min = 0, max = 1) {
    return Math.min(max, Math.max(min, a));
  }

  static lerp(a, b, t) {
    return a * (1 - t) + b * t;
  }

  static inverseLerp(a, b, v) {
    return this.clamp((v - a) / (b - a));
  }

  static combineLerp(min1, max1, min2, max2, val) {
    let t = this.inverseLerp(min1, max1, val);
    return this.lerp(min2, max2, t);
  }

  static randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  static randint(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static getImageIntensityMap(pixels, width, height, mode = "light") {
    const intensityMap = new Float32Array(width * height);

    if (mode === "light") {
      for (let i = 0; i < intensityMap.length; i++) {
        intensityMap[i] = pixels[i * 4] / 255.0;
      }
    } else {
      for (let i = 0; i < intensityMap.length; i++) {
        intensityMap[i] = 1 - pixels[i * 4] / 255.0;
      }
    }

    return intensityMap;
  }

  static getIntensityMapInRadius(
    imageIntensityMap,
    x,
    y,
    radius,
    width,
    height
  ) {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    const intensityMap = [];
    let total = 0;

    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const index = y * width + x;
          intensityMap.push(imageIntensityMap[index]);
          total += imageIntensityMap[index];
        } else {
          intensityMap.push(0);
        }
      }
    }

    return { map: intensityMap, total: total };
  }

  static getWeightedIndex(weights, total = null) {
    if (total === null) {
      total = weights.reduce((sum, weight) => sum + weight, 0);
    }
    let randomBreakpoint = Math.random() * total;

    for (let i = 0; i < weights.length; i++) {
      if (randomBreakpoint < weights[i]) {
        return i;
      }
      randomBreakpoint -= weights[i];
    }

    return Math.floor(Math.random() * weights.length);
  }

  static calculateIntegralImage(pixels, width, height) {
    let integral = [];
    for (let i = 0; i < width * height; i++) {
      integral.push(0);
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let index = x + y * width;

        let sum = pixels[index * 4];
        if (x > 0) sum += integral[index - 1];
        if (y > 0) sum += integral[index - width];
        if (x > 0 && y > 0) sum -= integral[index - 1 - width];

        integral[index] = sum;
      }
    }

    return integral;
  }

  static calculateIntegralImageFromMap(intensityMap, width, height) {
    const l = intensityMap.length;
    let integral = new Float32Array(l);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let index = x + y * width;

        let sum = intensityMap[index];
        if (x > 0) sum += integral[index - 1];
        if (y > 0) sum += integral[index - width];
        if (x > 0 && y > 0) sum -= integral[index - 1 - width];

        integral[index] = sum;
      }
    }

    return integral;
  }

  static hexToRgb(hex) {
    if (!hex) return;
    // Remove the hash character if it's included
    hex = hex.replace("#", "");

    // Convert the hexadecimal values to integers
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Return the RGB values as an object
    return { r, g, b };
  }
}
