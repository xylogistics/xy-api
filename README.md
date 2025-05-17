# XY API

A collection of APIs to write applications for XY Logistics.

TODO: Make a plan to have agents and users connect to an app.

## xyapi

```javascript
const [app1] = await xyapi.assert_apps([
  [app_external_id, name, config = {}, payload = {}]
])
const [agent1] = await xyapi.assert_agents([
  [agent_external_id, name, app_id, config = {}, payload = {}]
])
const [component1] = await xyapi.assert_components([
  [component_external_id, name, payload = {}]
])
const [schema1] = await xyapi.assert_schemas([
  [schema_external_id, name, applies_to, components, payload = {}]
])
const [unit1] = await xyapi.assert_units([
  [unit_external_id, name, type, schema_id, outer_id = null, payload = {}]
])
const [location1] = await xyapi.assert_locations([
  [location_external_id, name, within_location_entry_id = null, payload = {}]
])
const [entity1] = await xyapi.assert_entities([
  [entity_external_id, name, within_entity_entry_id = null, payload = {}]
])
const [uom1] = await xyapi.assert_uoms([
  [name, payload = {}]
])
const [status1] = await xyapi.assert_outbound_orderstatuses([
  [name, payload = {}]
])
const [status2] = await xyapi.assert_outbound_orderlinestatuses([
  [name, payload = {}]
])
const [status3] = await xyapi.assert_inbound_orderstatuses([
  [name, payload = {}]
])
const [status4] = await xyapi.assert_inbound_orderlinestatuses([
  [name, payload = {}]
])
const [status5] = await xyapi.assert_pickstatuses([
  [name, payload = {}]
])
const [status6] = await xyapi.assert_picklinestatuses([
  [name, payload = {}]
])
const [status7] = await xyapi.assert_stockstatuses([
  [name, payload = {}]
])
const [type1] = await xyapi.assert_itemrelationshiptypes([
  [name, payload = {}]
])
```
