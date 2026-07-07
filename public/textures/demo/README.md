# Demo material assets (currently unused)

The dev panel's **"Load demo material"** button now ALWAYS uses bold procedural
`<canvas>` textures generated at runtime (high-contrast checker albedo, strong
dome-bump normal map, checker-varied roughness). It does not read files from
this folder.

The previous file-based path was removed because its existence check was
unreliable: Vite's dev-server SPA fallback answers `200 + index.html` for
missing files, so a `HEAD` probe reported textures as present when the folder
was empty and the "loaded" material rendered as nothing.

If a file-based demo path is reintroduced, it must validate the response
`Content-Type` is an image (not just `res.ok`) before handing URLs to the
texture loader.

The real material source later will be the AI generation layer, which feeds
the same `useMaterialStore.setMaterial(...)` entry point the button uses.
