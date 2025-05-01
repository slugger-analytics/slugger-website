import { Router } from "express";
import { validationMiddleware } from "../middleware/validation-middleware";
import { createCategorySchema, updateCategorySchema } from "../validators/schemas";
import pool from "../db.js";

const router = Router();

// GET - Fetch all widget categories
router.get('/', async (req, res) => {
  try {
    const categories = await pool.query(
      'SELECT * FROM categories'
    );
    
    return res.json({
      success: true,
      message: 'Categories retrieved successfully',
      data: categories.rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories',
    });
  }
});

// POST - Create a new widget category
router.post('/', validationMiddleware({ bodySchema: createCategorySchema }), async (req, res) => {
  const { name, hexCode } = req.body;

  const params = [name];
  if (hexCode) {
    params.push(hexCode);
  }

  try {
    const result = await pool.query(
      `INSERT INTO categories (name${hexCode ? ', hex_code' : ''}) VALUES ($1${hexCode ? ', $2' : ''}) RETURNING *`,
      params
    );
    
    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create category'
    });
  }
});

// PATCH - Update a widget category
router.patch('/:id', validationMiddleware({ bodySchema: updateCategorySchema }), async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, hexCode } = req.body;
  
  if (!name && !hexCode) {
    return res.status(400).json({
      success: false,
      message: 'At least one field (name or hexCode) is required for update'
    });
  }

  try {
    const updateFields = [];
    const values = [];
    let valueCount = 1;

    if (name) {
      updateFields.push(`name = $${valueCount}`);
      values.push(name);
      valueCount++;
    }
    if (hexCode) {
      updateFields.push(`hex_code = $${valueCount}`);
      values.push(hexCode);
      valueCount++;
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE categories SET ${updateFields.join(', ')} WHERE id = $${valueCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    return res.json({
      success: true,
      message: 'Category updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update category'
    });
  }
});

// DELETE - Delete a widget category
router.delete('/:id', async (req, res) => {
  const { id } = parseInt(req.params);

  try {
    // First delete related entries in the join table
    // await pool.query(
    //   'DELETE FROM widget_categories WHERE category_id = $1',
    //   [id]
    // );

    // Then delete the category
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    return res.json({
      success: true,
      message: 'Category deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
});

export default router;