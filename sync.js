import { Hub } from './hub.js'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// TODO: Change unit_byexternalid to unit_byname_byexternalid
export default (ws, fn) => {
  const hub = Hub()
  let isquerying = false
  const results = {
    agent_byname: {},
    component_byname: {},
    schemas_byname: {},
    units: [],
    units_byid: new Map(),
    units_byname: {},
    tasks: [],
    tasks_byid: new Map(),
    tasks_byname: {},
    orderstatuses_byid: new Map(),
    orderstatuses: [],
    orderlinestatuses_byid: new Map(),
    orderlinestatuses: [],
    orders_byid: new Map(),
    orders_byname: {},
    pickstatuses_byid: new Map(),
    pickstatuses: [],
    picklinestatuses_byid: new Map(),
    picklinestatuses: [],
    picks_byid: new Map(),
    picks_byname: {},
    locations: [],
    locations_byid: new Map(),
    location_byname: {},
    items: [],
    items_byid: new Map()
  }
  const linkUnitsAndTasks = () => {
    for (const unit of results.units) unit.tasks = []
    for (const task of results.tasks) {
      task.units = []
      for (const unit_id of task.active_unit_ids ?? []) {
        const unit = results.units_byid.get(unit_id)
        if (unit == null) continue
        unit.tasks.push(task)
        task.units.push(unit)
      }
    }
  }
  let planExecuted = {
    agent_byname_byexternalid: {},
    component_byname_byexternalid: {},
    schemas_byname_bycomponentid: {},
    units_byname_byschemaids: {},
    units_byname_byids: {},
    units_byexternalid: [],
    units_byid: [],
    tasks_byname_byagentid: {},
    tasks_byactiveunitid: [],
    tasks_byid: [],
    orderstatuses_all: false,
    orderlinestatuses_all: false,
    orders_byname_bystatusids: {},
    pickstatuses_all: false,
    picklinestatuses_all: false,
    picks_byname_bystatusids: {},
    location_byname_byexternalid: {},
    items_byexternalid: [],
    items_byid: []
  }
  const queryAgents = async plan => {
    const agent_byname = {}
    const agent_byname_byexternalid = Object.entries(
      plan.agent_byname_byexternalid ?? {}
    )
      .map(([key, agent_external_id]) => ({
        key,
        agent_external_id
      }))
      .filter(({ agent_external_id }) => agent_external_id != null)
    if (agent_byname_byexternalid.length > 0) {
      const results = await ws.call(
        '/app/agents_get',
        agent_byname_byexternalid
      )
      for (const [i, c] of results.entries()) {
        if (c == null) continue
        agent_byname[agent_byname_byexternalid[i].key] = c
      }
    }
    if (JSON.stringify(agent_byname) !== JSON.stringify(results.agent_byname)) {
      results.agent_byname = agent_byname
    }
  }
  const queryComponents = async plan => {
    const component_byname = {}
    const component_byname_byexternalid = Object.entries(
      plan.component_byname_byexternalid ?? {}
    )
      .map(([key, component_external_id]) => ({
        key,
        component_external_id
      }))
      .filter(({ component_external_id }) => component_external_id != null)
    if (component_byname_byexternalid.length > 0) {
      const results = await ws.call(
        '/schema/components_get',
        component_byname_byexternalid
      )
      for (const [i, c] of results.entries()) {
        if (c == null) continue
        component_byname[component_byname_byexternalid[i].key] = c
      }
    }
    if (
      JSON.stringify(component_byname) !==
      JSON.stringify(results.component_byname)
    ) {
      results.component_byname = component_byname
    }
  }
  const querySchemas = async plan => {
    const schemas_byname = {}
    const schemas_byname_bycomponentid = Object.entries(
      plan.schemas_byname_bycomponentid ?? {}
    ).filter(([_, component_id]) => component_id != null)
    if (schemas_byname_bycomponentid.length > 0) {
      for (const [key, component_id] of schemas_byname_bycomponentid) {
        const results = await ws.call('/schema/schemas_with_component', {
          component_id
        })
        if (results == null) continue
        schemas_byname[key] = results
      }
    }
    if (
      JSON.stringify(schemas_byname) !== JSON.stringify(results.schemas_byname)
    ) {
      results.schemas_byname = schemas_byname
    }
  }
  const queryUnits = async plan => {
    const units_byid = new Map()
    const units_byname = {}
    for (const [key, schema_ids] of Object.entries(
      plan.units_byname_byschemaids ?? {}
    )) {
      if (schema_ids == null) continue
      const units = await ws.call('/unit/units_get_for_schema_ids', {
        schema_ids
      })
      for (const unit of units) units_byid.set(unit.unit_id, unit)
      units_byname[key] = units
    }
    for (const [key, unit_ids] of Object.entries(
      plan.units_byname_byids ?? {}
    )) {
      if (unit_ids == null) continue
      const units = await ws.call(
        '/unit/units_get',
        unit_ids.map(unit_id => ({ unit_id }))
      )
      for (const unit of units) units_byid.set(unit.unit_id, unit)
      units_byname[key] = units
    }
    const query_params = []
    for (const unit_external_id of plan.units_byexternalid ?? [])
      query_params.push({ unit_external_id })
    for (const unit_id of plan.units_byid ?? []) query_params.push({ unit_id })
    if (query_params.length > 0) {
      const units = await ws.call('/unit/units_get_all_ctx', query_params)
      for (const unit of units) {
        if (units_byid.has(unit.unit_id)) continue
        units_byid.set(unit.unit_id, unit)
      }
    }
    results.units_byid = units_byid
    results.units_byname = units_byname
    results.units = Array.from(units_byid.values())
    for (const unit of results.units) unit.inner = []
    for (const unit of results.units) {
      if (unit.outer_id == null) continue
      const outer = results.units_byid.get(unit.outer_id)
      if (outer == null) continue
      outer.inner.push(unit)
      unit.outer = outer
    }
  }
  const queryTasks = async plan => {
    const tasks_byid = new Map()
    const tasks_byname = {}
    for (const [key, agent_id] of Object.entries(
      plan.tasks_byname_byagentid ?? {}
    )) {
      if (agent_id == null) continue
      const tasks = await ws.call('/exe/tasks_all_byagent', { agent_id })
      for (const task of tasks) tasks_byid.set(task.task_id, task)
      tasks_byname[key] = tasks
    }
    if ((plan.tasks_byactiveunitid || []).length > 0) {
      const tasks_activeunit = await ws.call(
        '/exe/tasks_all_byactiveunit_ids',
        {
          unit_ids: plan.tasks_byactiveunitid
        }
      )
      for (const task of tasks_activeunit) {
        if (tasks_byid.has(task.task_id)) continue
        tasks_byid.set(task.task_id, task)
      }
    }
    if ((plan.tasks_byid || []).length > 0) {
      const tasks = await ws.call(
        '/exe/tasks_get',
        plan.tasks_byid.map(task_id => ({ task_id }))
      )
      for (const task of tasks) {
        if (task == null) continue
        if (tasks_byid.has(task.task_id)) continue
        tasks_byid.set(task.task_id, task)
      }
    }
    results.tasks_byid = tasks_byid
    results.tasks_byname = tasks_byname
    results.tasks = Array.from(tasks_byid.values())
  }
  const queryOrders = async plan => {
    const orderstatuses_byid = new Map()
    if (plan.orderstatuses_all) {
      const orderstatuses = await ws.call(
        '/outbound_orderstatus/outbound_orderstatus_qry'
      )
      for (const s of orderstatuses) orderstatuses_byid.set(s.orderstatus_id, s)
    }
    results.orderstatuses_byid = orderstatuses_byid
    results.orderstatuses = Array.from(orderstatuses_byid.values())

    const orderlinestatuses_byid = new Map()
    if (plan.orderlinestatuses_all) {
      const orderlinestatuses = await ws.call(
        '/outbound_orderlinestatus/outbound_orderlinestatus_qry'
      )
      for (const s of orderlinestatuses)
        orderlinestatuses_byid.set(s.orderlinestatus_id, s)
    }
    results.orderlinestatuses_byid = orderlinestatuses_byid
    results.orderlinestatuses = Array.from(orderlinestatuses_byid.values())

    const orders_byid = new Map()
    const orders_byname = {}
    for (const [key, orderstatus_ids] of Object.entries(
      plan.orders_byname_bystatusids ?? {}
    )) {
      if (orderstatus_ids == null || orderstatus_ids.length == 0) continue
      const orders = await ws.call('/outbound_order/outbound_order_qry', {
        orderstatus_ids
      })
      for (const order of orders) orders_byid.set(order.order_id, order)
      orders_byname[key] = orders
    }
    results.orders_byid = orders_byid
    results.orders_byname = orders_byname
    results.orders = Array.from(orders_byid.values())
  }
  const queryPicks = async plan => {
    const pickstatuses_byid = new Map()
    if (plan.pickstatuses_all) {
      const pickstatuses = await ws.call('/pickstatus/pickstatus_qry')
      for (const s of pickstatuses) pickstatuses_byid.set(s.pickstatus_id, s)
    }
    results.pickstatuses_byid = pickstatuses_byid
    results.pickstatuses = Array.from(pickstatuses_byid.values())

    const picklinestatuses_byid = new Map()
    if (plan.picklinestatuses_all) {
      const picklinestatuses = await ws.call(
        '/picklinestatus/picklinestatus_qry'
      )
      for (const s of picklinestatuses)
        picklinestatuses_byid.set(s.picklinestatus_id, s)
    }
    results.picklinestatuses_byid = picklinestatuses_byid
    results.picklinestatuses = Array.from(picklinestatuses_byid.values())

    const picks_byid = new Map()
    const picks_byname = {}
    for (const [key, pickstatus_ids] of Object.entries(
      plan.picks_byname_bystatusids ?? {}
    )) {
      if (pickstatus_ids == null || pickstatus_ids.length == 0) continue
      const picks = await ws.call('/pick/pick_qry', {
        pickstatus_ids
      })
      for (const pick of picks) picks_byid.set(pick.pick_id, pick)
      picks_byname[key] = picks
    }
    results.picks_byid = picks_byid
    results.picks_byname = picks_byname
    results.picks = Array.from(picks_byid.values())
  }
  const queryLocations = async plan => {
    const location_byname = {}
    const locations_byid = new Map()
    const location_byname_byexternalid = Object.entries(
      plan.location_byname_byexternalid ?? {}
    )
      .map(([key, location_external_id]) => ({
        key,
        location_external_id
      }))
      .filter(({ location_external_id }) => location_external_id != null)
    if (location_byname_byexternalid.length > 0) {
      const results = await ws.call(
        '/location/locations_get',
        location_byname_byexternalid
      )
      for (const [i, c] of results.entries()) {
        if (c == null) continue
        location_byname[location_byname_byexternalid[i].key] = c
        locations_byid.set(c.location_id, c)
      }
    }
    results.location_byname = location_byname
    results.locations_byid = locations_byid
    results.locations = Array.from(locations_byid.values())
  }
  const queryItems = async plan => {
    const items_byid = new Map()
    if (plan.items_byid?.length > 0) {
      const items = await ws.call(
        '/item/items_query',
        plan.items_byid.map(item_id => ({ item_id }))
      )
      for (const item of items) {
        if (items_byid.has(item.item_id)) continue
        items_byid.set(item.item_id, item)
      }
    }
    results.items_byid = items_byid
    results.items = Array.from(items_byid.values())
  }
  const query = async changesRequested => {
    if (isquerying) return
    isquerying = true
    const plan = fn()
    const changesDetected = {
      agent:
        JSON.stringify(plan.agent_byname_byexternalid) !==
        JSON.stringify(planExecuted.agent_byname_byexternalid),
      component:
        JSON.stringify(plan.component_byname_byexternalid) !==
        JSON.stringify(planExecuted.component_byname_byexternalid),
      schema:
        JSON.stringify(plan.schemas_byname_bycomponentid) !==
        JSON.stringify(planExecuted.schemas_byname_bycomponentid),
      unit:
        JSON.stringify(plan.units_byname_byschemaids) !==
          JSON.stringify(planExecuted.units_byname_byschemaids) ||
        JSON.stringify(plan.units_byname_byids) !==
          JSON.stringify(planExecuted.units_byname_byids) ||
        JSON.stringify(plan.units_byexternalid) !==
          JSON.stringify(planExecuted.units_byexternalid) ||
        JSON.stringify(plan.units_byid) !==
          JSON.stringify(planExecuted.units_byid),
      task:
        JSON.stringify(plan.tasks_byname_byagentid) !==
          JSON.stringify(planExecuted.tasks_byname_byagentid) ||
        JSON.stringify(plan.tasks_byid) !==
          JSON.stringify(planExecuted.tasks_byid) ||
        JSON.stringify(plan.tasks_byactiveunitid) !==
          JSON.stringify(planExecuted.tasks_byactiveunitid),
      order:
        planExecuted.orderstatuses_all !== plan.orderstatuses_all ||
        planExecuted.orderlinestatuses_all !== plan.orderlinestatuses_all ||
        JSON.stringify(plan.orders_byname_bystatusids) !==
          JSON.stringify(planExecuted.orders_byname_bystatusids),
      pick:
        planExecuted.pickstatuses_all !== plan.pickstatuses_all ||
        planExecuted.picklinestatuses_all !== plan.picklinestatuses_all ||
        JSON.stringify(plan.picks_byname_bystatusids) !==
          JSON.stringify(planExecuted.picks_byname_bystatusids),
      location:
        JSON.stringify(plan.location_byname_byexternalid) !==
        JSON.stringify(planExecuted.location_byname_byexternalid),
      item:
        JSON.stringify(plan.items_byexternalid) !==
          JSON.stringify(planExecuted.items_byexternalid) ||
        JSON.stringify(plan.items_byid) !==
          JSON.stringify(planExecuted.items_byid)
    }
    const isChange =
      Object.values(changesDetected).some(v => v) ||
      Object.values(changesRequested).some(v => v)
    if (!isChange) {
      isquerying = false
      return
    }
    hub.emit('plan', {
      planExisting: planExecuted,
      planNew: plan,
      changesRequested,
      changesDetected
    })
    if (changesRequested.agent || changesDetected.agent) {
      await queryAgents(plan)
      hub.emit('agent_byname', results.agent_byname)
    }
    if (changesRequested.component || changesDetected.component) {
      await queryComponents(plan)
      hub.emit('component_byname', results.component_byname)
    }
    if (changesRequested.schema || changesDetected.schema) {
      await querySchemas(plan)
      hub.emit('schemas_byname', results.schemas_byname)
    }
    if (changesRequested.unit || changesDetected.unit) {
      await queryUnits(plan)
      // If we are not querying for tasks, refresh units
      if (!changesRequested.task && !changesDetected.task) linkUnitsAndTasks()
      hub.emit('units_byname', results.units_byname)
      hub.emit('units_byid', results.units_byid)
      hub.emit('units', results.units)
    }
    if (changesRequested.task || changesDetected.task) {
      await queryTasks(plan)
      linkUnitsAndTasks()
      hub.emit('tasks_byname', results.tasks_byname)
      hub.emit('tasks_byid', results.tasks_byid)
      hub.emit('tasks', results.tasks)
    }
    if (changesRequested.order || changesDetected.order) {
      await queryOrders(plan)
      hub.emit('orderstatuses_byid', results.orderstatuses_byid)
      hub.emit('orderstatuses', results.orderstatuses)
      hub.emit('orderlinestatuses_byid', results.orderlinestatuses_byid)
      hub.emit('orderlinestatuses', results.orderlinestatuses)
      hub.emit('orders_byid', results.orders_byid)
      hub.emit('orders_byname', results.orders_byname)
      hub.emit('orders', results.orders)
    }
    if (changesRequested.pick || changesDetected.pick) {
      await queryPicks(plan)
      hub.emit('pickstatuses_byid', results.pickstatuses_byid)
      hub.emit('pickstatuses', results.pickstatuses)
      hub.emit('picklinestatuses_byid', results.picklinestatuses_byid)
      hub.emit('picklinestatuses', results.picklinestatuses)
      hub.emit('picks_byid', results.picks_byid)
      hub.emit('picks_byname', results.picks_byname)
      hub.emit('picks', results.picks)
    }
    if (changesRequested.location || changesDetected.location) {
      await queryLocations(plan)
      hub.emit('location_byname', results.location_byname)
      hub.emit('locations_byid', results.locations_byid)
      hub.emit('locations', results.locations)
    }
    if (changesRequested.item || changesDetected.item) {
      await queryItems(plan)
      hub.emit('items_byid', results.items_byid)
      hub.emit('items', results.items)
    }
    planExecuted = plan
    isquerying = false
    hub.emit('query', results)
    await ws.send('/schema/subscribe')
    const unit_ids = Array.from(results.units_byid.keys())
    await ws.send('/unit/subscribe', { unit_ids })
    await ws.send('/exe/subscribe', {
      task_ids: results.tasks.map(t => t.task_id),
      active_unit_ids: unit_ids
    })
    const order_ids = Array.from(results.orders_byid.keys())
    await ws.send('/outbound_order/subscribe', { order_ids })
    const location_ids = Array.from(results.locations_byid.keys())
    await ws.send('/location/subscribe', { location_ids })
    const item_ids = Array.from(results.items_byid.keys())
    await ws.send('/item/subscribe', { item_ids })
    queryLater({})
  }
  const queryLater = changes => {
    const q = async () => {
      await sleep(0)
      await query(changes)
    }
    q()
  }
  ws.on('/schema/schemas_assert', () => queryLater({ schema: true }))
  ws.on('/schema/schemas_delete', () => queryLater({ schema: true }))
  ws.on('/schema/schemas_payload', () => queryLater({ schema: true }))
  ws.on('/schema/schemas_applies_to', () => queryLater({ schema: true }))
  ws.on('/schema/schemas_components', () => queryLater({ schema: true }))
  ws.on('/schema/schemas_components_for', () => queryLater({ schema: true }))
  ws.on('/schema/components_assert', () => queryLater({ component: true }))
  ws.on('/schema/components_delete', () => queryLater({ component: true }))
  ws.on('/schema/components_payload', () => queryLater({ component: true }))
  ws.on('/schema/components_schema', () => queryLater({ component: true }))
  ws.on('/unit/units_assert', () => queryLater({ unit: true }))
  ws.on('/unit/units_delete', () => queryLater({ unit: true }))
  ws.on('/unit/units_move', () => queryLater({ unit: true }))
  ws.on('/unit/units_payload', () => queryLater({ unit: true }))
  ws.on('/unit/units_schema', () => queryLater({ unit: true }))
  ws.on('/exe/tasks_assert', () => queryLater({ task: true }))
  ws.on('/exe/tasks_delete', () => queryLater({ task: true }))
  ws.on('/exe/tasks_active_unit_ids', () => queryLater({ task: true }))
  ws.on('/exe/tasks_agent', () => queryLater({ task: true }))
  ws.on('/exe/tasks_app_status', () => queryLater({ task: true }))
  ws.on('/exe/tasks_core_status', () => queryLater({ task: true }))
  ws.on('/exe/tasks_payload', () => queryLater({ task: true }))

  ws.on('/outbound_order/outbound_order_assert', () =>
    queryLater({ order: true })
  )
  ws.on('/outbound_order/outbound_orderline_assert', () =>
    queryLater({ order: true })
  )
  ws.on('/outbound_orderstatus/outbound_orderstatus_assert', () =>
    queryLater({ order: true })
  )
  ws.on('/outbound_orderlinestatus/outbound_orderlinestatus_assert', () =>
    queryLater({ order: true })
  )
  ws.on('/pick/pick_assert', () => queryLater({ pick: true }))
  ws.on('/pickline/pickline_assert', () => queryLater({ pick: true }))
  ws.on('/pickstatus/pickstatus_assert', () => queryLater({ pick: true }))
  ws.on('/picklinestatus/picklinestatus_assert', () =>
    queryLater({ pick: true })
  )
  ws.on('/location/locations_assert', () => queryLater({ location: true }))

  ws.on('/item/items_assert', () => queryLater({ item: true }))
  ws.on('/item/barcodes_assert', () => queryLater({ item: true }))

  const api = {
    on: hub.on,
    off: hub.off,
    results,
    query,
    refresh: () =>
      query({
        agent: true,
        component: true,
        schema: true,
        unit: true,
        task: true,
        order: true,
        pick: true,
        location: true,
        item: true
      }),
    close: () => {},
    unit_sanitise: u => {
      if (u == null) return null
      return {
        unit_id: u.unit_id,
        unit_external_id: u.unit_external_id,
        outer_id: u.outer_id,
        old_outer_id: u.old_outer_id,
        payload: u.payload,
        schema_id: u.schema_id
      }
    },
    task_sanitise: t => {
      if (t == null) return null
      return {
        task_id: t.task_id,
        agent_id: t.agent_id,
        payload: t.payload,
        active_unit_ids: t.active_unit_ids,
        app_status: t.app_status,
        core_status: t.core_status
      }
    }
  }
  return api
}
