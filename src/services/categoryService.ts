// Worker WageBook - Category Service

import { Category } from '../types';
import { runAsync, getFirstAsync, getAllAsync } from '../database/database';
import { auditService } from './auditService';

export const categoryService = {
  // Create a new category
  async create(name: string): Promise<Category> {
    const result = await runAsync(
      'INSERT INTO categories (name, is_default) VALUES (?, 0)',
      [name.trim()]
    );

    const category = await this.getById(result.lastInsertRowId);
    if (!category) throw new Error('Failed to create category');

    await auditService.log({
      action: 'category_created',
      entity_type: 'category',
      entity_id: category.id,
      new_value: JSON.stringify(category),
    });

    return category;
  },

  // Update a category name
  async rename(id: number, newName: string): Promise<Category> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Category not found');

    await runAsync('UPDATE categories SET name = ? WHERE id = ?', [
      newName.trim(),
      id,
    ]);

    const updated = await this.getById(id);
    if (!updated) throw new Error('Failed to rename category');

    await auditService.log({
      action: 'category_renamed',
      entity_type: 'category',
      entity_id: id,
      old_value: JSON.stringify({ name: existing.name }),
      new_value: JSON.stringify({ name: newName.trim() }),
    });

    return updated;
  },

  // Deactivate a category (only if no workers are assigned)
  async deactivate(id: number): Promise<boolean> {
    const workerCount = await getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM workers WHERE category_id = ? AND is_active = 1',
      [id]
    );

    if ((workerCount?.count ?? 0) > 0) {
      return false; // Cannot delete - workers are assigned
    }

    await runAsync('UPDATE categories SET is_active = 0 WHERE id = ?', [id]);
    return true;
  },

  // Get category by ID
  async getById(id: number): Promise<Category | null> {
    return getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', [
      id,
    ]);
  },

  // Get all active categories
  async getAll(): Promise<Category[]> {
    return getAllAsync<Category>(
      'SELECT * FROM categories WHERE is_active = 1 ORDER BY is_default DESC, name ASC'
    );
  },

  // Get category with worker count
  async getAllWithWorkerCount(): Promise<
    (Category & { worker_count: number })[]
  > {
    return getAllAsync<Category & { worker_count: number }>(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM workers w WHERE w.category_id = c.id AND w.is_active = 1) as worker_count
       FROM categories c 
       WHERE c.is_active = 1 
       ORDER BY c.is_default DESC, c.name ASC`
    );
  },

  // Check if category name already exists
  async nameExists(name: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT COUNT(*) as count FROM categories WHERE name = ?';
    const params: any[] = [name.trim()];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await getFirstAsync<{ count: number }>(sql, params);
    return (result?.count ?? 0) > 0;
  },
};
