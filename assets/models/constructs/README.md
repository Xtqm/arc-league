# Blender Construct Rig Export Contract

This directory holds Blender-authored `.glb` Construct rigs and animation clip bundles for Arc League (`athlete_base.glb` and opponent/cosmetic variants). All `.glb` rigs are loaded by `src/graphics/ConstructLoader.js`, normalized to match the `makeProgram()` contract, and fall back to the synchronous procedural construct builder when absent or in headless Node tests.

## 1. Rigging Architecture: Rigid Bone-Parented Shards

Constructs are magnetically suspended, faceted obsidian/ceramic armor shards orbiting a glowing central plasma core.

- **Rigid Parenting Only:** Parent each faceted armor shard mesh directly to its target bone (`Object > Parent > Bone`). Do **not** use vertex-weighted soft skinning (`Armature Deform`), as bending flat-shaded metallic/ceramic shards introduces rubbery deformation artifacts.
- **Coordinate System:** Standard glTF 2.0 (`+Y` Up, `+Z` Forward, meters). Apply all object transforms (`Ctrl+A > All Transforms`) before exporting.
- **Skill-Only Parity:** All Athlete Rig `.glb` variants share identical collision bounds, movement, and combat stats. Silhouettes are strictly cosmetic.

## 2. Required Bone Hierarchy

The rig MUST expose an articulated parent-child joint hierarchy using the following canonical joint names (Mixamo-prefixed equivalents are normalized at load time):

```text
pelvis
├── abdomen
│   └── torso
│       ├── neck
│       │   └── head
│       ├── leftShoulder
│       │   └── leftElbow
│       │       └── leftHand
│       ├── rightShoulder
│       │   └── rightElbow
│       │       └── rightHand
│       └── dorsal_socket        (Empty)
├── leftHip
│   └── leftKnee
└── rightHip
    └── rightKnee
```

- **Five-Fingered Hands:** Athlete rigs (`archetype: 'player'`) should include a tapered palm chassis and five distinct articulated digits (opposable thumb + four three-segment fingers) parented under `leftHand` / `rightHand`.

## 3. Node Naming & Semantic Part Tags

`ConstructLoader.js` normalizes mesh/node name prefixes into `userData.part` tags and rig references so `CosmeticMaterialEngine` and `ArmoryPreviewScene` can tint suits, trims, cores, and halos in-place without material leaks:

| Blender Name Prefix | Normalized `userData.part` | Rig Reference / Role |
|---|---|---|
| `suit_*` | `chassis_suit` | Primary obsidian/ceramic armor shards |
| `trim_*` | `chassis_trim` | Emissive edge-trim accents |
| `visor_*` | `chassis_visor` | Head visor slit / faceplate |
| `halo_*` | `chassis_halo` | Overhead tilted halo (`userData.headHalo`) |
| `core_*` | `chassis_suit` / core | Central plasma core (`userData.coreMesh`) |

## 4. Attachment Socket Empties

Include the following `Empty` nodes in the `.glb` hierarchy:

- **`palm_socket_r`**: Parented to `rightHand`. Defines the Hover-Palm disc mount (`userData.backDisc` / `chassis_back_disc`). Oriented so the disc hovers cleanly above the open right palm.
- **`dorsal_socket`**: Parented to `torso`. Defines `userData.dorsalWingPivot` for optional dorsal wing/back-piece cosmetics.

## 5. Required Animation Clips

Export all combat and locomotion animations as separate glTF `AnimationClip`s (via Blender NLA tracks or Actions) using these exact clip names:

| Clip Name | Purpose | Looping |
|---|---|---|
| `idle_hover` | Neutral hovering stance with subtle breath/drift | Yes |
| `sprint_lean` | Forward locomotion stride with counter-swinging arms | Yes |
| `throw_windup` | Coiled torso & arm draw-back while charging throw | No / Clamp |
| `throw_release` | Snappy open-palm forward thrust on disc release | No / Clamp |
| `catch_recoil` | Forward cushion as returning disc re-arms above palm | No / Clamp |
| `parry_brace` | Forward defensive brace projecting Hover-Palm barrier | Yes / Hold |
| `dash_burst` | Directional burst tuck | No / Clamp |
| `aerial_tuck` | Airborne jump/fall posture with trailing hover-legs | Yes |
| `eliminated` | *(Optional)* Deactivation / shatter pose | No / Clamp |

> **Note:** Core pulsing and halo rotation are layered procedurally on top of `THREE.AnimationMixer` playback in `animateProgramKinematics()`.

## 6. Blender `.glb` Export Checklist

1. Format: **glTF Binary (`.glb`)**
2. Transform: **+Y Up** enabled
3. Include: **Selected Objects** (Armature, Shard Meshes, Socket Empties), **Custom Properties**
4. Animation: **Animations** enabled, **Group by NLA Track** enabled, **Sampling Rate** `30` or `60` fps
5. Geometry: **Apply Modifiers** enabled, **Normals** enabled; keep shard polycount compact for fast web/Electron preload.
