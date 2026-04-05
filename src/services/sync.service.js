
// Sync Service
// Handles offline-first synchronization logic for WatermelonDB


const logger = require('../utils/logger');
const Scan = require('../modules/scans/scans.model');

class SyncService {
  
  // Process batch push from mobile device
  // Handles creates, updates, and deletes in a single transaction
  
  async processPush(userId, changes) {
    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: []
    };

    try {
      // Process scans
      if (changes.scans) {
        const scanResults = await this.processScanChanges(userId, changes.scans);
        this.mergeResults(results, scanResults);
      }

      logger.info('Sync push completed', {
        userId,
        processed: results.processed,
        created: results.created,
        updated: results.updated,
        deleted: results.deleted,
        errors: results.errors.length
      });

      return results;

    } catch (error) {
      logger.error('Sync push failed:', error);
      throw error;
    }
  }

  
  // Process farm changes
  

  
  // Process scan changes
  
  async processScanChanges(userId, scanChanges) {
    const results = { processed: 0, created: 0, updated: 0, deleted: 0, errors: [] };

    // Process creations
    for (const scan of scanChanges.created || []) {
      try {
        await Scan.create({
          ...scan,
          userId,
          localId: scan.id,
          syncedAt: new Date()
        });
        results.created++;
        results.processed++;
      } catch (error) {
        results.errors.push({ type: 'scan', operation: 'create', id: scan.id, error: error.message });
      }
    }

    // Process updates
    for (const scan of scanChanges.updated || []) {
      try {
        const existing = await Scan.findOne({ localId: scan.id, userId });
        if (existing) {
          if (!existing.updatedAt || new Date(scan.updatedAt) >= existing.updatedAt) {
            await Scan.findByIdAndUpdate(existing._id, {
              ...scan,
              syncedAt: new Date()
            });
            results.updated++;
          }
        }
        results.processed++;
      } catch (error) {
        results.errors.push({ type: 'scan', operation: 'update', id: scan.id, error: error.message });
      }
    }

    // Process deletions (soft delete)
    for (const scan of scanChanges.deleted || []) {
      try {
        await Scan.findOneAndUpdate(
          { localId: scan.id, userId },
          { isDeleted: true, deletedAt: new Date() }
        );
        results.deleted++;
        results.processed++;
      } catch (error) {
        results.errors.push({ type: 'scan', operation: 'delete', id: scan.id, error: error.message });
      }
    }

    return results;
  }

  
  // Get changes since last sync (delta pull)
  
  async getChangesSince(userId, lastPulledAt) {
    const since = lastPulledAt ? new Date(lastPulledAt) : new Date(0);

    const scans = await Scan.find({
      userId,
      $or: [
        { updatedAt: { $gt: since } },
        { syncedAt: { $gt: since } }
      ]
    }).lean();

    // Separate active and deleted records
    const changes = {
      scans: {
        created: scans.filter(s => !s.isDeleted && s.createdAt > since),
        updated: scans.filter(s => !s.isDeleted && s.createdAt <= since),
        deleted: scans.filter(s => s.isDeleted).map(s => ({ id: s.localId || s._id }))
      }
    };

    const timestamp = new Date().toISOString();

    logger.info('Sync pull completed', {
      userId,
      since: lastPulledAt,
      scans: scans.length
    });

    return {
      changes,
      timestamp
    };
  }

  
  // Merge result objects
  
  mergeResults(target, source) {
    target.processed += source.processed;
    target.created += source.created;
    target.updated += source.updated;
    target.deleted += source.deleted;
    target.errors.push(...source.errors);
  }
}

module.exports = new SyncService();
