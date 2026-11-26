# spark-vault Specification

## Purpose
Establishes the weekly rotating Spark Vault storefront embedded inside the Apex Trials modal, featuring 1 to 3 rotating scarce-Spark prestige cosmetics per week (including Dark Matter Disc and Void Shuriken) with repeat rotation eligibility and atomic Spark purchases.

## Requirements

### Requirement: Weekly Rotating 1–3 Item Spark Vault Storefront
The system SHALL embed a Spark Vault catalog inside the `APEX TRIALS` modal displaying 1 to 3 prestige cosmetic items selected for the current weekly UTC rotation, permitting previously featured items to reappear in later rotations.

#### Scenario: Rendering current weekly Spark Vault rotation
- **WHEN** the player opens the Spark Vault view inside `APEX TRIALS`
- **THEN** the system deterministically resolves the active weekly rotation of 1 to 3 prestige items (`unlockType: 'sparks'`), displays the countdown to next Vault rotation, and lists each item's Spark price and 3D/visual preview.

#### Scenario: Allowing previously featured items to reappear in future weeks
- **WHEN** a new weekly UTC rotation index begins
- **THEN** the Vault rotation schedule may select items that appeared in earlier weeks so players who saved Sparks over multiple weeks remain able to acquire flagship cosmetics.

### Requirement: Scarce Spark Vault Pricing and Atomic Purchase Pipeline
The system SHALL enforce scarce Spark pricing across Vault tiers (`40–50 Sparks` Standard Prestige, `75 Sparks` Dark Matter Disc, `100 Sparks` Void Shuriken) and execute atomic Spark purchases that grant items directly into Armory inventory.

#### Scenario: Purchasing an active Spark Vault item with sufficient Sparks
- **WHEN** a player clicks `[ UNLOCK // {cost} SPARKS ]` on an unowned item in the active weekly Vault rotation and holds `>= cost` Sparks
- **THEN** the system deducts the Spark cost via `EconomyManager.spendSparks`, unlocks the item via `ArmoryManager.unlockRewardItem`, persists storage, and updates the item state to owned/equippable.

#### Scenario: Rejecting purchase for items outside the active Vault rotation or with insufficient Sparks
- **WHEN** a player attempts to purchase a `sparks`-priced item not in the current week's active Vault rotation or lacks sufficient Sparks
- **THEN** the system rejects the transaction, preserves the player's Sparks balance and inventory, and displays the appropriate lock or insufficient-Sparks message.
