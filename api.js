export default () =>
  async ({ core_ws_client }) => {
    const xyapi = {
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
            .map(([component_external_id, name]) => ({
              payload: { name, component_external_id }
            }))
        )
        return await get_all()
      },
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
            .map(([schema_external_id, name, applies_to, components]) => ({
              applies_to,
              components,
              payload: { name, schema_external_id }
            }))
        )
        return await get_all()
      },
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
            .map(([location_external_id, name, within_location_entry_id]) => ({
              location_external_id,
              within_location_entry_id,
              payload: { name }
            }))
        )
        return await get_all()
      },
      assert_apps: async app_defs => {
        const get_all = () =>
          core_ws_client.call(
            '/app/apps_get',
            app_defs.map(([app_external_id]) => ({ app_external_id }))
          )
        const apps = await get_all()
        for (const [i, app] of apps.entries()) {
          if (app) continue
          const [app_external_id, name] = app_defs[i]
          await core_ws_client.call('/app/app_assert', {
            defaultConfig: { name, app_external_id }
          })
        }
        return await get_all()
      },
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
            .map(([unit_external_id, name, type, schema_id, outer_id]) => ({
              unit_external_id,
              schema_id,
              outer_id,
              payload: { name, type }
            }))
        )
        return await get_all()
      }
    }
    return { xyapi }
  }
