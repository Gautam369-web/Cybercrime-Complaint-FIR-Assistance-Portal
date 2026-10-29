# 3dviz-pro-max kit provenance

Source: https://github.com/viettranx/3dviz-pro-max, cloned on 2026-10-29.

These modules were copied from `skills/3dviz-pro-max/templates/kits/` as instructed by the kit README. The MIT license is preserved alongside them. No third-party artwork or historical demo recording is used.

Runtime imports use the documented `create(params) -> { group, sockets, colliders }` API from timber-cottage, long-hall, round-tower, stone-bridge and lantern-post. The root scene compacts static kit geometry by material, dresses it with custom low-poly terrain, trees, fountain and creatures, and adds camera navigation and raycasting.

Local adaptations: timber-cottage and long-hall roof palette values are changed to muted teal. The integration clones window materials to emit a warm amber, adds a custom bell cupola to the hall, and retains original kit geometry and factory semantics. This is a T1 procedural illustration, not a structural model or physical simulation. No T2/T3/T4 quality claim is made.
