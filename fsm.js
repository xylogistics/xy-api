import { Hub } from './hub.js'
import backoff from './backoff.js'
import sleep from './sleep.js'

class FsmDuplicateActionFromState extends Error {
  constructor(message) {
    super(message)
    this.name = this.constructor.name
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor)
  }
}

class FsmInvalidActionFromState extends Error {
  constructor(message) {
    super(message)
    this.name = this.constructor.name
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor)
  }
}

class FsmInvalidItem extends Error {
  constructor(message) {
    super(message)
    this.name = this.constructor.name
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor)
  }
}

const arrayify = a => (Array.isArray(a) ? a : [a])

const Fsm = transitions => {
  const actionsForState = new Map()
  for (const transition of transitions) {
    for (const f of arrayify(transition.from)) {
      if (!actionsForState.has(f)) actionsForState.set(f, new Map())
      const actionDestinations = actionsForState.get(f)
      if (actionDestinations.has(transition.action))
        throw new FsmDuplicateActionFromState(`Action ${transition.action} already available from ${f}`)
      for (const t of arrayify(transition.to)) actionDestinations.set(transition.action, t)
    }
  }
  const hub = Hub()
  return {
    on: hub.on,
    off: hub.off,
    start: state => {
      const api = {
        state,
        is: state => api.state == state,
        can: action => actionsForState.get(api.state)?.has(action),
        cannot: action => !api.can(action),
        how: state => {
          if (!actionsForState.has(api.state)) return null
          for (const [action, to] of actionsForState.get(api.state).entries()) if (to == state) return action
          return null
        },
        transitions: () => Array.from(actionsForState.get(api.state)?.entries()) ?? [],
        actions: () => Array.from(actionsForState.get(api.state)?.keys()) ?? [],
        move: async (action, params) => {
          if (!api.can(action)) throw new FsmInvalidActionFromState(`Cannot ${action} from ${api.state}`)
          const to = actionsForState.get(api.state).get(action)
          const transition = {
            action,
            from: api.state,
            to
          }
          await hub.emit('transition', params, transition)
          await hub.emit(`${transition.from} ->`, params, transition)
          await hub.emit(transition.action, params, transition)
          await hub.emit(`-> ${transition.to}`, params, transition)
          api.state = to
          return api.state
        }
      }
      return api
    }
  }
}

const FsmMachine = ({ getState, transitions, actionsToAttempt }) => {
  const states = new Map()
  const fsm = Fsm(transitions)
  const retryLater = async id => {
    const state = states.get(id)
    const delay = state.backoff.next()
    await sleep(delay)
    state.promise = null
    attemptTask(id)
  }
  const attemptTask = async id => {
    const state = states.get(id)
    if (state.promise) return
    for (const [action, fn] of actionsToAttempt.entries()) {
      if (!state.fsm.can(action)) continue
      state.promise = fn(state.item)
      try {
        const new_action = await state.promise
        state.promise = null
        state.backoff.reset()
        // If this movement is no longer valid we will exception and the retry will pickup a new action attempt
        await state.fsm.move(new_action ?? action, state.item)
      } catch (e) {
        console.error('👾 . fsm', JSON.stringify(e, Object.getOwnPropertyNames(e)))
        state.promise = retryLater(id)
      }
    }
  }
  const api = {
    on: fsm.on,
    off: fsm.off,
    consider: async (id, item) => {
      if (!states.has(id))
        states.set(id, {
          backoff: backoff(),
          promise: null
        })
      const state = states.get(id)
      state.item = item
      state.fsm = fsm.start(getState(item))
      await attemptTask(id)
    },
    set: (id, item) => {
      if (!states.has(id))
        states.set(id, {
          backoff: backoff(),
          promise: null
        })
      const state = states.get(id)
      state.item = item
      state.fsm = fsm.start(getState(item))
    },
    move: async (action, id, item) => {
      const state = states.get(id)
      if (!state) throw new FsmInvalidItem(`No state found for id ${id}`)
      state.item = item
      await state.fsm.move(action, state.item)
    },
    delete: id => states.delete(id),
    fsm,
    states
  }
  return api
}

export { Fsm, FsmMachine, FsmDuplicateActionFromState, FsmInvalidActionFromState }
