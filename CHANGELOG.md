# Changelog

## 1.0.0

- raw-first conversation log
- pending/tagged state, confidence, version
- settlement validation and commit
- skipped rounds to gray text index
- pause / resume / closing words
- quiet window
- minimal adapter example
- tests

## 1.0.4

- fix false closing when `完工` appears inside `干完工作`
- add continuity card written on settlement
- add regression tests for trigger matching

## 1.0.5

- document continuity cards: write on settle, inject on new session
- fix package name in usage docs (`forevery`)

## 1.0.6

- add optional in-memory activation pool (TTL/capacity)
- add injection gate with focus/companion/creative modes
- add silent/weak/strong channels
- document activation boundary
