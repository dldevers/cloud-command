# Provider Interface

## Purpose

The provider interface separates CloudCommand's resource model from infrastructure-specific implementation logic.

A provider receives normalized CloudCommand requests and translates them into operations against an infrastructure platform.

## Provider Responsibilities

A provider must be able to:

- Identify itself
- Report supported Resource Classes
- Validate whether it can satisfy a request
- Plan an operation
- Apply an operation
- Report operation status
- Report observed resource state
- Reconcile drift
- Remove resources when requested

## Conceptual Interface

The initial provider contract is expected to include operations similar to:

- Describe
- Capabilities
- Validate
- Plan
- Apply
- Status
- Reconcile
- Delete

This is a conceptual contract, not yet a final programming-language interface.
