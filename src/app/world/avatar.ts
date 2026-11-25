import * as THREE from 'three';
import { box, cyl, invisibleHit, mat, mulberry32, sphere, tag } from './util';

/* Paleta tomada de la foto de referencia. */
const SKIN = 0xd9ad90;
const SKIN_SHADE = 0xc79a7e;
const LIPS = 0xc99484;
const HAIR = 0x34251c;
const HAIR_LIGHT = 0x4d3626;
const BLAZER = 0x111216;
const BLAZER_LAPEL = 0x1a1c22;
const TEE = 0xf3f3f0;
const PANTS = 0x23262e;
const SILVER = 0xd7dce3;

const HEAD_CENTER = new THREE.Vector3(0, 1.265, 0);
const UP = new THREE.Vector3(0, 1, 0);
const FWD = new THREE.Vector3(0, 0, 1);

interface EyeRig {
  group: THREE.Group;
  iris: THREE.Group;
}

/**
 * Avatar estilizado (low-poly suave) sentado en una silla.
 * Mira hacia +Z en su propio sistema de coordenadas; su izquierda es +X.
 */
export class Avatar {
  readonly group = new THREE.Group();
  /** Zonas tocables: ojos y cabeza. */
  readonly hitboxes: THREE.Object3D[] = [];

  private readonly headPivot = new THREE.Group();
  private readonly headGroup = new THREE.Group();
  private readonly hair = new THREE.Group();
  private readonly brows = new THREE.Group();
  private readonly eyes: EyeRig[] = [];
  private readonly mouthCorners: THREE.Mesh[] = [];
  private mouthLine!: THREE.Mesh;
  private torso!: THREE.Mesh;

  private rightUpper!: THREE.Mesh;
  private rightFore!: THREE.Mesh;
  private rightElbow!: THREE.Mesh;
  private rightHand!: THREE.Mesh;
  private leftUpper!: THREE.Mesh;
  private leftFore!: THREE.Mesh;
  private leftElbow!: THREE.Mesh;
  private leftHand!: THREE.Mesh;

  private yaw = 0;
  private pitch = 0;
  private eyeYaw = 0;
  private eyePitch = 0;
  private blinkClock = 2;
  private blinkT = -1;
  private pokeT = 99;
  private ruffleT = 99;

  private readonly rand = mulberry32(20261109);
  private readonly tmp = new THREE.Vector3();

  /** @param mouseWorld Posición (mundo) donde descansa su mano derecha. */
  constructor(private readonly mouseWorld: THREE.Vector3) {
    this.buildBody();
    this.buildLegs();
    this.buildHead();
    this.buildHair();
    this.buildChair();
    this.buildArms();

    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && !mesh.userData['noShadow']) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }

  /** Reacción al tocar los ojos: parpadeo doble, cejas arriba y sonrisa. */
  poke(): void {
    this.pokeT = 0;
  }

  /** Reacción al tocar el pelo. */
  ruffle(): void {
    this.ruffleT = 0;
  }

  /** Posición mundial del centro de la cabeza (para la cámara). */
  headWorld(out: THREE.Vector3): THREE.Vector3 {
    return this.group.localToWorld(out.copy(HEAD_CENTER));
  }

  update(dt: number, time: number, lookAt: THREE.Vector3): void {
    this.group.updateMatrixWorld(true);

    /* Hacia dónde mira, en coordenadas locales. */
    this.tmp.copy(lookAt);
    this.group.worldToLocal(this.tmp);
    this.tmp.sub(HEAD_CENTER);
    const flat = Math.hypot(this.tmp.x, this.tmp.z);
    let wantYaw = Math.atan2(this.tmp.x, this.tmp.z);
    const wantPitch = Math.atan2(this.tmp.y, flat);

    // Si el objetivo queda detrás, mira hacia delante en vez de girar el cuello al revés.
    if (Math.abs(wantYaw) > 2.2) {
      wantYaw = 0;
    }

    const headYaw = THREE.MathUtils.clamp(wantYaw * 0.72, -1.05, 1.05) + Math.sin(time * 0.5) * 0.02;
    const headPitch = THREE.MathUtils.clamp(wantPitch * 0.6, -0.4, 0.35);
    const k = 1 - Math.exp(-dt * 7);

    this.yaw += (headYaw - this.yaw) * k;
    this.pitch += (headPitch - this.pitch) * k;
    this.headGroup.rotation.set(-this.pitch, this.yaw, 0);

    const eyeYawWant = THREE.MathUtils.clamp(wantYaw - this.yaw, -0.6, 0.6);
    const eyePitchWant = THREE.MathUtils.clamp(wantPitch - this.pitch, -0.35, 0.35);
    const ke = 1 - Math.exp(-dt * 14);
    this.eyeYaw += (eyeYawWant - this.eyeYaw) * ke;
    this.eyePitch += (eyePitchWant - this.eyePitch) * ke;

    /* Reacciones. */
    this.pokeT += dt;
    this.ruffleT += dt;
    const pokeU = THREE.MathUtils.clamp(this.pokeT / 1.8, 0, 1);
    const env = this.pokeT < 1.8 ? Math.sin(pokeU * Math.PI) : 0;
    const pokeBlink =
      this.pokeT < 0.9 ? (1 - Math.cos((this.pokeT / 0.9) * Math.PI * 4)) / 2 : 0;

    /* Parpadeo natural. */
    this.blinkClock -= dt;
    if (this.blinkClock <= 0 && this.blinkT < 0) {
      this.blinkT = 0;
      this.blinkClock = 2.2 + this.rand() * 3.6;
    }
    let blink = 0;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      const p = this.blinkT / 0.2;
      blink = p < 1 ? Math.sin(p * Math.PI) : 0;
      if (p >= 1) {
        this.blinkT = -1;
      }
    }
    blink = Math.max(blink, pokeBlink);

    const openness = Math.max(0.05, 0.62 * (1 - blink) + env * 0.22);
    for (const eye of this.eyes) {
      eye.group.scale.y = openness;
      eye.iris.rotation.set(-this.eyePitch, this.eyeYaw, 0);
    }

    this.brows.position.y = env * 0.012;
    const smile = 0.25 + 0.75 * env;
    for (const corner of this.mouthCorners) {
      const side = Math.sign(corner.position.x);
      corner.position.set(side * (0.023 + smile * 0.005), -0.0855 + smile * 0.008, 0.097);
    }
    this.mouthLine.scale.x = 1 + smile * 0.35;

    /* Pelo: sacudida al tocarlo. */
    const ru = THREE.MathUtils.clamp(this.ruffleT / 1.2, 0, 1);
    const shake = this.ruffleT < 1.2 ? Math.sin(this.ruffleT * 22) * 0.06 * (1 - ru) : 0;
    this.hair.rotation.set(0, 0, shake);
    this.hair.position.y = this.ruffleT < 1.2 ? Math.sin(ru * Math.PI) * 0.012 : 0;

    /* Respiración. */
    const breath = Math.sin(time * 1.6);
    this.torso.scale.y = 1 + breath * 0.006;
    this.headPivot.position.y = 1.045 + breath * 0.0025;

    this.updateArms(time);
  }

  /* ---------------------------------------------------------------- */
  /* Construcción                                                      */
  /* ---------------------------------------------------------------- */

  private buildBody(): void {
    const blazer = mat(BLAZER, 0.9);
    const lapel = mat(BLAZER_LAPEL, 0.85);
    const tee = mat(TEE, 0.9);
    const skin = mat(SKIN, 0.8);

    // Torso (americana).
    this.torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.185, 0.52, 28), blazer);
    this.torso.position.set(0, 0.78, 0);
    this.torso.scale.z = 0.62;
    this.group.add(this.torso);

    // Cadera.
    const hips = sphere(0.19, mat(PANTS, 0.9), 0, 0.55, 0.01, 1, 0.55, 0.78);
    this.group.add(hips);

    // Camiseta blanca en V.
    const v = new THREE.Shape();
    v.moveTo(-0.07, 1.0);
    v.lineTo(0.07, 1.0);
    v.lineTo(0, 0.7);
    v.closePath();
    const vNeck = new THREE.Mesh(new THREE.ShapeGeometry(v), tee);
    vNeck.position.z = 0.122;
    vNeck.userData['noShadow'] = true;
    this.group.add(vNeck);

    // Solapas.
    const lapelR = box(0.065, 0.34, 0.022, lapel, 0.1, 0.855, 0.126);
    lapelR.rotation.z = -0.24;
    const lapelL = box(0.065, 0.34, 0.022, lapel, -0.1, 0.855, 0.126);
    lapelL.rotation.z = 0.24;
    this.group.add(lapelR, lapelL);

    // Cuello y cuello de la camiseta.
    this.group.add(cyl(0.056, 0.062, 0.17, skin, 0, 1.06, 0.005, 16));
    // Trapecios: unen el cuello con los hombros.
    this.group.add(sphere(0.07, blazer, 0, 1.0, -0.01, 1.9, 0.55, 0.95));
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.063, 0.012, 10, 24), tee);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 1.03, 0.006);
    this.group.add(collar);

    // Hombros acolchados.
    this.group.add(sphere(0.075, blazer, 0.205, 0.975, 0), sphere(0.075, blazer, -0.205, 0.975, 0));
  }

  private buildLegs(): void {
    const pants = mat(PANTS, 0.9);
    const shoe = mat(0xe9e9e6, 0.7);
    const sole = mat(0x15161a, 0.9);
    for (const s of [-1, 1]) {
      const hip = new THREE.Vector3(s * 0.1, 0.56, 0.02);
      const knee = new THREE.Vector3(s * 0.115, 0.58, 0.44);
      const foot = new THREE.Vector3(s * 0.12, 0.1, 0.5);

      const thigh = this.limb(0.078, pants);
      Avatar.place(thigh, hip, knee);
      const shin = this.limb(0.058, pants);
      Avatar.place(shin, knee, foot);
      this.group.add(sphere(0.078, pants, knee.x, knee.y, knee.z));

      const shoeMesh = box(0.1, 0.07, 0.22, shoe, s * 0.12, 0.065, 0.56);
      const soleMesh = box(0.104, 0.025, 0.226, sole, s * 0.12, 0.02, 0.56);
      this.group.add(shoeMesh, soleMesh);
    }
  }

  private buildHead(): void {
    const skin = mat(SKIN, 0.78);
    const shade = mat(SKIN_SHADE, 0.8);

    this.headPivot.position.set(0, 1.045, 0);
    this.group.add(this.headPivot);
    this.headGroup.position.set(0, 0.2, 0);
    this.headGroup.scale.setScalar(1.1);
    this.headPivot.add(this.headGroup);
    const head = this.headGroup;

    // Cabeza de una sola malla: cráneo arriba, mandíbula más estrecha abajo y barba como degradado.
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, vertexColors: true });
    head.add(new THREE.Mesh(Avatar.headGeometry(), headMat));

    // Nariz.
    head.add(sphere(0.0155, shade, 0, -0.03, 0.108, 0.85, 1.05, 1.0));
    head.add(sphere(0.0095, shade, 0, -0.043, 0.115, 1.25, 0.9, 1));
    const nostril = mat(0x5a3a30, 1);
    head.add(sphere(0.005, nostril, 0.009, -0.049, 0.122, 1, 0.7, 0.6));
    head.add(sphere(0.005, nostril, -0.009, -0.049, 0.122, 1, 0.7, 0.6));

    // Orejas y aro plateado en la oreja izquierda del avatar (+X), como en la foto.
    head.add(sphere(0.026, skin, 0.108, -0.005, -0.006, 0.45, 1, 0.8));
    head.add(sphere(0.026, skin, -0.108, -0.005, -0.006, 0.45, 1, 0.8));
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.0115, 0.0028, 8, 20),
      mat(SILVER, 0.3, 0.35),
    );
    ring.position.set(0.116, -0.04, 0.004);
    ring.rotation.y = 0.9;
    head.add(ring);

    // Ojos.
    const white = new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.4 });
    const iris = mat(0x2d1b12, 0.4);
    const pupil = new THREE.MeshBasicMaterial({ color: 0x050403 });
    const glint = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lash = mat(0x241711, 0.9);
    for (const s of [1, -1]) {
      const eye = new THREE.Group();
      eye.position.set(s * 0.046, 0.022, 0.092);
      eye.add(sphere(0.02, white, 0, 0, 0, 1, 1, 0.7));

      const irisGroup = new THREE.Group();
      irisGroup.add(sphere(0.0125, iris, 0, 0, 0.0135, 1, 1, 0.35));
      irisGroup.add(sphere(0.0065, pupil, 0, 0, 0.0165, 1, 1, 0.3));
      irisGroup.add(sphere(0.0022, glint, 0.0045, 0.0045, 0.0192, 1, 1, 0.5));
      eye.add(irisGroup);

      eye.add(box(0.046, 0.0045, 0.008, lash, 0, 0.0185, 0.01));
      head.add(eye);
      this.eyes.push({ group: eye, iris: irisGroup });

      // Zona tocable alrededor del ojo.
      const hit = invisibleHit(new THREE.SphereGeometry(0.045, 12, 8));
      hit.position.copy(eye.position);
      hit.position.z += 0.02;
      tag(hit, 'eyes');
      hit.userData['noShadow'] = true;
      head.add(hit);
      this.hitboxes.push(hit);
    }

    // Cejas.
    const browMat = mat(0x3a2a20, 0.95);
    head.add(this.brows);
    for (const s of [1, -1]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.0075, 0.01), browMat);
      this.placeOnHead(b, s * 0.047, 0.064, 0.0015);
      b.rotateZ(s * 0.07);
      this.brows.add(b);
    }

    // Boca: labio superior, inferior y comisuras que suben al sonreír.
    const lipUp = mat(LIPS, 0.6);
    const lipLow = mat(0xcf9188, 0.6);
    head.add(sphere(0.015, lipUp, 0, -0.0815, 0.099, 1.5, 0.36, 0.55));
    head.add(sphere(0.016, lipLow, 0, -0.0895, 0.099, 1.3, 0.42, 0.55));
    this.mouthLine = box(0.032, 0.002, 0.004, mat(0x6e3a34, 0.8), 0, -0.0853, 0.1065);
    head.add(this.mouthLine);
    for (const s of [1, -1]) {
      const c = sphere(0.004, lipUp, s * 0.023, -0.0855, 0.097);
      this.mouthCorners.push(c);
      head.add(c);
    }

    // Zona tocable de toda la cabeza (pelo).
    const headHit = invisibleHit(new THREE.SphereGeometry(0.14, 16, 12));
    headHit.position.set(0, 0.01, -0.005);
    headHit.scale.set(0.95, 1.1, 1);
    tag(headHit, 'head');
    headHit.userData['noShadow'] = true;
    head.add(headHit);
    this.hitboxes.push(headHit);
  }

  /** Pelo castaño oscuro, flequillo caído y mechas desordenadas con puntas más claras. */
  private buildHair(): void {
    const head = this.headGroup;
    head.add(this.hair);
    const dark = mat(HAIR, 0.95);
    const light = mat(HAIR_LIGHT, 0.95);

    // Casquete: cubre coronilla y nuca, deja libre la cara.
    const capGeo = new THREE.SphereGeometry(0.1265, 32, 20, 0, Math.PI * 2, 0, (Math.PI * 74) / 180);
    capGeo.rotateX(-0.42);
    const cap = new THREE.Mesh(capGeo, dark);
    cap.scale.set(0.97, 1.1, 1.03);
    this.hair.add(cap);

    // Flequillo: mechas que caen sobre la frente, barridas hacia un lado.
    const fringeGeo = new THREE.ConeGeometry(0.0165, 0.06, 8);
    fringeGeo.rotateX(Math.PI);
    for (let i = 0; i < 11; i++) {
      const x = -0.092 + i * 0.0184;
      const strand = new THREE.Mesh(fringeGeo, i % 3 === 1 ? light : dark);
      strand.scale.set(1, 1, 0.45);
      this.placeOnHead(strand, x, 0.09 - Math.abs(x) * 0.2, 0.003 + (i % 2) * 0.003);
      strand.rotateZ(-0.35 + this.rand() * 0.25 - x * 2.2);
      this.hair.add(strand);
    }

    // Mechones redondeados y alargados que se solapan como tejas: volumen desordenado, sin picos.
    const clumpGeo = new THREE.SphereGeometry(0.034, 14, 10);
    const dir = new THREE.Vector3();
    for (let i = 0; i < 34; i++) {
      const polar = 0.1 + this.rand() * 1.05;
      const azimuth = this.rand() * Math.PI * 2;
      dir.set(
        Math.sin(polar) * Math.cos(azimuth),
        Math.cos(polar),
        Math.sin(polar) * Math.sin(azimuth) * 0.9 + 0.1,
      ).normalize();
      const clump = new THREE.Mesh(clumpGeo, this.rand() > 0.72 ? light : dark);
      clump.scale.set(1, 0.55, 1.5);
      const p = new THREE.Vector3(dir.x * 0.108, dir.y * 0.123 - 0.004, dir.z * 0.115);
      clump.position.copy(p).addScaledVector(dir, 0.012);
      clump.quaternion.setFromUnitVectors(UP, dir);
      clump.rotateY(this.rand() * Math.PI);
      this.hair.add(clump);
    }

    // Unas pocas mechas sueltas con la punta hacia delante, para el aire despeinado.
    const flickGeo = new THREE.ConeGeometry(0.014, 0.05, 7);
    for (let i = 0; i < 7; i++) {
      const polar = 0.2 + this.rand() * 0.7;
      const azimuth = (this.rand() - 0.5) * 2.4 + Math.PI / 2;
      dir.set(Math.sin(polar) * Math.cos(azimuth), Math.cos(polar), Math.sin(polar) * Math.sin(azimuth)).normalize();
      const flick = new THREE.Mesh(flickGeo, i % 2 === 0 ? light : dark);
      flick.position.set(dir.x * 0.112, dir.y * 0.126 - 0.004, dir.z * 0.118);
      flick.quaternion.setFromUnitVectors(UP, dir.clone().add(new THREE.Vector3(0, 0, 0.9)).normalize());
      this.hair.add(flick);
    }
  }

  private buildChair(): void {
    const fabric = mat(0x2b2f3a, 0.95);
    const metal = mat(0x14161b, 0.5, 0.3);
    this.group.add(box(0.5, 0.07, 0.5, fabric, 0, 0.47, 0.0));
    const back = box(0.46, 0.55, 0.07, fabric, 0, 0.8, -0.27);
    back.rotation.x = -0.12;
    this.group.add(back);
    this.group.add(cyl(0.03, 0.03, 0.34, metal, 0, 0.27, 0, 12));
    for (let i = 0; i < 5; i++) {
      const arm = box(0.34, 0.035, 0.05, metal, 0, 0.09, 0);
      const holder = new THREE.Group();
      holder.rotation.y = (i / 5) * Math.PI * 2;
      arm.position.x = 0.17;
      holder.add(arm);
      holder.add(sphere(0.028, metal, 0.33, 0.05, 0));
      this.group.add(holder);
    }
  }

  private buildArms(): void {
    const blazer = mat(BLAZER, 0.9);
    const skin = mat(SKIN, 0.8);
    this.rightUpper = this.limb(0.052, blazer);
    this.rightFore = this.limb(0.045, blazer);
    this.leftUpper = this.limb(0.052, blazer);
    this.leftFore = this.limb(0.045, blazer);
    this.rightElbow = sphere(0.052, blazer);
    this.leftElbow = sphere(0.052, blazer);
    this.rightHand = sphere(0.038, skin, 0, 0, 0, 1, 0.7, 1.25);
    this.leftHand = sphere(0.038, skin, 0, 0, 0, 1, 0.7, 1.25);
    this.group.add(this.rightElbow, this.leftElbow, this.rightHand, this.leftHand);
  }

  /* ---------------------------------------------------------------- */
  /* Utilidades                                                        */
  /* ---------------------------------------------------------------- */

  private updateArms(time: number): void {
    // Brazo derecho (-X local) sobre el ratón.
    const shoulderR = new THREE.Vector3(-0.205, 0.97, 0);
    this.tmp.copy(this.mouseWorld);
    this.group.worldToLocal(this.tmp);
    this.tmp.y += 0.035;
    this.tmp.x += Math.sin(time * 1.3) * 0.008;
    this.tmp.z += Math.cos(time * 0.9) * 0.008;
    this.solveArm(
      shoulderR,
      this.tmp,
      new THREE.Vector3(-0.5, -1, -0.35),
      this.rightUpper,
      this.rightFore,
      this.rightElbow,
      this.rightHand,
    );

    // Brazo izquierdo (+X local) apoyado en el muslo.
    const shoulderL = new THREE.Vector3(0.205, 0.97, 0);
    const handL = new THREE.Vector3(0.17, 0.68, 0.3);
    this.solveArm(
      shoulderL,
      handL,
      new THREE.Vector3(0.6, -1, -0.2),
      this.leftUpper,
      this.leftFore,
      this.leftElbow,
      this.leftHand,
    );
  }

  private solveArm(
    shoulder: THREE.Vector3,
    handTarget: THREE.Vector3,
    pole: THREE.Vector3,
    upper: THREE.Mesh,
    fore: THREE.Mesh,
    elbowMesh: THREE.Mesh,
    handMesh: THREE.Mesh,
  ): void {
    const l1 = 0.3;
    const l2 = 0.27;
    const toHand = new THREE.Vector3().subVectors(handTarget, shoulder);
    const d = THREE.MathUtils.clamp(toHand.length(), Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.005);
    const dir = toHand.normalize();
    const hand = shoulder.clone().addScaledVector(dir, d);
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const perp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
    const elbow = shoulder.clone().addScaledVector(dir, a).addScaledVector(perp, h);

    Avatar.place(upper, shoulder, elbow);
    Avatar.place(fore, elbow, hand);
    elbowMesh.position.copy(elbow);
    handMesh.position.copy(hand);
    handMesh.quaternion.setFromUnitVectors(FWD, new THREE.Vector3().subVectors(hand, elbow).normalize());
  }

  private limb(radius: number, material: THREE.Material): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.9, 1, 14), material);
    this.group.add(m);
    return m;
  }

  private static place(limb: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3): void {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = Math.max(dir.length(), 1e-4);
    limb.position.copy(a).addScaledVector(dir, 0.5);
    limb.scale.set(1, len, 1);
    limb.quaternion.setFromUnitVectors(UP, dir.divideScalar(len));
  }

  /** Cabeza ovoide: mandíbula más estrecha, barbilla adelantada y barba de pocos días en los vértices. */
  private static headGeometry(): THREE.SphereGeometry {
    const geo = new THREE.SphereGeometry(0.115, 56, 36);
    const pos = geo.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color(SKIN);
    const dark = new THREE.Color(0x5a4234);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i) * 0.95;
      let y = pos.getY(i) * 1.08;
      let z = pos.getZ(i);
      const f = THREE.MathUtils.smoothstep(-y, 0, 0.12);
      x *= 1 - 0.1 * f;
      y -= 0.008 * f;
      z += 0.014 * f * Math.max(0, z / 0.115);
      pos.setXYZ(i, x, y, z);

      const t = THREE.MathUtils.smoothstep(-y, 0.035, 0.12);
      c.copy(base).lerp(dark, 0.34 * t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }

  /** Coloca un objeto sobre la superficie del cráneo, con su eje +Z mirando hacia fuera. */
  private placeOnHead(mesh: THREE.Object3D, x: number, y: number, lift: number): void {
    const a = 0.115 * 0.95;
    const b = 0.115 * 1.08;
    const c = 0.115;
    const z = c * Math.sqrt(Math.max(0.02, 1 - (x / a) ** 2 - (y / b) ** 2));
    const normal = new THREE.Vector3(x / (a * a), y / (b * b), z / (c * c)).normalize();
    mesh.position.set(x, y, z).addScaledVector(normal, lift);
    mesh.quaternion.setFromUnitVectors(FWD, normal);
  }
}
