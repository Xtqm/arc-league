import * as THREE from '../../vendor/three.module.js';
import { state, player } from '../core/state.js';
import { config } from '../core/config.js';
import { scene, camera } from '../graphics/scene.js';
import { makeDisc, tmp, _discMat, _fwd, _r0, _u0, _uBank, _rBank, _localX, _localY } from '../graphics/materials.js';
import { RibbonTrail } from '../graphics/RibbonTrail.js';
import { burst, isParticlesEnabled, trackFadingRibbon } from '../graphics/particles.js';
import { shake } from '../ui/UIManager.js';
import { lineOfSight } from '../physics/collision.js';
import { getTileAt, triggerTileWarning, pillars, sectorHazardBuilder } from './Arena.js';
import { onTileDestabilizedByHost } from '../network/sync.js';
import { damagePlayer } from './Player.js';
import { SFX } from '../audio/sfx.js';
import { getRoomRef, roomUpdateDoc } from '../network/firebaseSetup.js';
import { cosmeticMaterialEngine, disposeHierarchy } from '../armory/CosmeticMaterialEngine.js';
import { duelEconomyBridge } from '../modes/DuelEconomyBridge.js';
import { playGamepadHaptics } from '../input/gamepad.js';
import { campaignManager } from '../campaign/CampaignManager.js';
import { BotCombatBrain } from '../ai/BotCombatBrain.js';
import { dynamicDirector } from '../ai/DynamicDirector.js';

export function applyDamageToTarget(f, dmg, D) {
  const isGuardCrush = D && (D.charge || 0) >= 0.85;
  if (f.bossController) {
    if (isGuardCrush) {
      f.hp -= dmg;
      burst(D.pos.clone(), config.WHITE, 32, 12);
      shake(0.35);
      state.lastCombatEvent = 'GUARD_CRUSH';
      if (SFX.guardCrush) SFX.guardCrush();
      playGamepadHaptics({ duration: 180, weakMagnitude: 0.8, strongMagnitude: 1.0 });
      return f.hp <= 0;
    }
    const res = f.bossController.onHit(dmg, D);
    if (res.absorbed) {
      burst(D.pos.clone(), f.bossController.primaryColor || config.ORANGE, 24, 8);
      shake(0.2);
      state.lastCombatEvent = res.invulnerable ? 'EVADED' : 'SHIELD_HIT';
      return f.hp <= 0;
    }
  } else {
    f.hp -= dmg;
  }
  return f.hp <= 0;
}

export function setDiscVisualColor(D, primaryHex, secondaryHex = primaryHex) {
  if (!D) return;
  D.color = primaryHex;
  if (D.obj) {
    D.obj.traverse((o) => {
      if (o.material && o.material.color) o.material.color.setHex(primaryHex);
      if (o.material && o.material.emissive) o.material.emissive.setHex(primaryHex);
      if (o.isPointLight) o.color.setHex(primaryHex);
    });
  }
  if (D.trail) {
    D.trail.setColors(primaryHex, secondaryHex);
  }
}

export function disposeDiscEntity(D) {
  if (!D) return;
  if (D.trail) {
    trackFadingRibbon(D.trail, 0.24);
    D.trail = null;
  }
  if (D.obj) {
    scene.remove(D.obj);
    disposeHierarchy(D.obj);
  }
}

export function spawnDisc(pos, vel, owner, color, curve = 0, charge = 0) {
  const obj = makeDisc(color);
  obj.position.copy(pos);
  scene.add(obj);
  let cosmetics = null;
  if (owner === 'player') {
    cosmetics = cosmeticMaterialEngine.getTrailConfig();
    cosmeticMaterialEngine.applyDiscSkin(obj, cosmeticMaterialEngine.activeDiscSkinId);
  }
  const clCharge = THREE.MathUtils.clamp(charge || 0, 0, 1);

  let trail = null;
  if (isParticlesEnabled()) {
    const trailPrimary = cosmetics ? cosmetics.primaryColor : new THREE.Color(color);
    const trailSecondary = cosmetics
      ? cosmetics.secondaryColor
      : new THREE.Color(color).multiplyScalar(0.55);
    const trailOpacity = cosmetics ? cosmetics.opacity : 0.85;
    trail = new RibbonTrail({
      primaryColor: trailPrimary,
      secondaryColor: trailSecondary,
      opacity: trailOpacity,
      width: 0.44 + clCharge * 0.14,
      maxPoints: 26,
      minDistance: 0.18,
      hdrBoost: 1.9
    });
    trail.pushPoint(pos, vel, camera?.position || null);
    scene.add(trail.mesh);
  }

  const d = {
    obj,
    trail,
    pos: pos.clone(),
    vel: vel.clone(),
    launchY: pos.y,
    owner,
    originalOwner: owner,
    color,
    cosmetics,
    bounces: 0,
    deflectBounces: 0,
    deflectTime: 0,
    isDeflected: false,
    t: 0,
    returning: false,
    spin: 0,
    curve,
    initialCurve: Math.abs(curve || 0),
    charge: clCharge,
    hitFoes: new Set()
  };
  state.discs.push(d);
  return d;
}

export function updateDiscs(dt) {
  for (let i = state.discs.length - 1; i >= 0; i--) {
    if (i >= state.discs.length) continue;
    const D = state.discs[i];
    if (!D) continue;
    D.t += dt;
    D.spin += dt * 26;

    const holder = D.owner === 'player' ? player : D.owner;
    let holderAlive = false;
    if (D.owner === 'player') holderAlive = state.player.alive;
    else if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
      if (D.owner && D.owner.alive !== undefined) holderAlive = D.owner.alive;
    } else {
      holderAlive = state.foes.includes(D.owner);
    }

    if (!holderAlive) {
      disposeDiscEntity(D);
      state.discs.splice(i, 1);
      continue;
    }

    // Deflection miss handling
    if (D.isDeflected) {
      D.deflectTime = (D.deflectTime || 0) + dt;
      const isMultiMode = state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi';
      const deflectExpired = isMultiMode
        ? (D.deflectTime >= 1.5)
        : (D.deflectTime >= 1.5 || (D.deflectBounces || 0) >= 2);
      if (deflectExpired && !D.returning) {
        D.isDeflected = false;
        D.returning = true;
        if (isMultiMode && D.originalOwner === 'player') {
          D.owner = 'player';
          setDiscVisualColor(D, config.CYAN, 0x0088aa);
        } else {
          const targetFoe = (D.originalOwner && (state.foes.includes(D.originalOwner) || (isMultiMode && D.originalOwner.alive !== undefined)))
            ? D.originalOwner
            : (state.foes[0] || null);
          if (targetFoe) {
            D.owner = targetFoe;
            setDiscVisualColor(D, config.ORANGE, 0x993300);
          }
        }
      }
    }

    if (!D.returning && !D.isDeflected && (D.t > 1.5 || D.bounces >= 3)) D.returning = true;

    if (D.returning) {
      const home = holder.pos.clone().setY(1.7 + (holder.y || 0));
      const dir = home.sub(D.pos);
      const L = dir.length();
      dir.normalize();
      D.vel.lerp(dir.multiplyScalar(34), 1 - Math.pow(.0005, dt));
      if (L < 1.4) {
        if (D.owner === 'player') {
          state.player.hasDisc = true;
          SFX.catchDisc();
        } else if (D.owner) {
          D.owner.hasDisc = true;
          if (D.owner.obj && D.owner.obj.userData && D.owner.obj.userData.backDisc) {
            D.owner.obj.userData.backDisc.visible = true;
          }
        }
        disposeDiscEntity(D);
        state.discs.splice(i, 1);
        continue;
      }
    } else if (D.curve) {
      const vx = D.vel.x, vz = D.vel.z;
      // 2D horizontal Magnus normalization
      const hSpeed = Math.hypot(vx, vz);
      if (hSpeed > 1e-4) {
        const nx = -vz / hSpeed;
        const nz = vx / hSpeed;
        const latAcc = D.curve * config.CURVE_ACCEL * dt;
        let nvx = vx + nx * latAcc;
        let nvz = vz + nz * latAcc;
        const newHSpeed = Math.hypot(nvx, nvz);
        if (newHSpeed > 1e-4) {
          const s = hSpeed / newHSpeed;
          D.vel.x = nvx * s;
          // vy preserved in horizontal Magnus normalization
          D.vel.z = nvz * s;
        }
      }
      D.curve *= Math.exp(-config.CURVE_LAMBDA * dt);
    }

    D.pos.addScaledVector(D.vel, dt);
    if (!D.returning && D.pos.y > config.DISC_R) {
      const isDownwardFlight = D.bounces === 0 && D.vel.y < -0.2;
      if (!isDownwardFlight) {
        const cruiseY = D.launchY !== undefined ? D.launchY : 1.7;
        D.pos.y += (cruiseY - D.pos.y) * Math.min(1, dt * 2.2);
      }
    }
    if (isParticlesEnabled()) {
      if (!D.trail) {
        const trailPrimary = D.cosmetics ? D.cosmetics.primaryColor : new THREE.Color(D.color);
        const trailSecondary = D.cosmetics
          ? D.cosmetics.secondaryColor
          : new THREE.Color(D.color).multiplyScalar(0.55);
        D.trail = new RibbonTrail({
          primaryColor: trailPrimary,
          secondaryColor: trailSecondary,
          opacity: D.cosmetics ? D.cosmetics.opacity : 0.85,
          width: 0.44 + (D.charge || 0) * 0.14,
          maxPoints: 26,
          minDistance: 0.18,
          hdrBoost: 1.9
        });
        scene.add(D.trail.mesh);
      }
      D.trail.pushPoint(D.pos, D.vel, camera?.position || null);
    } else if (D.trail) {
      D.trail.dispose();
      D.trail = null;
    }

    // Floor collision & void plunge
    const yFloor = config.DISC_R;
    const tile = getTileAt(D.pos.x, D.pos.z);
    const isSolid = tile && tile.state !== config.TILE_FALLEN && tile.state !== config.TILE_REBUILDING;

    if (D.pos.y <= yFloor) {
      if (isSolid) {
        if (tile && tile.state === config.TILE_INTACT) {
          triggerTileWarning(tile, D.color);
          if ((state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') && state.playerRole === 'p1') {
            onTileDestabilizedByHost(tile.ix, tile.iz);
          }
        }
        D.pos.y = yFloor + 0.05;
        if (D.vel.y < 0) {
          const significant = Math.abs(D.vel.y) >= 1.0;
          D.vel.y = 3.5;
          D.curve = (D.curve || 0) * 0.65;
          D.launchY = 1.7;
          D.vel.x *= 0.98;
          D.vel.z *= 0.98;
          // Rebound upward away from floor into stabilized cruise elevation
          if (significant && !D.returning) {
            D.bounces++;
            if (D.hitFoes) D.hitFoes.clear();
            if (D.cosmetics?.particles?.ricochetSparks) {
              const p = D.cosmetics.particles;
              const sparkColor = p.sparkColorHex || D.cosmetics.primaryHex || D.color;
              const sparkCount = p.sparkCount || 16;
              burst(D.pos.clone(), sparkColor, sparkCount, 8);
            } else {
              const burstColor = (D.cosmetics && D.cosmetics.primaryHex) ? D.cosmetics.primaryHex : D.color;
              burst(D.pos.clone(), burstColor, 10, 6);
            }
            shake(.06);
          }
        }
      } else {
        D.vel.y -= 25 * dt;
        D.voidTime = (D.voidTime || 0) + dt;
        if ((D.voidTime > 1.5 || D.pos.y < -12) && !D.returning) {
          D.returning = true;
        }
      }
    }

    // Wall bounce
    const lim = config.ARENA - 1.5;
    let bounced = false;
    if (D.pos.x > lim) { D.pos.x = lim; D.vel.x *= -1; bounced = true; }
    if (D.pos.x < -lim) { D.pos.x = -lim; D.vel.x *= -1; bounced = true; }
    if (D.pos.z > lim) { D.pos.z = lim; D.vel.z *= -1; bounced = true; }
    if (D.pos.z < -lim) { D.pos.z = -lim; D.vel.z *= -1; bounced = true; }

    // Pillar bounce
    for (const p of pillars) {
      const dx = D.pos.x - p.x, dz = D.pos.z - p.z;
      const dd = Math.hypot(dx, dz), min = p.r + config.DISC_R;
      if (dd < min && dd > .001) {
        const nx = dx / dd, nz = dz / dd;
        D.pos.x = p.x + nx * min;
        D.pos.z = p.z + nz * min;
        const dot = D.vel.x * nx + D.vel.z * nz;
        D.vel.x -= 2 * dot * nx;
        D.vel.z -= 2 * dot * nz;
        bounced = true;
      }
    }
    if (sectorHazardBuilder && sectorHazardBuilder.checkDiscCollision(D)) {
      bounced = true;
    }
    if (bounced) {
      if (D.isDeflected) {
        D.deflectBounces = (D.deflectBounces || 0) + 1;
      }
      if (!D.returning) {
        D.bounces++;
        if (D.hitFoes) D.hitFoes.clear();
        D.curve = -D.curve * 0.5;
        if (D.cosmetics?.particles?.ricochetSparks) {
          const p = D.cosmetics.particles;
          const sparkColor = p.sparkColorHex || D.cosmetics.primaryHex || D.color;
          const sparkCount = p.sparkCount || 16;
          burst(D.pos.clone(), sparkColor, sparkCount, 8);
        } else {
          const burstColor = (D.cosmetics && D.cosmetics.primaryHex) ? D.cosmetics.primaryHex : D.color;
          burst(D.pos.clone(), burstColor, 10, 6);
        }
        shake(.06);
      }
    }

    // Disc collision against characters
    let discCaught = false;
    if (D.owner === 'player') {
      for (const f of state.foes) {
        if (D.hitFoes && D.hitFoes.has(f)) continue;
        const fCenter = tmp.copy(f.pos).setY(1.5 + (f.y || 0));
        const dist = D.pos.distanceTo(fCenter);

        // AI Threat Detection, Parry Defense & Catch Window (disabled for remote human opponents in 1v1 / 2v2)
        if (dist <= 2.2 && state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') {
          const toFoe = fCenter.clone().sub(D.pos);
          const movingToward = D.vel.dot(toFoe) > 0;
          const rotY = (f.obj && f.obj.rotation) ? f.obj.rotation.y : 0;
          const fwd = new THREE.Vector3(
            Math.sin(rotY),
            0,
            Math.cos(rotY)
          ).normalize();
          const toDisc = D.pos.clone().sub(f.pos).setY(0);
          const toDiscLen = toDisc.length();
          const facingDot = toDiscLen > 1e-4 ? fwd.dot(toDisc.clone().normalize()) : 1;
          const hasLos = lineOfSight(f.pos, D.pos);

          const canBotParry = BotCombatBrain.canParry(f);
          const isGuardCrush = (D.charge || 0) >= 0.85;

          if (canBotParry && movingToward && hasLos && (f.shieldCd || 0) <= 0 && f.alive !== false && (f.hurt || 0) <= 0) {
            if (facingDot > 0.35) {
              if (isGuardCrush) {
                // Guard Crush against bot parry!
                f.shieldCd = 1.2;
                f.hurt = 0.8;
                f.isStaggered = true;
                f.blocking = false;
                state.lastCombatEvent = 'GUARD_CRUSH';
                burst(D.pos.clone(), config.WHITE, 34, 15);
                burst(f.pos.clone().setY(1.5 + (f.y || 0)), config.ORANGE, 25, 10);
                shake(0.35);
                if (SFX && SFX.guardCrush) SFX.guardCrush();
                playGamepadHaptics({ duration: 180, weakMagnitude: 0.8, strongMagnitude: 1.0 });

                if (!D.hitFoes) D.hitFoes = new Set();
                D.hitFoes.add(f);
                const baseDmg = 55 + 40 * (D.charge || 0);
                const dmg = baseDmg + (D.bounces || 0) * 18;
                const isDead = applyDamageToTarget(f, dmg, D);
                if (isDead) {
                  if (typeof window !== 'undefined' && window.__tronKillFoe) {
                    window.__tronKillFoe(f);
                  }
                } else {
                  D.vel.multiplyScalar(-0.4);
                  D.vel.x += (Math.random() - 0.5) * 4;
                  D.vel.z += (Math.random() - 0.5) * 4;
                  D.vel.y = Math.random() * 2 + 1;
                  D.returning = true;
                }
                discCaught = true;
                break;
              } else {
                // Successful Bot Parry! Deflect with 1.25x speed escalation
                D.originalOwner = (D.owner !== 'player') ? D.owner : (D.originalOwner || 'player');
                D.owner = f;
                D.color = config.ORANGE;
                D.isDeflected = true;
                D.returning = false;
                D.bounces = 0;
                D.deflectBounces = 0;
                D.rallyHits = (D.rallyHits || 0) + 1;
                D.deflectTime = 0;
                D.t = 0;
                D.curve = 0;
                if (D.hitFoes) D.hitFoes.clear();
                setDiscVisualColor(D, config.ORANGE, 0xff9900);

                const incomingSpd = D.vel.length();
                const spd = Math.max(36, incomingSpd * 1.25);
                const pTarget = (state.player && state.player.pos) ? state.player.pos : { x: 0, y: 0, z: 0 };
                const pTargetY = (state.player && state.player.y) ? state.player.y : 0;
                const dirToPlayer = new THREE.Vector3(pTarget.x, 1.5 + pTargetY, pTarget.z).sub(D.pos).normalize();
                D.vel.copy(dirToPlayer).multiplyScalar(spd);
                D.pos.addScaledVector(toDiscLen > 1e-4 ? toDisc.normalize() : fwd, 0.8);

                f.shieldCd = 0.8;
                f.blocking = true;
                f.parryActive = true;
                state.lastCombatEvent = 'DEFLECTED';
                burst(D.pos.clone(), config.WHITE, 30, 12);
                burst(D.pos.clone(), config.ORANGE, 20, 8);
                shake(0.25);
                discCaught = true;
                break;
              }
            } else {
              // Outside frontal cone (struck side or rear) -> trigger 0.8s whiff window!
              f.shieldCd = 0.8;
            }
          } else if (D.isDeflected && movingToward && facingDot > 0.2 && hasLos) {
            const catchChance = isGuardCrush ? 0 : (((state.gameMode === 'duel' || state.gameMode === 'duel_ai') && f.isBoss)
              ? Math.min(0.85, 0.75 + ((state.tier || state.duelTier) - 1) * 0.03)
              : 0.35);
            if (Math.random() < catchChance) {
              disposeDiscEntity(D);
              state.discs.splice(i, 1);
              f.hasDisc = true;
              if (f.obj && f.obj.userData && f.obj.userData.backDisc) {
                f.obj.userData.backDisc.visible = true;
              }
              burst(f.pos.clone().setY(1.7 + (f.y || 0)), config.WHITE, 28, 11);
              burst(f.pos.clone().setY(1.7 + (f.y || 0)), config.ORANGE, 14, 7);
              shake(0.2);
              state.lastCombatEvent = 'RIVAL_CAUGHT_DISC';
              f.cd = 0.35 + Math.random() * 0.4;
              if (f.isBoss) f.state = 'ATTACK';
              discCaught = true;
              break;
            } else {
              if (!D.hitFoes) D.hitFoes = new Set();
              D.hitFoes.add(f);
              const critDmg = 85 + D.bounces * 20;
              const isDead = applyDamageToTarget(f, critDmg, D);
              f.hurt = 0.8;
              f.cd = Math.max(f.cd, 0.8);
              state.score += 150;
              state.lastCombatEvent = 'DEFLECTION_HIT';
              burst(D.pos.clone(), config.WHITE, 32, 12);
              burst(D.pos.clone(), config.ORANGE, 20, 8);
              shake(0.25);
              if (isDead) {
                if (typeof window !== 'undefined' && window.__tronKillFoe) {
                  window.__tronKillFoe(f);
                }
              } else {
                D.vel.multiplyScalar(-0.4);
                D.vel.x += (Math.random() - 0.5) * 4;
                D.vel.z += (Math.random() - 0.5) * 4;
                D.vel.y = Math.random() * 2 + 1;
                D.isDeflected = false;
                setDiscVisualColor(D, config.ORANGE, 0x993300);
                D.owner = f;
                D.returning = true;
              }
              discCaught = true;
              break;
            }
          }
        }

        if (dist < config.FOE_R + config.DISC_R + .35) {
          if (!D.hitFoes) D.hitFoes = new Set();
          D.hitFoes.add(f);

          if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
            const toTarget = D.pos.clone().sub(fCenter).setY(0);
            if (toTarget.lengthSq() > 1e-4) toTarget.normalize();
            else toTarget.set(0, 0, 1);

            burst(D.pos.clone(), D.isDeflected ? config.WHITE : config.ORANGE, 20, 8);
            shake(0.12);

            D.vel.multiplyScalar(-0.45);
            D.vel.x += (Math.random() - 0.5) * 4;
            D.vel.z += (Math.random() - 0.5) * 4;
            D.vel.y = Math.random() * 2 + 1;
            D.bounces = 0;
            D.curve = 0;
            if (D.isDeflected) {
              D.isDeflected = false;
              const targetOwner = (D.originalOwner && D.originalOwner !== 'player') ? D.originalOwner : f;
              D.owner = targetOwner;
              setDiscVisualColor(D, config.ORANGE, 0x993300);
            }
            D.returning = true;
            D.pos.addScaledVector(toTarget, 0.4);

            if (D.owner === 'player' && D.pos.distanceTo(tmp.copy(holder.pos).setY(1.7 + (holder.y || 0))) < 1.4) {
              state.player.hasDisc = true;
              disposeDiscEntity(D);
              state.discs.splice(i, 1);
              discCaught = true;
              SFX.catchDisc();
            }
            break;
          }

          if (D.isDeflected) {
            if (state.gameMode === 'campaign') {
              try { campaignManager.recordMetric('ricochetHit', 1); } catch (_) {}
            }
            const critDmg = 85 + D.bounces * 20;
            const isDead = applyDamageToTarget(f, critDmg, D);
            f.hurt = 0.8;
            f.cd = Math.max(f.cd, 0.8);
            state.score += 150;
            state.lastCombatEvent = 'DEFLECTION_HIT';
            burst(D.pos.clone(), config.WHITE, 32, 12);
            burst(D.pos.clone(), config.ORANGE, 20, 8);
            shake(0.25);
            if (isDead) {
              if (typeof window !== 'undefined' && window.__tronKillFoe) {
                window.__tronKillFoe(f);
              }
            } else {
              D.vel.multiplyScalar(-0.4);
              D.vel.x += (Math.random() - 0.5) * 4;
              D.vel.z += (Math.random() - 0.5) * 4;
              D.vel.y = Math.random() * 2 + 1;
              D.isDeflected = false;
              setDiscVisualColor(D, config.ORANGE, 0x993300);
              D.owner = f;
              D.returning = true;
            }
            discCaught = true;
            break;
          }

          const fwd = new THREE.Vector3(
            Math.sin(f.obj.rotation.y),
            0,
            Math.cos(f.obj.rotation.y)
          ).normalize();

          const dRel = D.pos.clone().sub(f.pos).setY(0);
          if (dRel.lengthSq() > 1e-6) dRel.normalize();
          const posRear = dRel.dot(fwd) < 0.05;

          const vNorm = D.vel.clone().setY(0);
          if (vNorm.lengthSq() > 1e-6) vNorm.normalize();
          const velRear = vNorm.dot(fwd) > 0.05;
          const rear = posRear || velRear;

          const charge = D.charge || 0;
          const baseDmg = 55 + 40 * charge;
          let dmg = baseDmg + D.bounces * 18;
          if (rear && D.bounces > 0) {
            dmg = (baseDmg + D.bounces * 18) * 2.0;
            state.score += 150;
            state.lastCombatEvent = 'REAR_STRIKE';
            burst(D.pos.clone(), config.WHITE, 34, 13);
            shake(.3);
          } else if (rear) {
            dmg *= 1.4;
            state.score += 60;
            burst(D.pos.clone(), config.WHITE, 20, 10);
            shake(.18);
          } else {
            burst(D.pos.clone(), config.ORANGE, 24, 9);
            shake(.15);
          }

          if (D.bounces >= 2) {
            duelEconomyBridge.rewardRicochetHit(D.bounces);
          }

          if (state.gameMode === 'campaign') {
            try {
              if (Math.abs(D.initialCurve || 0) > 0.05 || Math.abs(D.curve || 0) > 0.05) {
                campaignManager.recordMetric('curveHit', 1);
              }
              if (D.bounces > 0) {
                campaignManager.recordMetric('ricochetHit', 1);
              }
            } catch (_) {}
          }

          const isDead = applyDamageToTarget(f, dmg, D);
          if (state.gameMode === 'apex_trial' && state.trialRunStats && D.owner === 'player') {
            state.trialRunStats.damageDealt += dmg;
          }
          f.hurt = .25;
          state.score += 25;

          const toTarget = D.pos.clone().sub(fCenter).setY(0);
          if (toTarget.lengthSq() > 1e-4) toTarget.normalize();
          else toTarget.set(0, 0, 1);

          D.vel.multiplyScalar(-0.45);
          D.vel.x += (Math.random() - 0.5) * 4;
          D.vel.z += (Math.random() - 0.5) * 4;
          D.vel.y = Math.random() * 2 + 1;
          D.bounces = 0;
          D.curve = 0;
          D.returning = true;
          D.pos.addScaledVector(toTarget, 0.4);

          if (isDead) {
            if (state.gameMode === 'apex_trial' && state.trialRunStats && D.owner === 'player' && (D.bounces || 0) > 0) {
              state.trialRunStats.ricochetFractures += 1;
            }
            if (Math.abs(D.initialCurve || 0) > 0.05 || Math.abs(D.curve || 0) > 0.05) {
              duelEconomyBridge.rewardCurveElimination(Math.abs(D.initialCurve || D.curve || 0));
            }
            if (typeof window !== 'undefined' && window.__tronKillFoe) {
              window.__tronKillFoe(f);
            }
          }

          if (D.pos.distanceTo(tmp.copy(holder.pos).setY(1.7 + (holder.y || 0))) < 1.4) {
            state.player.hasDisc = true;
            disposeDiscEntity(D);
            state.discs.splice(i, 1);
            discCaught = true;
            SFX.catchDisc();
          }
          break;
        }
      }
    } else if (state.player.alive) {
      let isTeammate = false;
      if (state.gameMode === 'duos_multi' && D.owner && D.owner.team !== undefined) {
        const myTeam = (state.playerRole === 'p1' || state.playerRole === 'p3') ? 1 : 2;
        if (D.owner.team === myTeam) isTeammate = true;
      }
      
      const pc = tmp.copy(state.player.pos).setY(1.5 + state.player.y);
      if (!isTeammate && !D.returning && D.pos.distanceTo(pc) < config.PLAYER_R + config.DISC_R + .35) {
        const toDisc = D.pos.clone().sub(pc).setY(0).normalize();
        const facing = new THREE.Vector3(-Math.sin(state.player.yaw), 0, -Math.cos(state.player.yaw));
        const isPlayerBlocking = (state.player.parryTimer || 0) > 0 || !!state.player.blocking;
        const isGuardCrush = (D.charge || 0) >= 0.85;
        if (isPlayerBlocking && !isGuardCrush && state.player.hasDisc && toDisc.dot(facing) > .35) {
          state.player.parryTimer = 0;
          state.player.blocking = false;
          state.touchBlocking = false;
          state.gamepadBlocking = false;
          state.player.shieldCd = 1.0;
          burst(D.pos.clone(), config.WHITE, 30, 12);
          shake(.25);
          playGamepadHaptics({ duration: 160, weakMagnitude: 0.6, strongMagnitude: 0.85 });
          state.score += 50;
          duelEconomyBridge.rewardParry();
          if (state.gameMode === 'apex_trial' && state.trialRunStats) {
            state.trialRunStats.parries += 1;
          }
          if ((state.gameMode === 'calibration' || (state.gameMode === 'campaign' && state.campaignLevelId === 'level_01_01')) && typeof window !== 'undefined' && window.__tronCalibrationMode) {
            window.__tronCalibrationMode.onDiscDeflected();
          }
          if (!D.isDeflected) {
            D.originalOwner = (D.owner !== 'player') ? D.owner : (D.originalOwner || state.foes[0]);
          }
          D.owner = 'player';
          D.color = config.WHITE;
          D.isDeflected = true;
          D.returning = false;
          D.bounces = 0;
          D.deflectBounces = 0;
          D.rallyHits = (D.rallyHits || 0) + 1;
          D.deflectTime = 0;
          D.t = 0;
          D.curve = 0;
          if (D.hitFoes) D.hitFoes.clear();
          setDiscVisualColor(D, config.WHITE, config.CYAN);
          const incomingSpd = D.vel.length();
          const isMultiMode = state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi';
          const spd = isMultiMode
            ? Math.min(62, Math.max(42, incomingSpd * 1.12))
            : Math.max(36, incomingSpd * 1.25);
          let targetFoe = (D.originalOwner && D.originalOwner !== 'player' && state.foes.includes(D.originalOwner))
            ? D.originalOwner
            : state.foes[0];
          if (!targetFoe && state.foes.length > 0) targetFoe = state.foes[0];
          if (targetFoe) {
            const dirToRival = targetFoe.pos.clone().setY(1.7 + (targetFoe.y || 0)).sub(D.pos).normalize();
            D.vel.copy(dirToRival).multiplyScalar(spd);
          } else {
            D.vel.copy(facing).multiplyScalar(spd);
          }

          if (isMultiMode) {
            const parryId = Math.random().toString(36).substring(2, 9);
            const originalOwnerRole = D.originalOwner === 'player'
              ? state.playerRole
              : ((D.originalOwner && D.originalOwner.role) || (state.duelOpponent && state.duelOpponent.role) || null);
            const parryThrow = {
              id: parryId,
              throwId: parryId,
              parentThrowId: D.remoteThrowId || D.throwId || null,
              sender: state.playerRole,
              originalOwnerRole,
              isDeflected: true,
              charge: +(D.charge || 0).toFixed(2),
              rallyHits: D.rallyHits || 1,
              x: +D.pos.x.toFixed(2),
              y: +D.pos.y.toFixed(2),
              z: +D.pos.z.toFixed(2),
              vx: +D.vel.x.toFixed(2),
              vy: +D.vel.y.toFixed(2),
              vz: +D.vel.z.toFixed(2),
              curve: 0
            };
            D.remoteThrowId = parryId;
            if (state.webrtcPeer && state.webrtcPeer.connectionState === 'connected') {
              state.webrtcPeer.sendReliable({
                type: 'DISC_PARRY',
                lastThrow: parryThrow
              });
            } else if (state.db && state.currentRoomId && state.currentUser) {
              const roomRef = getRoomRef(state.currentRoomId);
              roomUpdateDoc(roomRef, {
                lastThrow: parryThrow
              }).catch(err => console.warn("Parry sync err:", err));
            }
          }
          D.pos.addScaledVector(toDisc, 1.2);
          state.lastCombatEvent = 'DEFLECTED';
          if (typeof dynamicDirector !== 'undefined' && dynamicDirector.recordParry) {
            dynamicDirector.recordParry();
          }
        } else {
          if (isPlayerBlocking && isGuardCrush) {
            state.lastCombatEvent = 'GUARD_CRUSH';
            shake(0.35);
            burst(D.pos.clone(), config.WHITE, 32, 14);
            state.player.parryTimer = 0;
            state.player.shieldCd = 1.0;
            state.player.blocking = false;
            state.touchBlocking = false;
            state.gamepadBlocking = false;
            if (SFX.guardCrush) SFX.guardCrush();
            playGamepadHaptics({ duration: 180, weakMagnitude: 0.8, strongMagnitude: 1.0 });
          }
          const behind = toDisc.dot(facing) < -0.25;
          const charge = D.charge || 0;
          const baseDmg = (16 + D.bounces * 6) * (1 + charge * 0.8);
          const rallyHits = Math.max(1, D.rallyHits || 1);
          const parryMult = D.isDeflected
            ? (1 + Math.min(0.75, 0.25 + (rallyHits - 1) * 0.15))
            : 1;
          damagePlayer(baseDmg * parryMult * (behind && D.bounces > 0 ? 1.8 : 1));
          burst(D.pos.clone(), config.ORANGE, 18, 7);
          shake(0.18 + charge * 0.15);

          D.vel.multiplyScalar(-0.45);
          D.vel.x += (Math.random() - 0.5) * 4;
          D.vel.z += (Math.random() - 0.5) * 4;
          D.vel.y = Math.random() * 2 + 1;
          D.bounces = 0;
          D.curve = 0;
          if (D.isDeflected && (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') && D.originalOwner) {
            D.owner = D.originalOwner;
            if (D.owner === 'player') {
              setDiscVisualColor(D, config.CYAN, 0x0088aa);
            } else {
              setDiscVisualColor(D, config.ORANGE, 0x993300);
            }
          }
          D.isDeflected = false;
          D.returning = true;
          D.pos.addScaledVector(toDisc, config.PLAYER_R + config.DISC_R + 0.4);

          const returnHolder = D.owner === 'player' ? player : D.owner;
          if (returnHolder && returnHolder.pos && D.pos.distanceTo(tmp.copy(returnHolder.pos).setY(1.7 + (returnHolder.y || 0))) < 1.4) {
            if (D.owner === 'player') {
              state.player.hasDisc = true;
            } else if (D.owner) {
              D.owner.hasDisc = true;
              if (D.owner.obj && D.owner.obj.userData && D.owner.obj.userData.backDisc) {
                D.owner.obj.userData.backDisc.visible = true;
              }
            }
            disposeDiscEntity(D);
            state.discs.splice(i, 1);
            discCaught = true;
            SFX.catchDisc();
          }
        }
      }
    }

    if (discCaught) continue;

    D.obj.position.copy(D.pos);
    const vx = D.vel.x, vy = D.vel.y, vz = D.vel.z;
    const spd = Math.hypot(vx, vy, vz);
    const hSpd = Math.hypot(vx, vz);
    if (hSpd > 1e-4 && spd > 1e-4) {
      _fwd.set(vx / spd, vy / spd, vz / spd);
      _r0.set(-vz / hSpd, 0, vx / hSpd);
      _u0.crossVectors(_r0, _fwd);

      const beta = (D.curve || 0) * 0.45 + Math.sin(D.spin * 0.2) * 0.08;
      const sinB = Math.sin(beta), cosB = Math.cos(beta);
      _uBank.copy(_u0).multiplyScalar(cosB).addScaledVector(_r0, sinB);
      _rBank.copy(_r0).multiplyScalar(cosB).addScaledVector(_u0, -sinB);

      const sinS = Math.sin(D.spin), cosS = Math.cos(D.spin);
      _localX.copy(_rBank).multiplyScalar(cosS).addScaledVector(_fwd, sinS);
      _localY.copy(_fwd).multiplyScalar(cosS).addScaledVector(_rBank, -sinS);

      _discMat.makeBasis(_localX, _localY, _uBank);
      D.obj.quaternion.setFromRotationMatrix(_discMat);
    } else {
      D.obj.rotation.set(Math.PI / 2 + Math.sin(D.spin * .2) * .25, 0, D.spin);
    }
  }
}
