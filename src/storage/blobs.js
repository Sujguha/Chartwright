/**
 * File-storage layer for R2. Dashboard contents (data, charts, settings) are stored here,
 * because they can be larger than a database row allows. Keys always start with the workspace ID.
 */
export function createBlobs(BUCKET) {
  const key = (workspaceId, dashboardId, version) => `workspaces/${workspaceId}/dashboards/${dashboardId}/v${version}.json`;
  return {
    key,
    async put(k, text) {
      await BUCKET.put(k, text, { httpMetadata: { contentType: 'application/json' } });
    },
    async getText(k) {
      const obj = await BUCKET.get(k);
      return obj ? obj.text() : null;
    },
    async remove(k) {
      if (k) await BUCKET.delete(k);
    },
  };
}
