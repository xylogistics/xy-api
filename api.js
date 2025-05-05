export default () =>
  async ({ core_ws_client }) => {
    const xyapi = {
      // [app_external_id, name, config = {}, payload = {}]
      assert_apps: async app_defs => {
        const get_all = () =>
          core_ws_client.call(
            '/app/apps_get',
            app_defs.map(([app_external_id]) => ({ app_external_id }))
          )
        const apps = await get_all()
        for (const [i, app] of apps.entries()) {
          if (app) continue
          const [app_external_id, name, config = {}, payload = {}] = app_defs[i]
          await core_ws_client.call('/app/app_assert', {
            defaultConfig: { name, app_external_id, ...config },
            defaultPayload: payload
          })
        }
        return await get_all()
      },
      // [agent_external_id, name, app_id, config = {}, payload = {}]
      assert_agents: async agent_defs => {
        const get_all = () =>
          core_ws_client.call(
            '/app/agents_get',
            agent_defs.map(([agent_external_id]) => ({
              agent_external_id
            }))
          )
        const agents = await get_all()
        await core_ws_client.call(
          '/app/agents_assert',
          agents
            .map((a, i) => (a ? null : agent_defs[i]))
            .filter(a => a)
            .map(
              ([
                agent_external_id,
                name,
                app_id,
                config = {},
                payload = {}
              ]) => ({
                app_id,
                defaultConfig: { name, agent_external_id, ...config },
                defaultPayload: payload
              })
            )
        )
        return await get_all()
      },
      // [component_external_id, name, payload = {}]
      assert_components: async component_defs => {
        const get_all = () =>
          core_ws_client.call(
            '/schema/components_get',
            component_defs.map(([component_external_id]) => ({
              component_external_id
            }))
          )
        const components = await get_all()
        await core_ws_client.call(
          '/schema/components_assert',
          components
            .map((c, i) => (c ? null : component_defs[i]))
            .filter(c => c)
            .map(([component_external_id, name, payload = {}]) => ({
              payload: { name, component_external_id, ...payload }
            }))
        )
        return await get_all()
      },
      // [schema_external_id, name, applies_to, components, payload = {}]
      assert_schemas: async schema_defs => {
        const get_all = () =>
          core_ws_client.call(
            '/schema/schemas_get',
            schema_defs.map(([schema_external_id]) => ({
              schema_external_id
            }))
          )
        const schemas = await get_all()
        await core_ws_client.call(
          '/schema/schemas_assert',
          schemas
            .map((c, i) => (c ? null : schema_defs[i]))
            .filter(c => c)
            .map(
              ([
                schema_external_id,
                name,
                applies_to,
                components,
                payload = {}
              ]) => ({
                applies_to,
                components,
                payload: { name, schema_external_id, ...payload }
              })
            )
        )
        return await get_all()
      },
      // [unit_external_id, name, type, schema_id, outer_id = null, payload = {}]
      assert_units: async unit_defs => {
        const get_all = () =>
          core_ws_client.call(
            '/unit/units_get',
            unit_defs.map(([unit_external_id]) => ({
              unit_external_id
            }))
          )
        const units = await get_all()
        await core_ws_client.call(
          '/unit/units_assert',
          units
            .map((u, i) => (u ? null : unit_defs[i]))
            .filter(u => u)
            .map(
              ([
                unit_external_id,
                name,
                type,
                schema_id,
                outer_id = null,
                payload = {}
              ]) => ({
                unit_external_id,
                schema_id,
                outer_id,
                payload: { name, type, ...payload }
              })
            )
        )
        return await get_all()
      },
      // [location_external_id, name, within_location_entry_id = null, payload = {}]
      assert_locations: async location_defs => {
        const get_all = () =>
          core_ws_client.call(
            '/location/locations_get',
            location_defs.map(([location_external_id]) => ({
              location_external_id
            }))
          )
        const locations = await get_all()
        await core_ws_client.call(
          '/location/locations_assert',
          locations
            .map((l, i) => (l ? null : location_defs[i]))
            .filter(l => l)
            .map(
              ([
                location_external_id,
                name,
                within_location_entry_id = null,
                payload = {}
              ]) => ({
                location_external_id,
                within_location_entry_id,
                payload: { name, ...payload }
              })
            )
        )
        return await get_all()
      },
      // [entity_external_id, name, within_entity_entry_id = null, payload = {}]
      assert_entities: async entity_defs => {
        const get_all = () =>
          core_ws_client.call(
            '/entity/entities_get',
            entity_defs.map(([entity_external_id]) => ({
              entity_external_id
            }))
          )
        const entities = await get_all()
        await core_ws_client.call(
          '/entity/entities_assert',
          entities
            .map((e, i) => (e ? null : entity_defs[i]))
            .filter(e => e)
            .map(
              ([
                entity_external_id,
                name,
                within_entity_entry_id = null,
                payload = {}
              ]) => ({
                entity_external_id,
                within_entity_entry_id,
                payload: { name, ...payload }
              })
            )
        )
        return await get_all()
      },
      // [name, payload = {}]
      assert_uoms: async uom_defs => {
        const get_all = () => core_ws_client.call('/item/uoms_query')
        const uoms1 = await get_all()
        await core_ws_client.call(
          '/item/uoms_assert',
          uom_defs
            .filter(([name]) => uoms1.find(u => u.name === name) == null)
            .map(([name, payload = {}]) => ({ name, payload }))
        )
        const uoms2 = await get_all()
        return uom_defs.map(([name]) => uoms2.find(u => u.name === name))
      },
      // [name, payload = {}]
      assert_outbound_orderstatuses: async status_defs => {
        const get_all = () =>
          core_ws_client.call('/outbound_orderstatus/outbound_orderstatus_qry')
        const statuses1 = await get_all()
        await core_ws_client.call(
          '/outbound_orderstatus/outbound_orderstatus_assert',
          status_defs
            .filter(([name]) => statuses1.find(s => s.name === name) == null)
            .map(([name, payload = {}]) => ({ name, payload }))
        )
        const statuses2 = await get_all()
        return status_defs.map(([name]) => statuses2.find(s => s.name === name))
      },
      // [name, payload = {}]
      assert_outbound_orderlinestatuses: async status_defs => {
        const get_all = () =>
          core_ws_client.call(
            '/outbound_orderlinestatus/outbound_orderlinestatus_qry'
          )
        const statuses1 = await get_all()
        await core_ws_client.call(
          '/outbound_orderlinestatus/outbound_orderlinestatus_assert',
          status_defs
            .filter(([name]) => statuses1.find(s => s.name === name) == null)
            .map(([name, payload = {}]) => ({ name, payload }))
        )
        const statuses2 = await get_all()
        return status_defs.map(([name]) => statuses2.find(s => s.name === name))
      },
      // [name, payload = {}]
      assert_inbound_orderstatuses: async status_defs => {
        const get_all = () =>
          core_ws_client.call('/inbound_orderstatus/inbound_orderstatus_qry')
        const statuses1 = await get_all()
        await core_ws_client.call(
          '/inbound_orderstatus/inbound_orderstatus_assert',
          status_defs
            .filter(([name]) => statuses1.find(s => s.name === name) == null)
            .map(([name, payload = {}]) => ({ name, payload }))
        )
        const statuses2 = await get_all()
        return status_defs.map(([name]) => statuses2.find(s => s.name === name))
      },
      // [name, payload = {}]
      assert_inbound_orderlinestatuses: async status_defs => {
        const get_all = () =>
          core_ws_client.call(
            '/inbound_orderlinestatus/inbound_orderlinestatus_qry'
          )
        const statuses1 = await get_all()
        await core_ws_client.call(
          '/inbound_orderlinestatus/inbound_orderlinestatus_assert',
          status_defs
            .filter(([name]) => statuses1.find(s => s.name === name) == null)
            .map(([name, payload = {}]) => ({ name, payload }))
        )
        const statuses2 = await get_all()
        return status_defs.map(([name]) => statuses2.find(s => s.name === name))
      },
      // [name, payload = {}]
      assert_pickstatuses: async status_defs => {
        const get_all = () => core_ws_client.call('/pickstatus/pickstatus_qry')
        const statuses1 = await get_all()
        await core_ws_client.call(
          '/pickstatus/pickstatus_assert',
          status_defs
            .filter(([name]) => statuses1.find(s => s.name === name) == null)
            .map(([name, payload = {}]) => ({ name, payload }))
        )
        const statuses2 = await get_all()
        return status_defs.map(([name]) => statuses2.find(s => s.name === name))
      },
      // [name, payload = {}]
      assert_picklinestatuses: async status_defs => {
        const get_all = () =>
          core_ws_client.call('/picklinestatus/picklinestatus_qry')
        const statuses1 = await get_all()
        await core_ws_client.call(
          '/picklinestatus/picklinestatus_assert',
          status_defs
            .filter(([name]) => statuses1.find(s => s.name === name) == null)
            .map(([name, payload = {}]) => ({ name, payload }))
        )
        const statuses2 = await get_all()
        return status_defs.map(([name]) => statuses2.find(s => s.name === name))
      },
      // [name, payload = {}]
      assert_stockstatuses: async status_defs => {
        const get_all = () => core_ws_client.call('/stock/stockstatus_qry')
        const statuses1 = await get_all()
        await core_ws_client.call(
          '/stock/stockstatus_assert',
          status_defs
            .filter(([name]) => statuses1.find(s => s.name === name) == null)
            .map(([name, payload = {}]) => ({ name, payload }))
        )
        const statuses2 = await get_all()
        return status_defs.map(([name]) => statuses2.find(s => s.name === name))
      },
      // [name, payload = {}]
      assert_itemrelationshiptypes: async type_defs => {
        const get_all = () =>
          core_ws_client.call(
            '/item/relationshiptypes_query',
            type_defs.map(([name]) => ({ name }))
          )
        const types1 = await get_all()
        await core_ws_client.call(
          '/item/relationshiptypes_assert',
          type_defs
            .filter(([name]) => types1.find(t => t.name === name) == null)
            .map(([name, payload = {}]) => ({ name, payload }))
        )
        const types2 = await get_all()
        return type_defs.map(([name]) => types2.find(t => t.name === name))
      }
      // TODO: add assert workers
    }
    return { xyapi }
  }
