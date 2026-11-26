# Spec Delta

## ADDED Requirements

### Requirement: Victim-Authoritative 1v1 Damage and Deflected Disc Ownership
In online `1v1` matches, health reduction and elimination MUST be authorized exclusively by the targeted player's client using consistent multiplayer disc damage (`(16 + bounces * 6) * (1 + charge * 0.8)`, `x1.8` on rear ricochets) and capped parry escalation, while deflected discs preserve original thrower ownership so the disc returns to the original thrower after `1.5s` or upon hitting the target without counting wall bounces.

#### Scenario: Attacker contact does not prematurely eliminate opponent
- **WHEN** a player's thrown disc collides with a remote opponent locally in a `1v1` match
- **THEN** the attacker's client displays local contact sparks and begins disc recall without reducing the opponent's authoritative health, running AI catch rolls, or declaring round/match victory locally.

#### Scenario: Parried disc reconciles original throw and preserves ownership
- **WHEN** a defending player shields in time to parry an incoming remote disc in a `1v1` match
- **THEN** the defender transmits parry parameters including the original throw reference, `isDeflected`, `charge`, and `rallyHits` with velocity capped at `62 m/s` and scaled parry bonus damage (`~20`–`50` HP), the thrower's client removes any unconfirmed local copy of that throw and remains disarmed until the deflected disc resolves, and after `1.5s` (ignoring wall bounce count) or hitting the thrower the disc flips back to the original thrower's ownership and recalls to them.

#### Scenario: Fast kinematic elimination update hides defeated opponent
- **WHEN** a remote opponent's WebRTC kinematic packet reports `hp <= 0` while the local client still renders that opponent alive
- **THEN** the local client updates the opponent's health bar to `0`, triggers their derez burst visual, and hides their arena mesh.

### Requirement: Host-Refereed 1v1 Round Settlement and Draw Resolution
In online `1v1` matches, eliminated combatants SHALL report their elimination to the Host rather than mutating series scores locally, and the Host SHALL settle each round using an RTT-compensated trade window so only deaths occurring within ~16ms of one another resolve as a round draw while all other rounds produce a single synchronized `ROUND_OVER`, `ROUND_DRAW`, or `GAME_OVER_EVENT` outcome.

#### Scenario: Single elimination awards round cleanly on both clients
- **WHEN** one `1v1` combatant reaches `0` HP or falls into the void while their opponent remains alive
- **THEN** the Host settles the round, increments the surviving side's `seriesScores`, and both clients display the matching intermission or post-match `VICTORY` / `DEREZZED` result.

#### Scenario: Staggered mutual deaths resolve by earliest elimination
- **WHEN** both `1v1` combatants die in the same round more than ~16ms apart after accounting for one-way network transit (`RTT / 2`)
- **THEN** the Host awards the round to the combatant who survived longer and synchronizes the canonical score to both clients.

#### Scenario: Simultaneous elimination within trade window triggers round draw
- **WHEN** both `1v1` combatants are eliminated within ~16ms of each other after RTT compensation
- **THEN** the Host declares a round draw without incrementing `seriesScores`, shows a brief draw intermission, and resets the arena to replay the current `seriesRound`.
