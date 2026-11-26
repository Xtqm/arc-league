# Spec Delta

## ADDED Requirements

### Requirement: Spark Vault Item Gating and Weekly Rotation Metadata
The system SHALL distinguish `UNLOCK_TYPES.SPARKS` prestige items (such as `disc_hex_dark_matter` at 75 Sparks and `disc_shuriken_void` at 100 Sparks) inside Athlete Loadout so unowned items direct players to the Apex Trials Spark Vault rather than allowing direct Arc Credit purchases, while equipping cleanly once unlocked.

#### Scenario: Inspecting an unowned Sparks Vault item inside Athlete Loadout
- **WHEN** a player selects `disc_hex_dark_matter` or `disc_shuriken_void` in Athlete Loadout while unowned
- **THEN** the action bar indicates Vault exclusivity (`[ APEX VAULT // {cost} SPARKS ]`) and provides navigation or status indicating whether it is featured in the current weekly Vault rotation.

#### Scenario: Equipping a Sparks Vault item after unlocking
- **WHEN** a player has unlocked a `sparks` item through the Spark Vault and selects it in Athlete Loadout
- **THEN** the action bar presents `[ EQUIP TO LOADOUT ]` and applies the cosmetic identically to standard unlocked discs.
