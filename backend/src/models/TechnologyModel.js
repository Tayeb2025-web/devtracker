import mongoose from 'mongoose';
import { DEFAULT_USER_ID } from '../config/constants.js';

const TechnologySchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, default: '#3B82F6' },
  icon: { type: String, default: 'code' },
  custom_icon: { type: String, default: null },
  category_id: { type: String, default: null, index: true },
  total_hours: { type: Number, default: 0 },
  legacy_id: { type: Number, index: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret.__v; return ret; } },
  toObject: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret.__v; return ret; } },
});

TechnologySchema.virtual('id').get(function () {
  return this._id.toString();
});

export const Technology = mongoose.models.Technology || mongoose.model('Technology', TechnologySchema);

export const TechnologyModel = {
  async findAll(userId = DEFAULT_USER_ID) {
    const list = await Technology.find({
      $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
    }).sort({ name: 1 }).lean();
    return list.map(item => ({ ...item, id: item._id.toString() }));
  },

  async findById(id, userId = DEFAULT_USER_ID) {
    if (!id) return null;
    let tech;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      tech = await Technology.findOne({
        _id: id,
        $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
      }).lean();
    }
    if (!tech) {
      tech = await Technology.findOne({
        legacy_id: Number(id) || -1,
        $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }]
      }).lean();
    }
    if (tech) tech.id = tech._id.toString();
    return tech;
  },

  async create(data, userId = DEFAULT_USER_ID) {
    const { name, color = '#3B82F6', icon = 'code', custom_icon = null, category_id = null } = data;
    const created = await Technology.create({
      user_id: String(userId),
      name,
      color,
      icon,
      custom_icon,
      category_id: category_id ? String(category_id) : null,
    });
    return this.findById(created._id, userId);
  },

  async update(id, data, userId = DEFAULT_USER_ID) {
    const allowedFields = ['name', 'color', 'icon', 'custom_icon', 'category_id'];
    const updateData = {};
    allowedFields.forEach(key => {
      if (data[key] !== undefined) updateData[key] = data[key];
    });

    let updated;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      updated = await Technology.findOneAndUpdate(
        { _id: id, $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }] },
        updateData,
        { new: true }
      ).lean();
    }
    if (!updated) {
      updated = await Technology.findOneAndUpdate(
        { legacy_id: Number(id) || -1, $or: [{ user_id: String(userId) }, { user_id: String(Number(userId) || -1) }] },
        updateData,
        { new: true }
      ).lean();
    }
    if (updated) updated.id = updated._id.toString();
    return updated;
  },

  async delete(id, userId = DEFAULT_USER_ID) {
    const tech = await this.findById(id, userId);
    if (!tech) return false;
    const result = await Technology.deleteOne({ _id: tech._id });
    return result.deletedCount > 0;
  },

  async updateTotalHours(id, hours, userId = DEFAULT_USER_ID) {
    const tech = await this.findById(id, userId);
    if (!tech) return;
    await Technology.updateOne(
      { _id: tech._id },
      { $inc: { total_hours: Number(hours) || 0 } }
    );
  },

  async recalculateHours(userId = DEFAULT_USER_ID) {
    const { StudySession } = await import('./SessionModel.js');
    const techs = await this.findAll(userId);
    for (const tech of techs) {
      const agg = await StudySession.aggregate([
        {
          $match: {
            $or: [
              { technology_id: tech.id },
              { technology_id: String(tech.legacy_id || -1) }
            ],
            user_id: String(userId)
          }
        },
        { $group: { _id: null, total: { $sum: '$duration_hours' } } }
      ]);
      const total = agg[0]?.total || 0;
      await Technology.updateOne({ _id: tech._id }, { total_hours: parseFloat(total.toFixed(4)) });
    }
  },
};
