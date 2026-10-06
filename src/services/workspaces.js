/**
 * Business rules for deleting workspaces and accounts.
 * A workspace is deleted with all its dashboards (D1 records and R2 files), members, invitations and audit log.
 */
import { HttpError } from '../lib/errors.js';

export function createWorkspaceService({ db, blobs }) {
  async function remove(workspaceId) {
    await blobs.removeWorkspace(workspaceId);
    await db.deleteWorkspace(workspaceId);
  }

  return {
    remove,

    /** Admin deletes a workspace; they type its name to confirm. */
    async removeByAdmin(workspaceId, confirmName) {
      const name = await db.workspaceName(workspaceId);
      if (!name) throw new HttpError(404, 'Workspace not found.');
      if (String(confirmName || '').trim() !== name) throw new HttpError(400, 'Type the workspace’s name exactly to confirm.');
      await remove(workspaceId);
    },

    /**
     * Before an account is deleted: workspaces where the person is the only member are deleted with it.
     * If they are the only admin of a workspace that has other members, deletion stops, so nobody is left without an admin.
     */
    async prepareAccountDeletion(userId) {
      const owned = await db.adminWorkspaces(userId);
      const blocking = owned.filter((w) => w.admins <= 1 && w.members > 1);
      if (blocking.length) {
        const names = blocking.map((w) => '“' + w.name + '”').join(', ');
        throw new HttpError(409, `You’re the only admin of ${names}. Remove its other members or delete the workspace first.`);
      }
      for (const w of owned.filter((x) => x.members <= 1)) await remove(w.id);
    },
  };
}
