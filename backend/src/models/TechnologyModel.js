import mongoose from 'mongoose';
import { DEFAULT_USER_ID } from '../config/constants.js';
import { getTargetUserIds } from '../utils/userHelper.js';

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

export const DEFAULT_TECH_FOLDERS = [
  {
    name: 'Frontend',
    color: '#6366F1',
    sort_order: 0,
    technologies: [
      { name: 'HTML', color: '#E34F26', icon: 'html' },
      { name: 'CSS', color: '#1572B6', icon: 'css' },
      { name: 'JS', color: '#F7DF1E', icon: 'javascript' },
      { name: 'REACT', color: '#61DAFB', icon: 'react' },
      { name: 'NEXT JS', color: '#818CF8', icon: 'nextjs' },
      { name: 'TAILWIND', color: '#06B6D4', icon: 'tailwind' },
    ],
  },
  {
    name: 'Backend',
    color: '#10B981',
    sort_order: 1,
    technologies: [
      { name: 'NODE JS', color: '#339933', icon: 'nodejs' },
      { name: 'LARAVEL', color: '#FF2D20', icon: 'laravel' },
      { name: 'DOCKER', color: '#2496ED', icon: 'docker' },
    ],
  },
];

export const TechnologyModel = {
  async ensureDefaults(userId = DEFAULT_USER_ID) {
    if (!userId) return;
    const { TechnologyCategory } = await import('./CategoryModel.js');

    const userIds = await getTargetUserIds(userId);
    const userFilter = {
      user_id: { $in: userIds }
    };

    const [techCount, catCount] = await Promise.all([
      Technology.countDocuments(userFilter),
      TechnologyCategory.countDocuments(userFilter),
    ]);

    if (techCount > 0 || catCount > 0) {
      return;
    }

    for (const folderDef of DEFAULT_TECH_FOLDERS) {
      try {
        let category = await TechnologyCategory.findOne({
          name: folderDef.name,
          ...userFilter,
        });

        if (!category) {
          category = await TechnologyCategory.create({
            user_id: String(userId),
            name: folderDef.name,
            color: folderDef.color,
            sort_order: folderDef.sort_order,
          });
        }

        const categoryId = category._id.toString();

        for (const techDef of folderDef.technologies) {
          const existingTech = await Technology.findOne({
            name: techDef.name,
            ...userFilter,
          });

          if (!existingTech) {
            await Technology.create({
              user_id: String(userId),
              name: techDef.name,
              color: techDef.color,
              icon: techDef.icon,
              category_id: categoryId,
              total_hours: 0,
            });
          }
        }
      } catch (err) {
        console.error('Failed to seed default technology folder:', err);
      }
    }
  },

  async findAll(userId = DEFAULT_USER_ID) {
    await this.ensureDefaults(userId);
    const userIds = await getTargetUserIds(userId);
    const list = await Technology.find({
      user_id: { $in: userIds }
    }).sort({ name: 1 }).lean();
    return list.map(item => ({ ...item, id: item._id.toString() }));
  },

  async findById(id, userId = DEFAULT_USER_ID) {
    if (!id) return null;
    const userIds = await getTargetUserIds(userId);
    let tech;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      tech = await Technology.findOne({
        _id: id,
        user_id: { $in: userIds }
      }).lean();
    }
    if (!tech) {
      tech = await Technology.findOne({
        legacy_id: Number(id) || -1,
        user_id: { $in: userIds }
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

    const userIds = await getTargetUserIds(userId);
    let updated;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      updated = await Technology.findOneAndUpdate(
        { _id: id, user_id: { $in: userIds } },
        updateData,
        { new: true }
      ).lean();
    }
    if (!updated) {
      updated = await Technology.findOneAndUpdate(
        { legacy_id: Number(id) || -1, user_id: { $in: userIds } },
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
    const userIds = await getTargetUserIds(userId);
    const techs = await this.findAll(userId);
    for (const tech of techs) {
      const agg = await StudySession.aggregate([
        {
          $match: {
            $or: [
              { technology_id: tech.id },
              { technology_id: String(tech.legacy_id || -1) }
            ],
            user_id: { $in: userIds }
          }
        },
        { $group: { _id: null, total: { $sum: '$duration_hours' } } }
      ]);
      const total = agg[0]?.total || 0;
      await Technology.updateOne({ _id: tech._id }, { total_hours: parseFloat(total.toFixed(4)) });
    }
  },
};
