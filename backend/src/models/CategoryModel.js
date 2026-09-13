import mongoose from 'mongoose';
import { DEFAULT_USER_ID } from '../config/constants.js';

const CategorySchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, default: '#3B82F6' },
  sort_order: { type: Number, default: 0 },
  legacy_id: { type: Number, index: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret.__v; return ret; } },
  toObject: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret.__v; return ret; } },
});

CategorySchema.virtual('id').get(function () {
  return this._id.toString();
});

export const TechnologyCategory = mongoose.models.TechnologyCategory || mongoose.model('TechnologyCategory', CategorySchema);

export const CategoryModel = {
  async findAll(userId = DEFAULT_USER_ID) {
    const { TechnologyModel } = await import('./TechnologyModel.js');
    await TechnologyModel.ensureDefaults(userId);
    const list = await TechnologyCategory.find({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).sort({ sort_order: 1, created_at: 1 }).lean();
    return list.map(item => ({ ...item, id: item._id.toString() }));
  },

  async findById(id, userId = DEFAULT_USER_ID) {
    if (!id) return null;
    let category;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      category = await TechnologyCategory.findOne({
        _id: id,
        $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
      }).lean();
    }
    if (!category) {
      category = await TechnologyCategory.findOne({
        legacy_id: Number(id) || -1,
        $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
      }).lean();
    }
    if (category) category.id = category._id.toString();
    return category;
  },

  async create({ name, color = '#3B82F6' }, userId = DEFAULT_USER_ID) {
    const last = await TechnologyCategory.findOne({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).sort({ sort_order: -1 }).lean();
    const nextOrder = (last?.sort_order ?? -1) + 1;

    const created = await TechnologyCategory.create({
      user_id: String(userId),
      name,
      color,
      sort_order: nextOrder,
    });
    return this.findById(created._id, userId);
  },

  async update(id, { name, color }, userId = DEFAULT_USER_ID) {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;

    let updated;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      updated = await TechnologyCategory.findOneAndUpdate(
        { _id: id, $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }] },
        updateData,
        { new: true }
      ).lean();
    }
    if (!updated) {
      updated = await TechnologyCategory.findOneAndUpdate(
        { legacy_id: Number(id) || -1, $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }] },
        updateData,
        { new: true }
      ).lean();
    }
    if (updated) updated.id = updated._id.toString();
    return updated;
  },

  async delete(id, userId = DEFAULT_USER_ID) {
    const category = await this.findById(id, userId);
    if (!category) return false;

    // Unset category in technologies
    const { Technology } = await import('./TechnologyModel.js');
    await Technology.updateMany(
      { category_id: category.id, $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }] },
      { category_id: null }
    );

    const result = await TechnologyCategory.deleteOne({ _id: category._id });
    return result.deletedCount > 0;
  },

  async move(id, direction, userId = DEFAULT_USER_ID) {
    const categories = await TechnologyCategory.find({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).sort({ sort_order: 1, created_at: 1 });

    const index = categories.findIndex(c => c._id.toString() === String(id) || c.legacy_id === Number(id));
    if (index < 0) return null;

    const targetIndex = index + (direction === 'up' ? -1 : 1);
    if (targetIndex >= 0 && targetIndex < categories.length) {
      const tempOrder = categories[index].sort_order;
      categories[index].sort_order = categories[targetIndex].sort_order;
      categories[targetIndex].sort_order = tempOrder;

      await categories[index].save();
      await categories[targetIndex].save();
    }

    return this.findById(id, userId);
  },
};
