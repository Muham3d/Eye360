# Research: PatrolManager Foundation

This document details the architectural decisions and technology patterns chosen for the PatrolManager core features, addressing non-functional requirements and technical unknowns.

## 1. Redis-backed Socket.io for Multi-Tenancy
- **Decision**: Use `@socket.io/redis-adapter` with a scoped key strategy.
- **Rationale**: Redis provides the necessary pub/sub mechanism to synchronize Socket.io events across multiple backend horizontal instances. For multi-tenancy, events will be emitted to rooms scoped by tenant ID (e.g., `tenant:123:guards`) to ensure data isolation.
- **Alternatives considered**: 
  - Standard Memory Adapter: Rejected because it does not support horizontal scaling.
  - Postgres Pub/Sub: Rejected because Redis offers lower latency for high-frequency GPS updates.

## 2. EXIF Metadata Stripping
- **Decision**: Use the `sharp` library for image processing.
- **Rationale**: `sharp` is high-performance and allows for removing all metadata (EXIF, XMP, etc.) while resizing or re-encoding images. This ensures privacy compliance by removing GPS and device info from uploaded photos before they are stored.
- **Alternatives considered**: 
  - `exif-terminator`: Rejected in favor of `sharp` which also provides image optimization and resizing.

## 3. Half-duplex Push-to-Talk (PTT)
- **Decision**: Stream Opus-encoded audio chunks over WebSockets using a "lock" mechanism.
- **Rationale**: Opus provides excellent quality at low bitrates, ideal for mobile networks. Half-duplex will be enforced by a server-side "active speaker" lock per channel/room; only one user can "hold the floor" at a time.
- **Alternatives considered**: 
  - WebRTC: Rejected due to higher complexity for simple half-duplex voice and the need for a STUN/TURN infrastructure.

## 4. Logical Multi-Tenancy in Sequelize
- **Decision**: Implement a global `tenant_id` scope and a custom `TenantHook`.
- **Rationale**: By adding `tenant_id` to all core models and using a Sequelize "beforeFind" and "beforeCreate" hook, we can automatically filter all queries by the active tenant context. This minimizes "where tenant_id =" boilerplate in services.
- **Alternatives considered**: 
  - Schema-per-tenant: Rejected due to significant operational overhead in managing migrations across hundreds of schemas.

## 5. Mobile SyncQueue & Server Authority
- **Decision**: "Last-Write-Wins" on the server with a "Conflict Flag" for manual review.
- **Rationale**: When a guard syncs offline data (e.g., an incident report), the server validates the data against its current state. If a conflict is detected (e.g., status changed on server while guard was offline), the server stores the mobile version as a secondary "conflict" record and flags it for supervisor review in the Admin Panel.
- **Alternatives considered**: 
  - OT (Operational Transformation): Rejected as overkill for incident and patrol data which is largely additive.
