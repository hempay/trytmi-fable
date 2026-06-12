/* ============================================================
   Trytmi — hero scene (classic script build, no modules)
   1. Breathing particle field with heartbeat ripples
   2. Floating 3D stethoscope, pulse-synced to the ripple
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("heroCanvas");
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (!canvas) return;
  if (prefersReduced || typeof THREE === "undefined") {
    canvas.style.background =
      "radial-gradient(ellipse 80% 60% at 50% 70%, rgba(46,230,168,0.12), transparent 70%)";
    return;
  }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
  } catch (e) {
    canvas.style.background =
      "radial-gradient(ellipse 80% 60% at 50% 70%, rgba(46,230,168,0.12), transparent 70%)";
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04100c, 0.04);

  var camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 4.2, 11);
  camera.lookAt(0, 0, 0);

  /* ============================================================
     1. Particle wave field
     ============================================================ */
  var COLS = isMobile ? 90 : 160;
  var ROWS = isMobile ? 60 : 100;
  var SPACING = 0.28;
  var COUNT = COLS * ROWS;

  var positions = new Float32Array(COUNT * 3);
  var seeds = new Float32Array(COUNT);
  var p = 0;
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      positions[p * 3 + 0] = (c - COLS / 2) * SPACING;
      positions[p * 3 + 1] = 0;
      positions[p * 3 + 2] = (r - ROWS / 2) * SPACING;
      seeds[p] = Math.random();
      p++;
    }
  }

  var geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

  var uniforms = {
    uTime: { value: 0 },
    uPulse: { value: 0 },
    uPulseRadius: { value: 0 },
    uPointScale: { value: isMobile ? 260 : 340 },
    uColorA: { value: new THREE.Color(0x2ee6a8) },
    uColorB: { value: new THREE.Color(0x1a8a66) }
  };

  var material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: [
      "uniform float uTime;",
      "uniform float uPulse;",
      "uniform float uPulseRadius;",
      "uniform float uPointScale;",
      "attribute float aSeed;",
      "varying float vGlow;",
      "void main() {",
      "  vec3 pos = position;",
      "  float d = length(pos.xz);",
      "  float wave =",
      "    sin(pos.x * 0.55 + uTime * 0.9) * 0.32 +",
      "    sin(pos.z * 0.7  - uTime * 0.7) * 0.26 +",
      "    sin((pos.x + pos.z) * 0.32 + uTime * 0.5) * 0.22;",
      "  float ring = exp(-pow((d - uPulseRadius) * 1.6, 2.0)) * uPulse;",
      "  pos.y = wave + ring * 1.4;",
      "  float tw = 0.65 + 0.35 * sin(uTime * (1.5 + aSeed * 2.0) + aSeed * 40.0);",
      "  vGlow = clamp(0.4 + ring * 2.2 + (pos.y + 0.8) * 0.22, 0.0, 1.0) * tw;",
      "  vec4 mv = modelViewMatrix * vec4(pos, 1.0);",
      "  gl_Position = projectionMatrix * mv;",
      "  gl_PointSize = (uPointScale / -mv.z) * (0.055 + aSeed * 0.05 + ring * 0.09);",
      "}"
    ].join("\n"),
    fragmentShader: [
      "uniform vec3 uColorA;",
      "uniform vec3 uColorB;",
      "varying float vGlow;",
      "void main() {",
      "  vec2 uv = gl_PointCoord - 0.5;",
      "  float dist = length(uv);",
      "  float alpha = smoothstep(0.5, 0.05, dist);",
      "  vec3 color = mix(uColorB, uColorA, vGlow);",
      "  gl_FragColor = vec4(color, alpha * (0.45 + vGlow * 0.55));",
      "}"
    ].join("\n")
  });

  var points = new THREE.Points(geometry, material);
  points.rotation.x = -0.08;
  scene.add(points);

  /* ============================================================
     2. Stethoscope — built procedurally from curves & primitives
     ============================================================ */
  var steth = new THREE.Group();

  var metalMat = new THREE.MeshStandardMaterial({
    color: 0xc9ded6, metalness: 0.85, roughness: 0.25
  });
  var darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x7fa898, metalness: 0.9, roughness: 0.35
  });
  var rubberMat = new THREE.MeshStandardMaterial({
    color: 0x0e6e4e, metalness: 0.1, roughness: 0.5
  });
  var diaphragmMat = new THREE.MeshStandardMaterial({
    color: 0xeafff6, metalness: 0.2, roughness: 0.6
  });
  var tipMat = new THREE.MeshStandardMaterial({
    color: 0x2ee6a8, metalness: 0.2, roughness: 0.45,
    emissive: 0x0d8f63, emissiveIntensity: 0.35
  });

  // --- chest piece (the part that will pulse) ---
  var chest = new THREE.Group();
  var bell = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.2, 48), metalMat);
  chest.add(bell);
  var rim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.05, 16, 48), darkMetalMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.06;
  chest.add(rim);
  var diaphragm = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.04, 48), diaphragmMat);
  diaphragm.position.y = 0.11;
  chest.add(diaphragm);
  var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 16), darkMetalMat);
  stem.position.y = 0.25;
  chest.add(stem);
  chest.position.set(0, -2.15, 0);
  chest.rotation.x = 0.55; // tilt diaphragm toward camera
  steth.add(chest);

  // --- main rubber tubing: elegant drape from chest to yoke ---
  var tubeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -1.95, 0.12),
    new THREE.Vector3(0.62, -1.55, 0.3),
    new THREE.Vector3(0.85, -0.75, 0.42),
    new THREE.Vector3(0.3, 0.05, 0.32),
    new THREE.Vector3(-0.42, 0.55, 0.12),
    new THREE.Vector3(0, 1.05, 0)
  ]);
  var tube = new THREE.Mesh(new THREE.TubeGeometry(tubeCurve, 80, 0.075, 14, false), rubberMat);
  steth.add(tube);

  // --- yoke + binaural metal tubes up to the ear tips ---
  var yoke = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 20), darkMetalMat);
  yoke.position.set(0, 1.05, 0);
  steth.add(yoke);

  function binaural(side) {
    var s = side; // -1 left, +1 right
    var curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.05, 0),
      new THREE.Vector3(s * 0.34, 1.38, 0.04),
      new THREE.Vector3(s * 0.54, 1.85, 0.1),
      new THREE.Vector3(s * 0.5, 2.25, 0.18)
    ]);
    var mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.05, 12, false), metalMat);
    steth.add(mesh);
    var tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 20), tipMat);
    tip.position.set(s * 0.46, 2.32, 0.22);
    steth.add(tip);
  }
  binaural(-1);
  binaural(1);

  scene.add(steth);

  /* ---- lighting ---- */
  scene.add(new THREE.HemisphereLight(0xbfffe8, 0x04100c, 0.55));
  var key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(5, 8, 6);
  scene.add(key);
  var rimLight = new THREE.DirectionalLight(0x2ee6a8, 0.9);
  rimLight.position.set(-6, 3, -4);
  scene.add(rimLight);
  var pulseLight = new THREE.PointLight(0x2ee6a8, 0.0, 12);
  scene.add(pulseLight);

  /* ---- responsive layout of the stethoscope ---- */
  var stethBase = { x: 0, y: 0, scale: 1 };
  function layout(aspect) {
    if (aspect > 1.05) {           // desktop / landscape: float right of headline
      stethBase.x = 5.1; stethBase.y = 1.3; stethBase.scale = 1.5;
    } else if (aspect > 0.75) {    // tablet portrait
      stethBase.x = 2.2; stethBase.y = 2.6; stethBase.scale = 1.15;
    } else {                       // phone: tucked into the top-right, smaller
      stethBase.x = 1.7; stethBase.y = 4.6; stethBase.scale = 0.62;
    }
    steth.scale.setScalar(stethBase.scale);
    pulseLight.position.set(stethBase.x, stethBase.y - 1.5 * stethBase.scale, 2.5);
  }

  /* ---- mouse parallax ---- */
  var target = { x: 0, y: 0 };
  var eased = { x: 0, y: 0 };
  if (window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener("mousemove", function (e) {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  /* ---- resize ---- */
  function resize() {
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    layout(w / h);
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  /* ---- pause rendering when hero is off-screen ---- */
  var visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(canvas);
  }

  /* ---- heartbeat: lub-dub every ~2.4s ---- */
  var BEAT_PERIOD = 2.4;
  function heartbeat(t) {
    var phase = (t % BEAT_PERIOD) / BEAT_PERIOD;
    var lub = Math.exp(-Math.pow((phase - 0.04) * 18.0, 2));
    var dub = Math.exp(-Math.pow((phase - 0.22) * 18.0, 2)) * 0.6;
    return Math.min(1, lub + dub);
  }

  var clock = new THREE.Clock();

  function tick() {
    requestAnimationFrame(tick);
    if (!visible || document.hidden) return;

    var t = clock.getElapsedTime();
    uniforms.uTime.value = t;

    var beat = heartbeat(t);
    uniforms.uPulse.value = beat;
    uniforms.uPulseRadius.value = ((t % BEAT_PERIOD) / BEAT_PERIOD) * 14;

    // stethoscope: gentle sway + float + heartbeat pulse on the chest piece
    steth.position.x = stethBase.x;
    steth.position.y = stethBase.y + Math.sin(t * 0.8) * 0.18;
    steth.rotation.y = Math.sin(t * 0.35) * 0.45 - 0.15;
    steth.rotation.z = Math.sin(t * 0.5) * 0.06;
    var chestScale = 1 + beat * 0.09;
    chest.scale.setScalar(chestScale);
    pulseLight.intensity = beat * 2.2;

    eased.x += (target.x - eased.x) * 0.04;
    eased.y += (target.y - eased.y) * 0.04;
    camera.position.x = eased.x * 1.4;
    camera.position.y = 4.2 - eased.y * 0.7;
    camera.lookAt(0, 0.6, 0);

    renderer.render(scene, camera);
  }
  tick();
})();
