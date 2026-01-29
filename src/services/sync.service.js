/**
 * Sync Service
 * Handles offline-first synchronization logic for WatermelonDB
 */

const logger = require('../utils/logger');
const Scan = require('../modules/scans/scans.model');
const Farm = require('../modules/farms/farms.model');

class SyncService {
  /**
   * Process batch push from mobile device
   * Handles creates, updates, and deletes in a single transaction
   */
  async processPush(userId, changes) {
    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: []
    };

    try {
      // Process farms
      if (changes.farms) {
        const farmResults = await this.processFarmChanges(userId, changes.farms);
        this.mergeResults(results, farmResults);
      }

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

  /**
   * Process farm changes
   */
  async processFarmChanges(userId, farmChanges) {
    const results = { processed: 0, created: 0, updated: 0, deleted: 0, errors: [] };

    // Process creations
    for (const farm of farmChanges.created || []) {
      try {
        await Farm.create({
          ...farm,
          userId,
          localId: farm.id,
          syncedAt: new Date()
        });
        results.created++;
        results.processed++;
      } catch (error) {
        results.errors.push({ type: 'farm', operation: 'create', id: farm.id, error: error.message });
      }
    }

    // Process updates
    for (const farm of farmChanges.updated || []) {
      try {
        const existing = await Farm.findOne({ localId: farm.id, userId });
        if (existing) {
          // Timestamp-based conflict resolution: server wins if more recent
          if (!existing.updatedAt || new Date(farm.updatedAt) >= existing.updatedAt) {
            await Farm.findByIdAndUpdate(existing._id, {
              ...farm,
              syncedAt: new Date()
            });
            results.updated++;
          }
        }
        results.processed++;
      } catch (error) {
        results.errors.push({ type: 'farm', operation: 'update', id: farm.id, error: error.message });
      }
    }

    // Process deletions (soft delete)
    for (const farm of farmChanges.deleted || []) {
      try {
        await Farm.findOneAndUpdate(
          { localId: farm.id, userId },
          { isDeleted: true, deletedAt: new Date() }
        );
        results.deleted++;
        results.processed++;
      } catch (error) {
        results.errors.push({ type: 'farm', operation: 'delete', id: farm.id, error: error.message });
      }
    }

    return results;
  }

  /**
   * Process scan changes
   */
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

  /**
   * Get changes since last sync (delta pull)
   */
  async getChangesSince(userId, lastPulledAt) {
    const since = lastPulledAt ? new Date(lastPulledAt) : new Date(0);

    const [farms, scans] = await Promise.all([
      Farm.find({
        userId,
        $or: [
          { updatedAt: { $gt: since } },
          { syncedAt: { $gt: since } }
        ]
      }).lean(),
      Scan.find({
        userId,
        $or: [
          { updatedAt: { $gt: since } },
          { syncedAt: { $gt: since } }
        ]
      }).lean()
    ]);

    // Separate active and deleted records
    const changes = {
      farms: {
        created: farms.filter(f => !f.isDeleted && f.createdAt > since),
        updated: farms.filter(f => !f.isDeleted && f.createdAt <= since),
        deleted: farms.filter(f => f.isDeleted).map(f => ({ id: f.localId || f._id }))
      },
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
      farms: farms.length,
      scans: scans.length
    });

    return {
      changes,
      timestamp
    };
  }

  /**
   * Merge result objects
   */
  mergeResults(target, source) {
    target.processed += source.processed;
    target.created += source.created;
    target.updated += source.updated;
    target.deleted += source.deleted;
    target.errors.push(...source.errors);
  }
}

module.exports = new SyncService();
