# Ideas (backlog)

## Typed FSM library (typescript-fsm improvements)

Parked for later — possible npm extract after Awano ships.

Improvements worth exploring vs `typescript-fsm`:

- Typed event payloads (`dispatch(event, payload)`)
- Separate guards vs side effects (auth / role checks before transition)
- Context object (actor, entity id) through transitions
- Concurrency: single-flight / queue on async `dispatch`
- Explicit terminal states; serialization for persistence
- Stronger TS: valid events narrowed by current state

Awano ticket workflow (`OPEN` → `IN_PROGRESS` → …) is a good dogfood case.
