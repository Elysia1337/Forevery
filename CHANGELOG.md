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

## 1.0.8

- add file-backed reference adapter
- add deterministic mock model
- add adapter contract tests

## 1.0.9

- add durable tagging queue with lease/recover/ack/fail/dead
- add crash-recovery queue tests

## 1.0.10

- add multi-session write-path replay benchmark
- add benchmark baseline report

## 1.0.11

- add health check
- add quickstart example
- add deployment and security docs

## 1.0.12

- add minimal lexical retriever (examples/benchmark only)
- add golden query replay

## 1.0.13

- add real child-process SIGKILL recovery test
- add crash helper

维护记录：中间提交 `ebc1f26` 曾把崩溃测试的子程序放进测试目录，自动测试器把它当成一条测试执行，子程序按设计强杀自己，导致该提交的测试流水线失败。子程序已移到 `bench/helpers/`，从后续提交起流水线恢复通过；`ebc1f26` 不是发布版本。

## 1.0.14

- add stable error codes and MemoryError
- add TypeScript declarations
- document error/version strategy

## 1.0.15

- add SQLite queue reference (Node 22+ `node:sqlite`)
- document database vs file queue
